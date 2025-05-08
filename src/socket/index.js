const { Server } = require("socket.io");
const registerMessageHandlers = require("./handlers/message.handler");

const socketAuth = require("~/socket/middleware/auth");

const UserService = require("~/api/services/user.service");

const {
	setAsync,
	getAsync,
	existsAsync,
	saveInfoCallAsync,
	delAsync,
	hGetAllAsync,
	sCardAsync,
	sAddAsync,
	sMembersAsync,
	sRemAsync,
} = require("~/config/redis");

const ConversationService = require("~/api/services/conversation.service");

const {
	sendCallNotification,
	sendCallNotificationMulticast,
} = require("~/utils/sendPushNotification.util");

const peers = new Set();

const MAX_PARTICIPANTS = 8;
const activeCalls = new Map();

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
		socket.join(userId);
		await setAsync(`user:${userId}:status`, "online", 60);
		console.log(`User ${userId} status updated to online`);

		socket.on("ping-online", async () => {
			await setAsync(`user:${userId}:status`, "online", 60);

			console.log(`User ${userId} status updated to online`);
		});
		// Đăng ký các logic xử lý
		registerMessageHandlers(socket, io);

		socket.on("update-fcm-token", async ({ fcmToken }) => {
			await setAsync(`user:${userId}:fcmToken`, fcmToken, 604800); // 7 days
			console.log(`FCM Token updated for user ${userId}: ${fcmToken}`);
		});

		socket.on("join-conversation", ({ conversationId }) => {
			socket.join(conversationId);
			socket.conversationId = conversationId;
			io.to(conversationId).emit("user-connected", { userId });
			console.log(`${userId} joined conversation ${conversationId}`);
		});

		// Khởi tạo cuộc gọi
		socket.on("start-call", async ({ conversationId }) => {
			const callKey = `call:${conversationId}`;
			const participantsKey = `${callKey}:participants`;
			const startTime = new Date();
			const callId = Date.now().toString();

			if (await existsAsync(callKey)) {
				return socket.emit("call-error", {
					message: "A call is already in progress.",
				});
			}

			await saveInfoCallAsync({
				callKey,
				participantsKey,
				userId,
			});

			try {
				const participants =
					await ConversationService.getAllParticipants(conversationId);
				const caller = participants.find((p) => p._id.toString() === userId);

				const callerName = caller ? caller.name || caller.username : "Unknown";
				const callerAvatar = caller?.avatarUrl || "";

				const participantIds = participants
					.map((p) => p._id.toString())
					.filter((id) => id !== userId);

				let isAnyParticipantOnline = false;

				// Gửi call-incoming cho người online
				for (const participantId of participantIds) {
					const isOnline = await getAsync(`user:${participantId}:status`);
					if (isOnline) {
						isAnyParticipantOnline = true;
						socket.to(participantId).emit("call-incoming", {
							initiatorId: userId,
							conversationId,
							callId,
						});
					}
				}

				// Thông báo cho caller rằng call-incoming đã được gửi
				if (isAnyParticipantOnline) {
					socket.emit("call-incoming-sent", { conversationId });
					console.log(
						`Sent call-incoming-sent to caller ${userId} for conversation ${conversationId}`,
					);
				}

				// Gửi thông báo push cho tất cả người tham gia
				await sendCallNotificationMulticast(participantIds, {
					title: "Incoming Call",
					body: `Call from ${callerName}`,
					callId,
					callerName,
					callerId: userId,
					conversationId,
					avatarUrl: callerAvatar,
					userId,
				});

				console.log(`📞 ${userId} started call in ${conversationId}`);
			} catch (err) {
				socket.emit("call-error", {
					message: "Failed to start call: Conversation not found",
				});
				await delAsync(callKey);
				await delAsync(participantsKey);
				console.error(
					`Error starting call in ${conversationId}: ${err.message}`,
				);
				return;
			}

			const timeout = setTimeout(async () => {
				const stillExists = await existsAsync(callKey);
				if (stillExists) {
					const endTime = new Date();
					const callData = await hGetAllAsync(callKey);
					const duration = Math.round(
						(endTime - new Date(callData.startTime)) / 1000,
					);
					await delAsync(callKey);
					await delAsync(participantsKey);
					activeCalls.delete(conversationId);

					try {
						const message = {
							id: Date.now().toString(),
							conversation_id: conversationId,
							sender_id: userId,
							content: `Missed call (${formatDuration(duration)})`,
							timestamp: endTime.getTime(),
							status: "sent",
							type: "call",
							call_data: JSON.stringify({
								callType: "voice",
								duration,
								participants: [userId],
							}),
						};
						// Thay MessageService bằng lưu vào Redis
						await setAsync(
							`message:${conversationId}:${message.id}`,
							message,
							604800,
						);
						io.to(conversationId).emit("call-message-saved", message);
						console.log(
							`Saved missed call message for conversation ${conversationId}`,
						);
					} catch (err) {
						console.error(`Error saving missed call message: ${err.message}`);
					}

					io.to(conversationId).emit("call-ended", {
						reason: "timeout",
					});
					console.log(
						`Call for conversation ${conversationId} ended due to timeout.`,
					);
				}
			}, 60000);

			activeCalls.set(conversationId, timeout);
		});

		// Chấp nhận cuộc gọi
		socket.on("accept-call", async ({ conversationId, toUserId }) => {
			if (!toUserId) {
				socket.emit("call-error", { message: "Missing userId." });
				return;
			}

			const callKey = `call:${conversationId}`;
			const participantsKey = `call:${conversationId}:participants`;

			if (!(await existsAsync(callKey))) {
				socket.emit("call-error", {
					message: "No active call in this conversation.",
				});
				return;
			}

			const participantCount = await sCardAsync(participantsKey);
			if (participantCount >= MAX_PARTICIPANTS) {
				socket.emit("call-error", {
					message: "Call is full (max 8 participants).",
				});
				return;
			}

			await sAddAsync(participantsKey, userId);

			// Hủy timer khi cuộc gọi được chấp nhận
			const timeout = activeCalls.get(conversationId);
			if (timeout) {
				clearTimeout(timeout);
				activeCalls.delete(conversationId);
				console.log(`Cancelled timeout for call ${conversationId}`);
			}

			io.to(conversationId).emit("user-joined-call", { userId });
			io.to(toUserId).emit("call-accepted", { toUserId: userId });
			console.log(`✅ ${userId} accepted call in ${conversationId}`);
		});

		// Từ chối cuộc gọi
		socket.on("reject-call", ({ conversationId }) => {
			io.to(conversationId).emit("call-rejected", { userId });
			console.log(`❌ ${userId} rejected call in ${conversationId}`);
		});

		socket.on("end-call", async ({ conversationId }) => {
			const callKey = `call:${conversationId}`;
			const participantsKey = `call:${conversationId}:participants`;

			if (!(await existsAsync(callKey))) return;

			const endTime = new Date();
			const callData = await hGetAllAsync(callKey);
			const startTime = new Date(callData.startTime);
			const duration = Math.round((endTime - startTime) / 1000);

			const participants = await sMembersAsync(participantsKey);

			await delAsync(callKey);
			await delAsync(participantsKey);
			activeCalls.delete(conversationId);

			try {
				const message = {
					id: Date.now().toString(),
					conversation_id: conversationId,
					sender_id: userId,
					content: `Voice call ended (${formatDuration(duration)})`,
					timestamp: endTime.getTime(),
					status: "sent",
					type: "call",
					call_data: JSON.stringify({
						callType: "voice",
						duration,
						participants,
					}),
				};
				// await MessageService.createMessage(message);
				await setAsync(
					`message:${conversationId}:${message.id}`,
					message,
					604800,
				);
				io.to(conversationId).emit("call-message-saved", message);
				console.log(`Saved call message for conversation ${conversationId}`);
			} catch (err) {
				console.error(`Error saving call message: ${err.message}`);
			}

			io.to(conversationId).emit("call-ended", {
				userId,
				conversationId,
			});

			console.log(`🛑 ${userId} ended call in ${conversationId}`);
		});

		// Gửi offer WebRTC
		socket.on("call-offer", ({ toUserId, offer }) => {
			socket.to(toUserId).emit("call-offer", {
				fromUserId: userId,
				offer,
			});

			console.log(
				`Sent call-offer from ${userId} to ${toUserId}: ${JSON.stringify(offer)}`,
			);
		});

		// Gửi answer WebRTC
		socket.on("call-answer", ({ toUserId, answer }) => {
			console.log(
				`Sent call-answer from ${userId} to ${toUserId}: ${JSON.stringify(answer)}`,
			);

			socket.to(toUserId).emit("call-answer", {
				fromUserId: userId,
				answer,
			});
		});

		// Gửi ICE candidate
		socket.on("ice-candidate", ({ toUserId, candidate }) => {
			socket.to(toUserId).emit("ice-candidate", {
				fromUserId: userId,
				candidate,
			});

			console.log(
				`Sent ICE candidate from ${userId} to ${toUserId}: ${JSON.stringify(candidate)}`,
			);
		});

		socket.on("disconnect", async () => {
			console.log(`🔴 User disconnected: ${userId}`);

			try {
				await UserService.updateLastSeen(userId);
				await delAsync(`user:${userId}:status`);
			} catch (err) {
				console.error("Error updating last seen:", err.message);
			}

			const conversationId = socket.conversationId;
			if (conversationId) {
				io.to(conversationId).emit("user-disconnected", { userId });
				const callKey = `call:${conversationId}`;
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

						if (remainingParticipants === 0) {
							await delAsync(callKey);
							await delAsync(participantsKey);
							activeCalls.delete(conversationId);

							try {
								const message = {
									id: Date.now().toString(),
									conversation_id: conversationId,
									sender_id: userId,
									content: `Voice call ended (${formatDuration(duration)})`,
									timestamp: endTime.getTime(),
									status: "sent",
									type: "call",
									call_data: JSON.stringify({
										callType: "voice",
										duration,
										participants,
									}),
								};
								// await MessageService.createMessage(message);
								await setAsync(
									`message:${conversationId}:${message.id}`,
									message,
									604800,
								);
								io.to(conversationId).emit("call-message-saved", message);
								console.log(
									`Saved call message for conversation ${conversationId}`,
								);
							} catch (err) {
								console.error(`Error saving call message: ${err.message}`);
							}

							io.to(conversationId).emit("call-ended", {
								userId,
								conversationId,
							});
							console.log(
								`🛑 Call in ${conversationId} ended due to all participants leaving`,
							);
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

// Hàm định dạng thời gian (ví dụ: 3600s -> 1:00:00)
function formatDuration(seconds) {
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	const parts = [];
	if (hrs > 0) parts.push(hrs.toString().padStart(1, "0"));
	parts.push(mins.toString().padStart(2, "0"));
	parts.push(secs.toString().padStart(2, "0"));

	return parts.join(":");
}
