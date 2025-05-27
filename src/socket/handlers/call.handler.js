const ConversationService = require("~/api/services/conversation.service");

const { activeCalls } = require("~/socket/state/callState");

const messageService = require("@/services/message.service");
const callService = require("@/services/call.service");

const { emitToConversation } = require("~/socket/utils/socket.helpers");

const {
    sendMulticastNotification,
} = require("~/utils/sendPushNotification.util");

const MAX_PARTICIPANTS = 8;

const {
    getAsync,
    existsAsync,
    saveInfoCallAsync,
    delAsync,
    hGetAllAsync,
    sCardAsync,
    sAddAsync,
    sMembersAsync,
    sRemAsync,
    updateStartTimeAsync,
    getKeysAsync,
    sIsMemberAsync
} = require("~/config/redis");

module.exports = (socket, io) => {
    const userId = socket.user.id;

    socket.on("audio-stream-received", (data) => {
        console.log(
            `Audio stream received by ${data.userId} in conversation ${data.conversationId}`
        );
    });

    // Khởi tạo cuộc gọi
    socket.on("start-call", async ({ conversationId, callType }) => {
        const callKey = `call:${conversationId}`;
        const participantsKey = `${callKey}:participants`;

        if (await existsAsync(callKey)) {
            return socket.emit("call-error", {
                message: "A call is already in progress.",
            });
        }

        // Người gọi join callKey và thêm vào danh sách participants
        socket.join(callKey);
        socket.callKey = callKey;
        await sAddAsync(participantsKey, userId);

        await saveInfoCallAsync({
            callKey,
            participantsKey,
            userId,
            callType: callType || "voice",
        });

        try {
            const participants = await ConversationService.getAllParticipants(
                conversationId
            );
            const caller = participants.find(
                (p) => p._id.toString() === userId
            );

            const callerName = caller
                ? caller.name || caller.username
                : "Unknown";
            const callerAvatar = caller?.avatarUrl || "";

            const participantIds = participants
                .map((p) => p._id.toString())
                .filter((id) => id !== userId);

            if (participants.length === 2) {
                const receiverId = participantIds[0]; // Trong 1:1, chỉ có một người nhận
                const senderSettings = await UserSettingsService.getSetting(
                    userId,
                    "privacySettings.blockedUsers"
                );
                const receiverSettings = await UserSettingsService.getSetting(
                    receiverId,
                    "privacySettings.blockedUsers"
                );

                if (
                    senderSettings["privacySettings.blockedUsers"].includes(
                        receiverId
                    )
                ) {
                    await delAsync(callKey);
                    await delAsync(participantsKey);
                    socket.leave(callKey);
                    socket.callKey = null;
                    return socket.emit("call-error", {
                        message:
                            "You have blocked this user and cannot call them.",
                    });
                }
                if (
                    receiverSettings["privacySettings.blockedUsers"].includes(
                        userId
                    )
                ) {
                    await delAsync(callKey);
                    await delAsync(participantsKey);
                    socket.leave(callKey);
                    socket.callKey = null;
                    return socket.emit("call-error", {
                        message:
                            "You are blocked by this user and cannot call them.",
                    });
                }
            }

             // Kiểm tra xem callee có đang trong cuộc gọi khác
            for (const participantId of participantIds) {
                const userCalls = await getKeysAsync(`call:*:participants`);
                for (const call of userCalls) {
                    const isInCall = await sIsMemberAsync(call, participantId);
                    if (isInCall) {
                        await delAsync(callKey);
                        await delAsync(participantsKey);
                        socket.leave(callKey);
                        socket.callKey = null;
                        return socket.emit("call-error", {
                            message: "One or more participants are already in another call.",
                        });
                    }
                }
            }

            let isAnyParticipantOnline = false;

            // Gửi call-incoming cho người online
            for (const participantId of participantIds) {
                const isOnline = await getAsync(`user:${participantId}:status`);
                if (isOnline) {
                    isAnyParticipantOnline = true;
                    socket.to(participantId).emit("call-incoming", {
                        initiatorId: userId,
                        conversationId,
                        callId: callKey,
                        callType,
                    });
                }
            }

            // Thông báo cho caller rằng call-incoming đã được gửi
            if (isAnyParticipantOnline) {
                socket.emit("call-incoming-sent", { conversationId });
                console.log(
                    `Sent call-incoming-sent to caller ${userId} for conversation ${conversationId}`
                );
            }

            console.log(`call type: ${callType}`);

            // Gửi thông báo push cho tất cả người tham gia
            await sendMulticastNotification(participantIds, {
                type: "call",
                title: `Incoming ${
                    callType === "video" ? "Video" : "Voice"
                } Call`,
                body: `Call from ${callerName}`,
                data: {
                    call_id: callKey,
                    caller_name: callerName,
                    caller_id: userId,
                    conversation_id: conversationId,
                    avatar_url: callerAvatar,
                    call_type: callType || "voice",
                },
            });

            console.log(`📞 ${userId} started call in ${conversationId}`);
        } catch (err) {
            socket.emit("call-error", {
                message: "Failed to start call: Conversation not found",
            });
            await delAsync(callKey);
            await delAsync(participantsKey);
            console.error(
                `Error starting call in ${conversationId}: ${err.message}`
            );
            return;
        }

        const timeout = setTimeout(async () => {
            const stillExists = await existsAsync(callKey);
            if (stillExists) {
                await delAsync(callKey);
                await delAsync(participantsKey);
                activeCalls.delete(conversationId);

                let conversationMembers;
                try {
                    conversationMembers =
                        await ConversationService.getAllParticipants(
                            conversationId
                        );
                } catch (err) {
                    console.error(
                        `Error fetching conversation members: ${err.message}`
                    );
                    socket.emit("call-error", {
                        message: "Failed to fetch conversation details",
                    });
                    return;
                }
                const isOneToOne = conversationMembers.length === 2;

                try {
                    const message = {
                        conversationId,
                        senderId: userId,
                        content: `Missed ${
                            callType === "video" ? "video" : "voice"
                        } call`,
                        status: "sent",
                        type: "call",

                        callData: {
                            callType: callType || "voice",
                            duration: 0,
                            participants: [userId],
                        },
                        timestamp: Date.now(),
                    };

                    const savedMessage = await messageService.createMessage(
                        message
                    );

                    await callService.createCall({
                        conversation: conversationId,
                        participants: [userId],
                        type: callType || "voice",
                        status: "missed",
                        duration: 0,
                        caller: userId,
                    });

                    emitToConversation({
                        io,
                        socket,
                        msg: savedMessage,
                    });

                    console.log(
                        `Saved missed call message for conversation ${conversationId}`
                    );
                } catch (err) {
                    console.error(
                        `Error saving missed call message: ${err.message}`
                    );
                }

                for (const participant of conversationMembers) {
                    const participantId = participant._id.toString();
                    if (participantId !== userId) {
                        io.to(participantId).emit("call-ended", {
                            userId,
                            conversationId,
                            callId: callKey,
                            reason: "timeout",
                        });
                        console.log(
                            `Sent call-ended to participant ${participantId} for timeout in ${conversationId}`
                        );
                    }
                }

                socket.emit("call-ended", {
                    reason: "timeout",
                });

                // Rời phòng callKey cho tất cả socket
                const room = io.sockets.adapter.rooms.get(callKey);
                if (room) {
                    for (const socketId of room) {
                        const socket = io.sockets.sockets.get(socketId);
                        if (socket) {
                            socket.leave(callKey);
                            socket.callKey = null;
                            console.log(
                                `Socket ${socketId} left callKey ${callKey}`
                            );
                        }
                    }
                }
                console.log(
                    `Call for conversation ${conversationId} ended due to timeout.`
                );
            }
        }, 60000);

        activeCalls.set(conversationId, timeout);
    });

    // Chấp nhận cuộc gọi và tham gia callKey
    socket.on("accept-call", async ({ conversationId, toUserId }) => {
        console.log(
            `User ${userId} accepted call in conversation ${conversationId}`
        );

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

        // Tham gia callKey thay vì conversationId
        socket.join(callKey);
        socket.callKey = callKey;

        await updateStartTimeAsync({ callKey });
        await sAddAsync(participantsKey, userId);

        // Hủy timer khi cuộc gọi được chấp nhận
        const timeout = activeCalls.get(conversationId);
        if (timeout) {
            clearTimeout(timeout);
            activeCalls.delete(conversationId);
            console.log(`Cancelled timeout for call ${conversationId}`);
        }

        io.to(callKey).emit("user-joined-call", { userId });
        io.to(toUserId).emit("call-accepted", { toUserId: userId });
        console.log(`✅ ${userId} accepted call in ${conversationId}`);
    });

    // Từ chối cuộc gọi
    socket.on("reject-call", ({ conversationId }) => {
        const timeout = activeCalls.get(conversationId);
        if (timeout) {
            clearTimeout(timeout);
            activeCalls.delete(conversationId);
            console.log(`Cancelled timeout for call ${conversationId}`);
        }

        io.to(`call:${conversationId}`).emit("call-rejected", { userId });
        console.log(`❌ ${userId} rejected call in ${conversationId}`);
    });

    // Kết thúc cuộc gọi
    socket.on("end-call", async ({ conversationId }) => {
        const callKey = `call:${conversationId}`;
        const participantsKey = `call:${conversationId}:participants`;

        if (!(await existsAsync(callKey))) return;

        const timeout = activeCalls.get(conversationId);
        if (timeout) {
            clearTimeout(timeout);
            activeCalls.delete(conversationId);
            console.log(`Cancelled timeout for call ${conversationId}`);
        }

        const endTime = new Date();
        const callData = await hGetAllAsync(callKey);
        const startTime = new Date(callData.startTime);
        const duration = Math.round((endTime - startTime) / 1000);
        const callType = callData.callType || "voice";

        const participants = await sMembersAsync(participantsKey);

        let conversationMembers;
        try {
            conversationMembers = await ConversationService.getAllParticipants(
                conversationId
            );
        } catch (err) {
            console.error(
                `Error fetching conversation members: ${err.message}`
            );
            socket.emit("call-error", {
                message: "Failed to fetch conversation details",
            });
            return;
        }

        const room = io.sockets.adapter.rooms.get(callKey);
        const count = room ? room.size : 0;

        const isOneToOne = conversationMembers.length === 2;

        if (count === 1) {
            await delAsync(callKey);
            await delAsync(participantsKey);

            try {
                const message = {
                    conversationId,
                    senderId: callData.initiator,
                    content: `Missed ${
                        callType === "video" ? "video" : "voice"
                    } call`,
                    timestamp: endTime.getTime(),
                    status: "sent",
                    type: "call",
                    callData: {
                        callType: callType || "voice",
                        duration: 0,
                        participants: [userId],
                    },
                };

                const savedMessage = await messageService.createMessage(
                    message
                );

                await callService.createCall({
                    conversation: conversationId,
                    participants: [userId],
                    type: callType || "voice",
                    status: "missed",
                    duration: 0,
                    caller: userId,
                });

                await emitToConversation({
                    io,
                    socket,
                    msg: savedMessage,
                });

                console.log(
                    `Saved missed call message for conversation ${conversationId}`
                );
            } catch (err) {
                console.error(`Error saving call message: ${err.message}`);
            }

            for (const participant of conversationMembers) {
                const participantId = participant._id.toString();
                console.log(`Participant ID: ${participantId}`);
                if (participantId !== userId) {
                    io.to(participantId).emit("call-ended", {
                        userId,
                        conversationId,
                        callId: callKey,
                        reason: "user-ended",
                    });
                    console.log(`🛑 ${participantId} ended call in ${callKey}`);
                }
            }

            // Gửi call-ended đến caller
            io.to(callKey).emit("call-ended", {
                userId,
                conversationId,
                reason: "user-ended",
            });
            // Rời phòng callKey
            socket.leave(callKey);
            socket.callKey = null;
            console.log(`user ${userId} left callKey ${callKey}`);
            return;
        }
        if (isOneToOne) {
            await delAsync(callKey);
            await delAsync(participantsKey);
            activeCalls.delete(conversationId);

            try {
                const message = {
                    conversationId,
                    senderId: callData.initiator,
                    content: `${
                        callType === "video" ? "Video" : "Voice"
                    } call (${formatDuration(duration)})`,
                    timestamp: endTime.getTime(),
                    status: "sent",
                    type: "call",
                    callData: {
                        callType: callType || "voice",
                        duration,
                        participants,
                    },
                };

                const savedMessage = await messageService.createMessage(
                    message
                );

                await callService.createCall({
                    conversation: conversationId,
                    participants: participants,
                    type: callType || "voice",
                    status: "completed",
                    duration: duration,
                    caller: userId,
                });

                await emitToConversation({
                    io,
                    socket,
                    msg: savedMessage,
                });

                console.log(
                    `Saved call message for conversation ${conversationId}`
                );
            } catch (err) {
                console.error(`Error saving call message: ${err.message}`);
            }

            io.to(callKey).emit("call-ended", {
                userId,
                conversationId,
                reason: "user-ended",
            });
            console.log(`🛑 ${userId} ended 1:1 call in ${conversationId}`);
        } else {
            await sRemAsync(participantsKey, userId);
            const remainingParticipants = await sCardAsync(participantsKey);

            if (remainingParticipants === 0) {
                await delAsync(callKey);
                await delAsync(participantsKey);
                activeCalls.delete(conversationId);

                try {
                    const message = {
                        conversationId,
                        senderId: callData.initiator,
                        content: `${
                            callType === "video" ? "Video" : "Voice"
                        } call (${formatDuration(duration)})`,
                        timestamp: endTime.getTime(),
                        status: "sent",
                        type: "call",
                        callData: {
                            callType: callType || "voice",
                            duration,
                            participants: [userId],
                        },
                    };

                    const savedMessage = await messageService.createMessage(
                        message
                    );
                    await callService.createCall({
                        conversation: conversationId,
                        participants: [userId],
                        type: callType || "voice",
                        status: "completed",
                        duration: duration,
                        caller: userId,
                    });

                    await emitToConversation({
                        io,
                        socket,
                        msg: savedMessage,
                    });

                    console.log(
                        `Saved call message for conversation ${conversationId}`
                    );
                } catch (err) {
                    console.error(`Error saving call message: ${err.message}`);
                }

                io.to(callKey).emit("call-ended", {
                    userId,
                    conversationId,
                    reason: "no-participants",
                });
                console.log(
                    `🛑 Call in ${conversationId} ended due to no participants`
                );
            } else {
                io.to(callKey).emit("user-left-call", {
                    userId,
                    conversationId,
                });
                console.log(
                    `🚶 ${userId} left group call in ${conversationId}`
                );
            }
        }

        // Rời phòng callKey cho tất cả socket
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
    });

    // Gửi offer WebRTC
    socket.on("call-offer", ({ toUserId, offer }) => {
        socket.to(toUserId).emit("call-offer", {
            fromUserId: userId,
            offer,
        });
        console.log(
            `Sent call-offer from ${userId} to ${toUserId}: ${JSON.stringify(
                offer
            )}`
        );
    });

    // Gửi answer WebRTC
    socket.on("call-answer", ({ toUserId, answer }) => {
        console.log(
            `Sent call-answer from ${userId} to ${toUserId}: ${JSON.stringify(
                answer
            )}`
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
            `Sent ICE candidate from ${userId} to ${toUserId}: ${JSON.stringify(
                candidate
            )}`
        );
    });
};

// Hàm định dạng thời gian
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
