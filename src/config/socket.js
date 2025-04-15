const { Server } = require("socket.io");
const shortid = require("shortid");

let peers = new Set();

const userInfos = [];

module.exports = (app, server) => {

    const io = new Server(server, {
        cors: {
            origin: "*", 
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    app.set("io", io);

    io.on("connection", (socket) => {
        console.log(`🔵 User connected: ${socket.id}`);

        socket.on("user", (user) => {
            const isExistingUser = userInfos.find((u) => u.user.id === user.id);

            if (isExistingUser) {
                return socket.emit("sign_up_fail");
            }


            userInfos.push({ user });

            socket.emit("status_online", userInfos);

            socket.broadcast.emit("has_new_user", user);
        });

        socket.on("joinRoom", (userId, roomId) => {
            socket.join(roomId);
            socket.to(roomId).emit("user_joined", userId);
           
            console.log(`📌 User ${userId} joined room: ${roomId}`);
        });

        socket.on("leaveRoom", (userId, roomId) => {
            socket.leave(roomId);
            socket.to(roomId).emit("user_left", userId);
            console.log(`📌 User ${userId} left room: ${roomId}`);
        });

        socket.on("createRoom", (userId) => {
            const roomId = shortid.generate();
            socket.join(roomId);
            socket.emit("room_created", { roomId, userId });
            console.log(`📌 User ${userId} created room: ${roomId}`);
        }
        );

        socket.on("sendMessage", (data) => {
            console.log("📩 Server received message:", data);
            socket.to(data.room).emit("receiveMessage", data);
        });

        // socket.on('revokeMessage', async ({ messageId }) => {
        //     const message = await Message.findById(messageId);
        //     if (message) {
        //       message.isDeletedForEveryone = true;
        //       message.text = null;
        //       await message.save();
          
        //       io.to(message.conversation.toString()).emit('messageRevoked', { messageId });
        //     }
        //   });


        // socket.on("sendMessage", async (data) => {
        //     try {
        //         // Lưu tin nhắn
        //         const savedMessage = await sendMessage(data);

        //         // Emit sự kiện tin nhắn mới đến receiver hoặc conversation
        //         const target = data.receiver ? data.receiver : data.conversationId;
        //         io.to(target).emit("newMessage", savedMessage);
        //     } catch (error) {
        //         console.error("Error sending message:", error);
        //     }
        // });

        // // Lắng nghe sự kiện đánh dấu đã đọc
        // socket.on("markAsRead", async ({ messageId, userId }) => {
        //     try {
        //         const message = await Message.findById(messageId);
        //         if (message) {
        //             message.status = "seen";
        //             await message.save();

        //             io.to(userId).emit("messageRead", { messageId, userId });
        //         }
        //     } catch (error) {
        //         console.error("Error marking message as read:", error);
        //     }
        // });

        socket.on("typing", (data) => {
            console.log("✏️ Server received typing event:", data);
            socket.to(data.room).emit("typing", data);
        });

        socket.on('offer', (data) => {
            // console.log("📞 Server received offer:", data.offer);
            socket.to(data.room).emit('offer', data);
        });

        socket.on('answer', (data) => {
            console.log("📞 Server received answer:", data.answer);
            socket.to(data.room).emit('answer', data);
        });

        socket.on("ice-candidate", (data) => {
            console.log("🧊 Server received ICE candidate:", data.candidate);
            socket.to(data.room).emit("ice-candidate", data);
        });

        socket.on("disconnect", () => {
            console.log(`🔴 User disconnected: ${socket.id}`);

            const index = userInfos.findIndex((u) => u.user.id === socket.id);

            userInfos.splice(index, 1);

            io.emit("user_disconnected", socket.id);
        });
    });



    setInterval(() => {
        io.emit("ping");
    }, 20000);
}
