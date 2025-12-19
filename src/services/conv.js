import axios from 'axios';
export const axiosInstance = axios.create({});

const API_URL = 'https://chat-bird-backend.onrender.com/api'; // Change this to your backend URL

const apiConnector = (method, url, bodyData, headers, params) => {
    return axiosInstance({
        method: `${method}`,
        url: `${url}`,
        data: bodyData ? bodyData : null,
        headers: headers ? headers : null,
        params: params ? params : null,
    })
}

export const startConversation = async (userBId) => {
    try {
        const userData = JSON.parse(localStorage.getItem("user"));
        const userId = userData ? userData._id : null;
        if (!userId || !userBId) {
            console.error("Both user IDs are required to start a conversation.");
            return null;
        }
        const response = await apiConnector(
            'post',
            `${API_URL}/chats/startConvo`,
            { userAId: userId, userBId: userBId }, // Example payload; adjust as needed
            { 'Content-Type': 'application/json' }
        );
        if (response.data.success) {
            return response.data.conversation;
        }
        console.error("Failed to start conversation:", response.data.message);
        return null;
    } catch (error) {
        console.error("Error starting conversation:", error);
        return null;
    }
};

export const getConnectedUsers = async (userId, token) => {
    try {
        const response = await apiConnector(
            'POST',
            `${API_URL}/chats/getConnectedUser`,
            { userId },
            {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            { withCredentials: true }
        );

        if (response.data.success) {
            return response.data.connectedUsers;
        }
        console.error("Failed to fetch connected users:", response.data.message);
        return [];
    } catch (error) {
        console.error("Error fetching connected users:", error);
        return [];
    }
};

