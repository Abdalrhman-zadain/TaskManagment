import { io } from "socket.io-client";

// Use current origin (works for localhost and deployed via Cloudflare)
const SOCKET_URL = window.location.origin;

export const socket = io(SOCKET_URL, {
    autoConnect: false,
});

export const connectSocket = (userId) => {
    if (!socket.connected) {
        socket.connect();
        socket.emit("join", userId);
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};
