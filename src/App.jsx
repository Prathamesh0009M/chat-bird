import React from 'react'
import { Routes, Route } from "react-router-dom";
import Login from './pages/Login.jsx';
import SignUp from './pages/SignUp.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
// import Dashboard from './pages/dashboard/Dashboard.jsx';
import Chats from './components/chat/Chats.jsx';
import Setting from './components/setting/Setting.jsx';
import UnifiedChatInterface from './components/chat/UnifiedChatInterface.jsx';
const App = () => {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } /> */}

        <Route path="/" element={
          <ProtectedRoute>
            <UnifiedChatInterface />
          </ProtectedRoute>}
        />
          
        <Route path="/chat/:conversationId" element={
          <ProtectedRoute>
            <Chats />
          </ProtectedRoute>
        } />

        <Route path="/setting" element={
          <ProtectedRoute>
            <Setting />
          </ProtectedRoute>
        } />




      </Routes>
    </>
  )
}

export default App