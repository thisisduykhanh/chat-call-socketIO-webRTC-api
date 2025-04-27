const { Server } = require("socket.io");
const registerMessageHandlers = require("./handlers/message.handler");

const socketAuth = require("~/socket/middleware/auth");

const UserService = require("~/api/services/user.service");

const redisClient = require("~/config/redis");

let peers = new Set();


module.exports = (app, server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    app.set("io", io);

    // authentication middleware
    io.use(socketAuth);

    io.on("connection", async (socket) => {
        const userId = socket.user.id;
        await redisClient.setAsync(`user:${userId}:status`, "online", 60);
        console.log(`User ${userId} status updated to online`);


        socket.on("ping-online", () => {
            const userId = socket.user.id;
            redisClient.setAsync(`user:${userId}:status`, "online", 60);

            console.log(`User ${userId} status updated to online`);
        });

        // Đăng ký các logic xử lý
        registerMessageHandlers(socket, io);

        socket.on("disconnect", () => {
            console.log(`🔴 User disconnected: ${socket.user.id}`);

            UserService.updateLastSeen(socket.user.id).catch((err) => {
                console.error("Error updating last seen:", err.message);
            });

            redisClient.delAsync(`user:${socket.user.id}:status`);
            
        });
    });

    setInterval(() => {
        io.emit("ping");
    }, 20000);
};
