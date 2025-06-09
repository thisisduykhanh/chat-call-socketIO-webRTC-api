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
    getKeysAsync,
    sIsMemberAsync,
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

        const callKeys = await getKeysAsync(`call:*:participants`);
        for (const callKey of callKeys) {
            const conversationId = callKey.split(":")[1];
            if (await sIsMemberAsync(callKey, userId)) {
                // Kiểm tra reconnect timeout
                const reconnectData = await getReconnectTimeout(
                    userId,
                    conversationId
                );
                if (reconnectData) {
                    socket.join(callKey);
                    socket.callKey = callKey;

                    // Xóa reconnect timeout
                    await clearReconnectTimeout(userId, conversationId);

                    // Thông báo user-reconnected
                    socket.to(callKey).emit("user-reconnected", {
                        userId,
                        conversationId,
                        message: `${userId} has reconnected to the call`,
                    });

					socket.emit("request-new-offer", {
                    conversationId,
                    participants: await sMembersAsync(`call:${conversationId}:participants`),
                });

                    // Gửi trạng thái cuộc gọi
                    const callData = await hGetAllAsync(
                        `call:${conversationId}`
                    );
                    const participants = await sMembersAsync(
                        `call:${conversationId}:participants`
                    );
                    socket.emit("call-state-update", {
                        conversationId,
                        callType: callData.callType || "voice",
                        participants,
                        startTime: callData.startTime,
                    });

                    console.log(
                        `User ${userId} rejoined call ${conversationId}`
                    );
                }
            }
        }
        const fcmToken = await getAsync(`user:${userId}:fcmToken`);
        if (!fcmToken) {
            socket.emit("refresh-fcm-token");
            console.log(`Requested FCM token refresh for user ${userId}`);
        }

        socket.on("ping-online", async () => {
            await setAsync(`user:${userId}:status`, "online", 60);

            const users = await getUsersInPrivateConversations(userId);

            for (const user of users) {
                socket.to(user._id.toString()).emit("user:online", { userId });
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
                `Updated FCM token for user ${userId} on platform ${platform}`
            );
        });

       socket.on("request-call-state", async ({ conversationId, userId }) => {
    const callKey = `call:${conversationId}`;
    const participantsKey = `call:${conversationId}:participants`;

    if (await existsAsync(callKey)) {
        const callData = await hGetAllAsync(callKey);
        const participants = await sMembersAsync(participantsKey);

        // Check for users with expired reconnect timeouts
        for (const participant of participants) {
            const reconnectData = await getReconnectTimeout(participant, conversationId);
            if (reconnectData) {
                // Reconnect timeout exists, check if it has expired
                const timeoutDuration = 60 * 1000; // 60 seconds in milliseconds
                const currentTime = Date.now();
                const reconnectTimestamp = reconnectData.timestamp;

                if (currentTime - reconnectTimestamp > timeoutDuration) {
                    // Reconnect timeout has expired, remove user from call
                    await sRemAsync(participantsKey, participant);
                    console.log(
                        `Removed user ${participant} from call ${conversationId} due to expired reconnect timeout`
                    );

                    const remainingParticipants = await sCardAsync(participantsKey);
                    const isOneToOne = (await getAllParticipants(conversationId)).length === 2;

                    if (isOneToOne || remainingParticipants === 0) {
                        await delAsync(callKey);
                        await delAsync(participantsKey);

                        const endTime = new Date();
                        const startTime = new Date(callData.startTime);
                        const duration = Math.round((endTime - startTime) / 1000);
                        const callType = callData.callType || "voice";

                        try {
                            const message = {
                                id: Date.now().toString(),
                                conversation_id: conversationId,
                                sender_id: userId,
                                content: `${
                                    callType === "video" ? "Video" : "Voice"
                                } call ended (${formatDuration(duration)})`,
                                timestamp: endTime.getTime(),
                                status: "sent",
                                type: "call",
                                call_data: JSON.stringify({
                                    callType,
                                    duration,
                                    participants,
                                }),
                            };
                            await setAsync(
                                `message:${conversationId}:${message.id}`,
                                JSON.stringify(message),
                                604800
                            );
                            socket.to(conversationId).emit("call-message-saved", message);
                            console.log(
                                `Saved call message for conversation ${conversationId}`
                            );
                        } catch (err) {
                            console.error(`Error saving call message: ${err.message}`);
                        }

                        socket.to(callKey).emit("call-ended", {
                            userId: participant,
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
                                    console.log(
                                        `Socket ${userId} left callKey ${callKey}`
                                    );
                                }
                            }
                        }

                        console.log(
                            `🛑 ${isOneToOne ? "1:1" : "Group"} call in ${conversationId} ended`
                        );
                    } else {
                        socket.to(callKey).emit("user-left-call", {
                            userId: participant,
                            conversationId,
                        });
                        console.log(
                            `🚶 ${participant} left group call in ${conversationId}`
                        );
                    }
                }
            }
            // If reconnectData is null, the user is either still connected or never disconnected,
            // so no action is needed.
        }

        // Send call state update
        socket.emit("call-state-update", {
            conversationId,
            callType: callData.callType || "voice",
            participants,
            startTime: callData.startTime,
        });
        console.log(
            `Sent call state update to user ${userId} for conversation ${conversationId}`
        );
    } else {
        socket.emit("call-error", {
            message: "No active call in this conversation.",
        });
        console.log(`User ${userId} has no active call. conversationId: ${conversationId}`);
    }
});

        socket.on("disconnect", async () => {
            console.log(`🔴 User disconnected: ${userId}`);
            try {
                await UserService.updateLastSeen(userId);
                await delAsync(`user:${userId}:status`);
                const relatedUsers = await getUsersInPrivateConversations(
                    userId
                );
                for (const user of relatedUsers) {
                    socket
                        .to(user._id.toString())
                        .emit("user:offline", { userId });
                    console.log(`User ${user._id} status updated to offline`);
                }

                socket.leave(userId);

                const callKey = socket.callKey;
                const conversationId = callKey?.split(":")[1];
                if (callKey && conversationId) {
                    const participantsKey = `call:${conversationId}:participants`;

                    if (await existsAsync(callKey)) {
                        const participants = await sMembersAsync(
                            participantsKey
                        );
                        if (participants.includes(userId)) {
                            // Gửi thông báo chờ reconnect
                            socket.to(callKey).emit("user-waiting-reconnect", {
                                userId,
                                conversationId,
                                message: `${userId} lost connection, waiting to reconnect...`,
                            });

                            // Lưu reconnect timeout vào Redis
                            await setReconnectTimeout(
                                userId,
                                conversationId,
                                callKey
                            );
                        }
                    }
                }
            } catch (err) {
                console.error("Error handling disconnect:", err.message);
            }
        });
    });

    setInterval(() => {
        io.emit("ping");
    }, 20000);
};

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

async function setReconnectTimeout(userId, conversationId, callKey) {
    const key = `reconnect:user:${userId}:${conversationId}`;
    const value = {
        callKey,
        timestamp: Date.now(),
    };
    await setAsync(key, JSON.stringify(value), 60); // TTL 60 giây
    console.log(`Set reconnect key ${key} for user ${userId}`);
}

async function getReconnectTimeout(userId, conversationId) {
    const key = `reconnect:user:${userId}:${conversationId}`;
    const data = await getAsync(key);
    if (data) {
        return JSON.parse(data);
    }
    return null;
}

async function clearReconnectTimeout(userId, conversationId) {
    const key = `reconnect:user:${userId}:${conversationId}`;
    await delAsync(key);
    console.log(`Cleared reconnect key ${key} for user ${userId}`);
}
