const { Server } = require("socket.io");

let io;
const userSockets = new Map(); // userId -> [socketId]

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        socket.on("join", (userId) => {
            if (!userId) return;
            const uid = parseInt(userId);
            if (!userSockets.has(uid)) {
                userSockets.set(uid, new Set());
            }
            userSockets.get(uid).add(socket.id);
            socket.userId = uid;
            console.log(`User ${uid} connected via socket ${socket.id}`);
        });

        socket.on("disconnect", () => {
            if (socket.userId && userSockets.has(socket.userId)) {
                userSockets.get(socket.userId).delete(socket.id);
                if (userSockets.get(socket.userId).size === 0) {
                    userSockets.delete(socket.userId);
                }
            }
            console.log(`Socket ${socket.id} disconnected`);
        });
    });

    return io;
}

function getIo() {
    return io;
}

function sendToUser(userId, event, data) {
    if (io && userSockets.has(parseInt(userId))) {
        const sockets = userSockets.get(parseInt(userId));
        sockets.forEach(sid => {
            io.to(sid).emit(event, data);
        });
    }
}

module.exports = { initSocket, getIo, sendToUser };
