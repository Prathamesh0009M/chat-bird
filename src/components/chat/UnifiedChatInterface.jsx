import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { fetchAllUsers } from '../../services/api.js';
import { startConversation, getConnectedUsers } from '../../services/conv.js';
import './UnifiedChat.css';
import Setting from '../setting/Setting.jsx';
import FileManager from '../FileManager/FileManager.jsx';
const UnifiedChatInterface = () => {
    // User data
    const userData = JSON.parse(localStorage.getItem('user'));
    const userId = userData?._id;
    const userLanguage = userData?.preferredLanguage || 'en';
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    // Navigation state
    const [activeNavTab, setActiveNavTab] = useState('chats'); // 'profile', 'chats', 'calls', 'users', 'settings'

    // Sidebar state
    const [allUsers, setAllUsers] = useState([]);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Chat state
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [recipientInfo, setRecipientInfo] = useState(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [updatingLanguage, setUpdatingLanguage] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);


    // Fetch users on mount
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const response = await fetchAllUsers(token);
                setAllUsers(response.data.users);
            } catch (e) {
                console.error('Error fetching all users:', e);
            }
        };

        const fetchConnectedUsers = async () => {
            try {
                const response = await getConnectedUsers(userData._id, token);
                setConnectedUsers(response || []);
            } catch (e) {
                console.error('Error fetching connected users:', e);
            }
        };

        fetchConnectedUsers();
        fetchAll();
    }, []);

    // Initialize Socket Connection
    useEffect(() => {
        const newSocket = io(import.meta.env.VITE_SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('✅ Socket connected:', newSocket.id);
            setIsConnected(true);
            newSocket.emit('register', { userId });
        });

        newSocket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('userTyping', ({ userId: typingUserId, isTyping: typing }) => {
            if (typingUserId !== userId) {
                setIsTyping(typing);
                if (typing) {
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
                }
            }
        });

        newSocket.on('receiveMessage', (messageData) => {
            setIsTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

            setMessages(prev => {
                const exists = prev.some(m => m.messageId === messageData.messageId);
                if (exists) return prev;
                return [...prev, {
                    messageId: messageData.messageId,
                    text: messageData.text,
                    sender: messageData.sender,
                    senderName: messageData.senderName,
                    lang: messageData.lang,
                    createdAt: messageData.createdAt,
                    isMine: messageData.sender === userId,
                    messageType: messageData.messageType || 'text'
                }];
            });
        });

        newSocket.on('receiveMediaMessage', (messageData) => {
            setMessages(prev => {
                const exists = prev.some(m => m.messageId === messageData.messageId);
                if (exists) return prev;
                return [...prev, {
                    messageId: messageData.messageId,
                    text: messageData.text,
                    sender: messageData.sender,
                    senderName: messageData.senderName,
                    createdAt: messageData.createdAt,
                    isMine: messageData.sender === userId,
                    messageType: messageData.messageType,
                    media: messageData.media
                }];
            });
        });


        newSocket.on('chatHistory', (data) => {
            setMessages(data.messages);
        });

        newSocket.on('messageDeleted', ({ messageId, conversationId: convId }) => {
            if (convId === selectedConversation) {
                setMessages(prev => prev.filter(m => m.messageId !== messageId));
            }
        });

        setSocket(newSocket);

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            newSocket.disconnect();
        };
    }, [userId]);

    // Load chat when conversation is selected
    useEffect(() => {
        if (selectedConversation && socket && isConnected) {
            socket.emit('loadChatHistory', { conversationId: selectedConversation, userId });
            socket.emit('joinConversation', { conversationId: selectedConversation });

            const fetchConversationDetails = async () => {
                try {
                    const response = await fetch(
                        `${import.meta.env.VITE_API_URL}/chats/conversation/${selectedConversation}`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );
                    const data = await response.json();
                    const recipient = data.participants?.find(p => p._id !== userId);
                    setRecipientInfo(recipient);
                } catch (error) {
                    console.error('Error fetching conversation details:', error);
                }
            };

            fetchConversationDetails();
        }
    }, [selectedConversation, socket, isConnected]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSelectConversation = (conversationId) => {
        if (selectedConversation === conversationId) return;
        setSelectedConversation(conversationId);
        setMessages([]);
    };

    const connectUser = async (userBId) => {
        try {
            const conversation = await startConversation(userBId);
            if (conversation) {
                alert("Connection request sent!");
                const response = await getConnectedUsers(userData._id, token);
                setConnectedUsers(response || []);
            } else {
                alert("Failed to send connection request.");
            }
        } catch (error) {
            console.error("Error connecting to user:", error);
            alert("An error occurred while trying to connect.");
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputMessage(value);

        if (socket && isConnected && selectedConversation) {
            if (value.length > 0) {
                socket.emit('typing', { conversationId: selectedConversation, userId, isTyping: true });
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    socket.emit('typing', { conversationId: selectedConversation, userId, isTyping: false });
                }, 2000);
            } else {
                socket.emit('typing', { conversationId: selectedConversation, userId, isTyping: false });
            }
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !socket || !isConnected || !selectedConversation) return;

        socket.emit('typing', { conversationId: selectedConversation, userId, isTyping: false });

        const messageData = {
            conversationId: selectedConversation,
            senderId: userId,
            text: inputMessage.trim(),
            language: selectedLanguage,
            recipients: recipientInfo?._id ? [recipientInfo._id] : []
        };

        socket.emit('sendMessage', messageData);
        setInputMessage('');
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            alert('Please select an image or video file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        try {
            setUploadingMedia(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('conversationId', selectedConversation);
            formData.append('messageType', isVideo ? 'video' : 'image');

            const response = await fetch(`${import.meta.env.VITE_API_URL}/conv-media/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await response.json();
            if (!result.success) {
                alert(result.message || 'Failed to upload media');
            }
        } catch (error) {
            console.error('Error uploading media:', error);
            alert('Failed to upload media');
        } finally {
            setUploadingMedia(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    const handleLanguageChange = async (e) => {
        const newLanguage = e.target.value;
        setSelectedLanguage(newLanguage);
        setUpdatingLanguage(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/chats/update-lang`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    preferredLanguage: newLanguage,
                    conversationId: selectedConversation
                })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                const updatedUserData = { ...userData, preferredLanguage: newLanguage };
                localStorage.setItem('user', JSON.stringify(updatedUserData));
                if (socket && isConnected) {
                    socket.emit("reloadChatHistory", { conversationId: selectedConversation, userId });
                }
            } else {
                alert(result.message || 'Failed to update language preference');
                setSelectedLanguage(userLanguage);
            }
        } catch (error) {
            console.error('Error updating language:', error);
            alert('Failed to update language preference');
            setSelectedLanguage(userLanguage);
        } finally {
            setUpdatingLanguage(false);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = (msg) => {
        const isMediaMessage = msg.messageType === 'image' || msg.messageType === 'video';

        return (
            <div key={msg.messageId} className={`message ${msg.isMine ? 'message-mine' : 'message-theirs'}`}>
                <div className="message-content">
                    {!msg.isMine && <div className="message-sender">{msg.senderName}</div>}
                    <div className="message-bubble">
                        {isMediaMessage && msg.media && (
                            <div className="message-media">
                                {msg.messageType === 'image' && (
                                    <img src={msg.media.url} alt="Shared" className="media-image" />
                                )}
                                {msg.messageType === 'video' && (
                                    <video src={msg.media.url} controls className="media-video" />
                                )}
                            </div>
                        )}
                        {msg.text && <p className="message-text">{msg.text}</p>}
                        <div className="message-meta">
                            <span className="message-time">{formatTime(msg.createdAt)}</span>
                            {msg.lang && <span className="message-lang">{msg.lang}</span>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    const filteredConversations = connectedUsers.filter(conv =>
        conv.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    console.log(filteredConversations)

    const filteredAllUsers = allUsers.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderMainContent = () => {
        if (activeNavTab === 'profile') {
            return (
                <div className="profile-view">
                    <div className="profile-card-large">
                        <div className="profile-avatar-xl">
                            {userData?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <h2>{userData?.name || 'User'}</h2>
                        <p className="profile-email-large">{userData?.email}</p>
                        <div className="profile-language">
                            <span className="lang-badge-large">🌐 {userData?.preferredLanguage?.toUpperCase() || 'EN'}</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (activeNavTab === 'calls') {
            return (
                <div className="calls-view">
                    <div className="empty-state-large">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                        </svg>
                        <h3>No Calls Yet</h3>
                        <p>Start a voice or video call with your contacts</p>
                    </div>
                </div>
            );
        }

        if (activeNavTab === 'settings') {
            return (
                <>
                    <Setting />
                </>
            );
        }
        if (activeNavTab === 'FileManager') {
            return (
                <>
                    <FileManager />
                </>
            )
        }

        // Default: chats or users view
        return (
            <>
                <div className="sidebar">
                    <div className="sidebar-header">
                        <h2>Chats</h2>
                        <button className="new-chat-btn" title="New conversation">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                            </svg>
                        </button>
                    </div>

                    <div className="search-container">
                        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="tabs">
                        <button
                            className={`tab ${activeNavTab === 'chats' ? 'active' : ''}`}
                            onClick={() => setActiveNavTab('chats')}
                        >
                            All
                        </button>
                        <button
                            className={`tab ${activeNavTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveNavTab('users')}
                        >
                            {/* BUGS  Unread message instead File system */}
                            USERS
                        </button>
                    </div>

                    <div className="conversations-list">
                        {activeNavTab === 'chats' ? (
                            filteredConversations.length === 0 ? (
                                <div className="empty-state">No conversations yet</div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <div
                                        key={conv.conversationId}
                                        className={`conversation-item ${selectedConversation === conv.conversationId ? 'active' : ''}`}
                                        onClick={() => handleSelectConversation(conv.conversationId)}
                                    >
                                        {/* image  */}
                                        <div className="conv-avatar">
                                            {conv.user?.name?.charAt(0).toUpperCase() || 'U'}
                                            <span className="online-indicator"></span>
                                        </div>
                                        {/* BUGS  */}
                                        <div className="conv-info">
                                            <div className="conv-top">
                                                <h4>{conv.user?.name}</h4>
                                                <span className="conv-time">{conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                            </div>
                                            <p className="conv-preview">{conv.lastMessage || "No messages yet"}</p>
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            filteredAllUsers.length === 0 ? (
                                <div className="empty-state">No users found</div>
                            ) : (
                                filteredAllUsers.map((user) => (
                                    <div key={user._id} className="user-item">
                                        <div className="conv-avatar">
                                            {user.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="conv-info">
                                            <h4>{user.name}</h4>
                                            <p className="conv-email">{user.email}</p>
                                        </div>
                                        <button className="connect-btn" onClick={() => connectUser(user._id)}>
                                            Connect
                                        </button>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>

                <div className="chat-panel">
                    {!selectedConversation ? (
                        <div className="no-chat-selected">
                            <h3>Select a conversation to start chatting</h3>
                        </div>
                    ) : (
                        <>
                            <div className="chat-header">
                                <div className="chat-recipient-info">
                                    <div className="recipient-avatar">
                                        {recipientInfo?.name?.charAt(0).toUpperCase() || 'U'}
                                        <span className="online-indicator"></span>
                                    </div>
                                    <div>
                                        <h3>{recipientInfo?.name || 'Chat'}</h3>
                                        <span className="status online">Online</span>
                                    </div>
                                </div>
                                <div className="chat-actions">
                                    <select
                                        value={selectedLanguage}
                                        onChange={handleLanguageChange}
                                        disabled={updatingLanguage}
                                        className="language-select"
                                    >
                                        <option value="en">English</option>
                                        <option value="hi">Hindi</option>
                                        <option value="mr">Marathi</option>
                                        <option value="kn">Kannada</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="de">German</option>
                                        <option value="ja">Japanese</option>
                                        <option value="zh">Chinese</option>
                                        <option value="ar">Arabic</option>
                                    </select>
                                    <button className="header-icon-btn">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="1" />
                                            <circle cx="12" cy="5" r="1" />
                                            <circle cx="12" cy="19" r="1" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="messages-area">
                                {messages.length === 0 ? (
                                    <div className="empty-chat">Start the conversation!</div>
                                ) : (
                                    messages.map((msg) => renderMessage(msg))
                                )}

                                {isTyping && (
                                    <div className="message message-theirs">
                                        <div className="message-content">
                                            <div className="message-bubble typing-indicator">
                                                <span className="typing-dot"></span>
                                                <span className="typing-dot"></span>
                                                <span className="typing-dot"></span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {uploadingMedia && (
                                    <div className="message message-mine">
                                        <div className="message-content">
                                            <div className="message-bubble uploading">
                                                <p> Uploading...</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            <form className="message-input-area" onSubmit={handleSendMessage}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    className="input-icon-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={!isConnected || uploadingMedia}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                    </svg>
                                </button>
                                <input
                                    type="text"
                                    className="message-input"
                                    placeholder="Type a message..."
                                    value={inputMessage}
                                    onChange={handleInputChange}
                                    disabled={!isConnected}
                                />
                                <button
                                    type="button"
                                    className="input-icon-btn"
                                    disabled={!isConnected}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </button>
                                <button
                                    type="submit"
                                    className="send-btn"
                                    disabled={!inputMessage.trim() || !isConnected}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="unified-chat-container">
            {/* LEFT ICON NAVIGATION */}
            <div className="icon-nav">
                <div className="icon-nav-top">
                    <button
                        className={`icon-nav-btn ${activeNavTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveNavTab('profile')}
                        title="Profile"
                    >
                        <div className="nav-avatar">
                            {userData?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </button>

                    <button
                        className={`icon-nav-btn ${activeNavTab === 'chats' ? 'active' : ''}`}
                        onClick={() => setActiveNavTab('chats')}
                        title="Chats"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                    </button>

                    <button
                        className={`icon-nav-btn ${activeNavTab === 'calls' ? 'active' : ''}`}
                        onClick={() => setActiveNavTab('calls')}
                        title="Calls"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                        </svg>
                    </button>

                    <button
                        className={`icon-nav-btn ${activeNavTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveNavTab('users')}
                        title="All Users"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </button>
                    <button
                        className={`icon-nav-btn ${activeNavTab === 'FileManager' ? 'active' : ''}`}
                        onClick={() => setActiveNavTab('FileManager')}
                        title="File Manager"
                    >
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 7a2 2 0 012-2h5l2 2h9a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                            <path d="M8 13h8" />
                            <path d="M8 17h5" />
                        </svg>

                    </button>

                </div>

                <div className="icon-nav-bottom">
                    <button
                        className={`icon-nav-btn ${activeNavTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveNavTab('settings')}
                        title="Settings"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {renderMainContent()}
        </div>
    );
};

export default UnifiedChatInterface;