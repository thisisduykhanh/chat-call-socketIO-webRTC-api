const { Server } = require("socket.io");
const registerMessageHandlers = require("./handlers/message.handler");

const registerBlockHandlers = require("./handlers/block.handler");

const registerCallHandlers = require("./handlers/call.handler");

const socketAuth = require("~/socket/middleware/auth");
const UserService = require("~/api/services/user.service");

const { activeCalls } = require("~/socket/state/callState");
const {
	getUsersInPrivateConversations,
	updateMessageStatusForReceivers,
	getAllParticipants,
} = require("~/api/services/conversation.service");

const {
	setAsync,
	existsAsync,
	delAsync,
	hGetAllAsync,
	sCardAsync,
	sMembersAsync,
	sRemAsync,
	getAsync,
} = require("~/config/redis");

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
	io.use((socket, next) => {
		try {
			socketAuth(socket, next);
		} catch (err) {
			console.error("❌ Authentication error:", err.message);

			if (err.name === "TokenExpiredError") {
				socket.emit("token-expired");
				console.log("🔴 Token expired for socket:", socket.id);
				return next(new Error("Token expired"));
			}
			return next(err);
		}
	});

	io.on("connection", async (socket) => {
		const userId = socket.user.id;
		socket.join(userId);
		await setAsync(`user:${userId}:status`, "online", 60);
		console.log(`User ${userId} status updated to online`);
		await updateMessageStatusForReceivers(userId);

		const fcmToken = await getAsync(`user:${userId}:fcmToken`);
		if (!fcmToken) {
			socket.emit("refresh-fcm-token");
			console.log(`Requested FCM token refresh for user ${userId}`);
		}

		socket.on("ping-online", async () => {
			await setAsync(`user:${userId}:status`, "online", 60);

			const users = await getUsersInPrivateConversations(userId);

			for (const user of users) {
				io.to(user._id.toString()).emit("user:online", { userId });
				console.log(`Emit user ${user._id} status updated to online`);
			}
		});

		// Đăng ký các logic xử lý
		registerMessageHandlers(socket, io);

		registerBlockHandlers(socket, io);

		registerCallHandlers(socket, io);

		socket.on("update-fcm-token", async ({ fcmToken, platform }) => {
			if (!fcmToken || !platform) {
				console.error("FCM Token and platform are required");
				return;
			}
			await delAsync(`user:${userId}:fcmToken`);
			await delAsync(`user:${userId}:platform`);
			await setAsync(`user:${userId}:platform`, platform, 604800); // 7 days
			await setAsync(`user:${userId}:fcmToken`, fcmToken, 604800); // 7 days
			console.log(
				`Updated FCM token for user ${userId} on platform ${platform}`,
			);
		});

		socket.on("disconnect", async () => {
			console.log(`🔴 User disconnected: ${userId}`);

			try {
				await UserService.updateLastSeen(userId);
				await delAsync(`user:${userId}:status`);

				const relatedUsers = await getUsersInPrivateConversations(userId);

				for (const user of relatedUsers) {
					io.to(user._id.toString()).emit("user:offline", { userId });
					console.log(`User ${user._id} status updated to offline`);
				}

				socket.leave(userId);
			} catch (err) {
				console.error("Error updating last seen:", err.message);
			}

			const callKey = socket.callKey;
			const conversationId = callKey?.split(":")[1];
			if (callKey && conversationId) {
				io.to(conversationId).emit("user-disconnected", { userId });
				const participantsKey = `call:${conversationId}:participants`;

				if (await existsAsync(callKey)) {
					const participants = await sMembersAsync(participantsKey);
					if (participants.includes(userId)) {
						await sRemAsync(participantsKey, userId);
						const remainingParticipants = await sCardAsync(participantsKey);
						const endTime = new Date();
						const callData = await hGetAllAsync(callKey);
						const startTime = new Date(callData.startTime);
						const duration = Math.round((endTime - startTime) / 1000);
						const callType = callData.callType || "voice";

						let conversationMembers;
						try {
							conversationMembers = await getAllParticipants(conversationId);
						} catch (err) {
							console.error(
								`Error fetching conversation members: ${err.message}`,
							);
							return;
						}
						const isOneToOne = conversationMembers.length === 2;

						if (isOneToOne || remainingParticipants === 0) {
							await delAsync(callKey);
							await delAsync(participantsKey);
							activeCalls.delete(conversationId);

							try {
								const message = {
									id: Date.now().toString(),
									conversation_id: conversationId,
									sender_id: userId,
									content: `${callType === "video" ? "Video" : "Voice"} call ended (${formatDuration(duration)})`,
									timestamp: endTime.getTime(),
									status: "sent",
									type: "call",
									call_data: JSON.stringify({
										callType: callType,
										duration,
										participants,
									}),
								};
								await setAsync(
									`message:${conversationId}:${message.id}`,
									JSON.stringify(message),
									604800,
								);
								io.to(conversationId).emit("call-message-saved", message);
								console.log(
									`Saved call message for conversation ${conversationId}`,
								);
							} catch (err) {
								console.error(`Error saving call message: ${err.message}`);
							}

							io.to(callKey).emit("call-ended", {
								userId,
								conversationId,
								reason: isOneToOne ? "user-disconnected" : "no-participants",
							});

							const room = io.sockets.adapter.rooms.get(callKey);
							if (room) {
								for (const socketId of room) {
									const socket = io.sockets.sockets.get(socketId);
									if (socket) {
										socket.leave(callKey);
										socket.callKey = null;
										console.log(`Socket ${socketId} left callKey ${callKey}`);
									}
								}
							}

							console.log(
								`🛑 ${isOneToOne ? "1:1" : "Group"} call in ${conversationId} ended due to ${userId} disconnecting`,
							);
						} else {
							io.to(callKey).emit("user-left-call", {
								userId,
								conversationId,
							});
							console.log(`🚶 ${userId} left group call in ${conversationId}`);
						}
					}
				}
			}
		});
	});

	setInterval(() => {
		io.emit("ping");
	}, 20000);
};
