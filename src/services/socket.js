import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // Change this to your backend URL

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: localStorage.getItem('token')
  }
});

export default socket;