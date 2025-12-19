import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { fetchAllUsers } from "../../services/api.js";
import { startConversation, getConnectedUsers } from "../../services/conv.js";

const Dashboard = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const response = await fetchAllUsers(token);
        console.log("All users fetched:", response.data);
        setAllUsers(response.data.users);
      } catch (e) {
        console.error("Error fetching all users:", e);
      }
    };

    const fetchConnectedUsers = async () => {
      try {
        const response = await getConnectedUsers(userData._id, token);
        console.log("Connected users:", response);
        setConnectedUsers(response || []);
      } catch (e) {
        console.error("Error fetching connected users:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectedUsers();
    fetchAll();
  }, []);

  const connectUser = (userBId) => async () => {
    try {
      const conversation = await startConversation(userBId);
      if (conversation) {
        console.log("Conversation started:", conversation);
        alert("Connection request sent!");
        // Refresh connected users
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

  const openChat = (conversationId) => {
    navigate(`/chat/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div onClick={() => navigate("/setting")}>Setting</div>
      
      
      <div className="dashboard-content">
        {/* USER PROFILE CARD */}
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {userData?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="profile-info">
              <h2>{userData?.username || "User"}</h2>
              <p className="profile-email">{userData?.email}</p>
              <span className="language-badge">
                🌐 {userData?.preferredLanguage?.toUpperCase() || "EN"}
              </span>
            </div>
          </div>
        </div>

        {/* CONNECTED USERS SECTION */}
        <div className="section-card">
          <div className="section-header">
            <h3>💬 My Conversations</h3>
            <span className="count-badge">{connectedUsers.length}</span>
          </div>

          {connectedUsers.length === 0 ? (
            <div className="empty-state">
              <p>No conversations yet. Start connecting with users below!</p>
            </div>
          ) : (
            <div className="conversations-list">
              {connectedUsers.map((conv) => (
                <div key={conv.conversationId} className="conversation-item">
                  <div className="conversation-avatar">
                    {conv.user?.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="conversation-info">
                    <h4>{conv.user?.username}</h4>
                    <p className="conversation-email">{conv.user?.email}</p>
                    <span className="lang-indicator">
                      {conv.user?.preferredLanguage?.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => openChat(conv.conversationId)}
                    className="chat-button"
                  >
                    <span>Open Chat</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ALL USERS SECTION */}
        <div className="section-card">
          <div className="section-header">
            <h3>👥 All Users</h3>
            <span className="count-badge">{allUsers.length}</span>
          </div>

          {allUsers.length === 0 ? (
            <div className="empty-state">
              <p>No users found</p>
            </div>
          ) : (
            <div className="users-grid">
              {allUsers.map((user) => (
                <div key={user._id} className="user-card">
                  <div className="user-avatar-small">
                    {user.username?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="user-details">
                    <h4>{user.username}</h4>
                    <p className="user-email-small">{user.email}</p>
                  </div>
                  <button
                    onClick={connectUser(user._id)}
                    className="connect-button"
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;