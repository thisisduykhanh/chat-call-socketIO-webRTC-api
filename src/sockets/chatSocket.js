// const Message = require("~/models/Message");
// const { redisClient } = require("~/config/redis");

module.exports = (io) => {
	io.on("connection", (socket) => {
		console.log(`🔵 User connected: ${socket.id}`);

		socket.on("joinRoom", (room) => {
			socket.join(room);
			console.log(`📌 User ${socket.id} joined room: ${room}`);
		});

		// socket.on("sendMessage", async (data) => {
		//     try {
		//         const { sender, room, text, files } = data;

		//         // 🟢 Lưu tin nhắn vào MongoDB
		//         const message = new Message({ sender, room, text, files });
		//         await message.save();

		//         // 🟢 Lưu cache vào Redis (giữ 20 tin gần nhất)
		//         await redisClient.lPush(`room:${room}`, JSON.stringify(message));
		//         await redisClient.lTrim(`room:${room}`, 0, 19);

		//         // 🟢 Phát tin nhắn real-time đến những người trong phòng
		//         io.to(room).emit("newMessage", message);
		//         console.log(`📩 Message sent to room ${room}`);
		//     } catch (error) {
		//         console.error("❌ Error sending message:", error);
		//     }
		// });

		socket.on("disconnect", () => {
			console.log(`🔴 User disconnected: ${socket.id}`);
		});
	});
};
