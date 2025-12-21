

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import './Chats.css';

const Chats = () => {
  const { conversationId } = useParams();
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // 🔥 Typing indicator state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const userData = JSON.parse(localStorage.getItem('user'));
  const userId = userData?._id;
  const userLanguage = userData?.preferredLanguage || 'en';
  const token = localStorage.getItem('token');

  console.log('💡 Chat Component Initialized:', {
    conversationId,
    userId,
    userLanguage
  });

  // Fetch conversation details
  useEffect(() => {
    const fetchConversationDetails = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/chats/conversation/${conversationId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        const data = await response.json();
        const recipient = data.participants?.find(p => p._id !== userId);
        setRecipientInfo(recipient);
      } catch (error) {
        console.error('❌ Error fetching conversation details:', error);
      }
    };

    if (conversationId && userId) {
      fetchConversationDetails();
    }
  }, [conversationId, userId, token]);

  // Initialize Socket Connection
  useEffect(() => {
    console.log('💡 Initializing socket connection...');

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
      newSocket.emit('loadChatHistory', { conversationId, userId });
      
      // 🔥 Join the conversation room for typing indicators
      newSocket.emit('joinConversation', { conversationId });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    // Listen for chat history
    newSocket.on('chatHistory', (data) => {
      console.log('📜 Chat history received:', data);
      setMessages(data.messages);
      setLoading(false);
    });

    // 🔥 Listen for typing indicator
    newSocket.on('userTyping', ({ userId: typingUserId, isTyping: typing }) => {
      console.log('💬 Typing event:', { typingUserId, typing });
      
      // Only show typing indicator if it's from the other person
      if (typingUserId !== userId) {
        setIsTyping(typing);
        
        // Auto-hide typing indicator after 3 seconds
        if (typing) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        }
      }
    });

    // Listen for new text messages
    newSocket.on('receiveMessage', (messageData) => {
      console.log('📨 New message received:', messageData);
      
      // Hide typing indicator when message arrives
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

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
          isMine: messageData.isMine !== undefined ? messageData.isMine : messageData.sender === userId,
          messageType: messageData.messageType || 'text'
        }];
      });
    });

    // Listen for media messages
    newSocket.on('receiveMediaMessage', (messageData) => {
      console.log('📸 New media message received:', messageData);

      setMessages(prev => {
        const exists = prev.some(m => m.messageId === messageData.messageId);
        if (exists) return prev;

        return [...prev, {
          messageId: messageData.messageId,
          text: messageData.text,
          sender: messageData.sender,
          senderName: messageData.senderName,
          createdAt: messageData.createdAt,
          isMine: messageData.isMine !== undefined ? messageData.isMine : messageData.sender === userId,
          messageType: messageData.messageType,
          media: messageData.media
        }];
      });
    });

    // Listen for message deletions
    newSocket.on('messageDeleted', ({ messageId, conversationId: convId }) => {
      console.log('🗑️ Message deleted:', messageId);
      if (convId === conversationId) {
        setMessages(prev => prev.filter(m => m.messageId !== messageId));
      }
    });

    newSocket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      alert(error.message || 'An error occurred');
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Disconnecting socket...');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      newSocket.disconnect();
    };
  }, [conversationId, userId, userLanguage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [updatingLanguage, setUpdatingLanguage] = useState(false);

  useEffect(() => {
    setSelectedLanguage(userLanguage);
  }, [userLanguage]);

  const handleLanguageChange = async (e) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);
    setUpdatingLanguage(true);

    try {
      console.log('🌐 Updating preferred language to:', newLanguage);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/chats/update-lang`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          preferredLanguage: newLanguage,
          conversationId: conversationId
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Language updated successfully');

        const updatedUserData = { ...userData, preferredLanguage: newLanguage };
        localStorage.setItem('user', JSON.stringify(updatedUserData));

        if (socket && isConnected) {
          socket.emit("reloadChatHistory", {
            conversationId,
            userId
          });
        }
      } else {
        console.error('❌ Failed to update language:', result.message);
        alert(result.message || 'Failed to update language preference');
        setSelectedLanguage(userLanguage);
      }
    } catch (error) {
      console.error('❌ Error updating language:', error);
      alert('Failed to update language preference');
      setSelectedLanguage(userLanguage);
    } finally {
      setUpdatingLanguage(false);
    }
  };

  // 🔥 Handle input change with typing indicator
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputMessage(value);

    if (socket && isConnected) {
      // Emit typing = true when user starts typing
      if (value.length > 0) {
        socket.emit('typing', {
          conversationId,
          userId,
          isTyping: true
        });

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to emit typing = false after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing', {
            conversationId,
            userId,
            isTyping: false
          });
        }, 2000);
      } else {
        // Immediately emit typing = false when input is empty
        socket.emit('typing', {
          conversationId,
          userId,
          isTyping: false
        });
      }
    }
  };

  // Send text message
  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!inputMessage.trim() || !socket || !isConnected) {
      return;
    }

    // 🔥 Stop typing indicator when sending
    if (socket && isConnected) {
      socket.emit('typing', {
        conversationId,
        userId,
        isTyping: false
      });
    }

    const messageData = {
      conversationId,
      senderId: userId,
      text: inputMessage.trim(),
      language: selectedLanguage,
      recipients: recipientInfo?._id ? [recipientInfo._id] : []
    };
    
    console.log('📤 Sending message:', messageData);
    socket.emit('sendMessage', messageData);

    setInputMessage('');
  };

  // Handle file selection and upload
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    const messageType = isVideo ? 'video' : 'image';

    try {
      setUploadingMedia(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);
      formData.append('messageType', messageType);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/conv-media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Media uploaded successfully:', result);
      } else {
        console.error('❌ Upload failed:', result.message);
        alert(result.message || 'Failed to upload media');
      }
    } catch (error) {
      console.error('❌ Error uploading media:', error);
      alert('Failed to upload media');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = (msg) => {
    const isMediaMessage = msg.messageType === 'image' || msg.messageType === 'video';

    return (
      <div
        key={msg.messageId}
        className={`message ${msg.isMine ? 'message-mine' : 'message-theirs'}`}
      >
        <div className="message-content">
          {!msg.isMine && (
            <div className="message-sender">{msg.senderName}</div>
          )}

          <div className="message-bubble">
            {isMediaMessage && msg.media && (
              <div className="message-media">
                {msg.messageType === 'image' && (
                  <img
                    src={msg.media.url}
                    alt="Shared image"
                    className="media-image"
                    onError={(e) => {
                      console.error('Failed to load image:', msg.media.url);
                      e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                    }}
                  />
                )}
                {msg.messageType === 'video' && (
                  <video
                    src={msg.media.url}
                    controls
                    className="media-video"
                    onError={(e) => {
                      console.error('Failed to load video:', msg.media.url);
                    }}
                  />
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

  if (loading) {
    return (
      <div className="chat-container">
        <div className="loading-state">
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="recipient-avatar">
            {recipientInfo?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="recipient-details">
            <h3>{recipientInfo?.username || 'Chat'}</h3>
            <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
        </div>
        <div className="language-selector">
          <label htmlFor="lang">Select language:</label>
          <select
            name="lang"
            id="lang"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            disabled={updatingLanguage}
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
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="it">Italian</option>
          </select>
          {updatingLanguage && <span className="updating-indicator">⏳</span>}
        </div>

        <div className="language-info">
          🌐 {selectedLanguage.toUpperCase()}
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => renderMessage(msg))
        )}

        {/* 🔥 Typing Indicator */}
        {isTyping && (
          <div className="message message-theirs">
            <div className="message-content">
              <div className="message-sender">{recipientInfo?.username}</div>
              <div className="message-bubble typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}

        {/* Uploading indicator */}
        {uploadingMedia && (
          <div className="message message-mine">
            <div className="message-content">
              <div className="message-bubble uploading">
                <p>📤 Uploading media...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form className="message-input-container" onSubmit={handleSendMessage}>
        <div className="input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="attach-button"
            onClick={handleAttachClick}
            disabled={!isConnected || uploadingMedia}
            title="Attach image or video"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
            type="submit"
            className="send-button"
            disabled={!inputMessage.trim() || !isConnected}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chats;