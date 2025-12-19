import { io } from 'socket.io-client';

const SOCKET_URL = 'https://chat-bird-backend.onrender.com/'; // Change this to your backend URL

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token')
  }
});

export default socket;