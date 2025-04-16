const { Server } = require("socket.io");
const registerMessageHandlers = require("./handlers/message.handler");

const socketAuth = require("~/socket/middleware/auth");

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


    io.on("connection", (socket) => {
        console.log(`🔵 User connected: ${socket.user.id}`);

        // Đăng ký các logic xử lý
        registerMessageHandlers(socket, io);

        socket.on("typing", (data) => {
            console.log("✏️ Server received typing event:", data);
            socket.to(data.room).emit("typing", data);
        });

        socket.on("ice-candidate", (data) => {
            console.log("🧊 Server received ICE candidate:", data.candidate);
            socket.to(data.room).emit("ice-candidate", data);
        });

        socket.on("disconnect", () => {
            console.log(`🔴 User disconnected: ${socket.user.id}`);

            io.emit("user_disconnected", socket.id);
        });
    });

    setInterval(() => {
        io.emit("ping");
    }, 20000);
};
