const messageService = require("@/services/message.service");
const pinnedMessageService = require("@/services/pinned.service");
const { emitToConversation } = require("~/socket/utils/socket.helpers");

const ConversationService = require("~/api/services/conversation.service");

const ReactionService = require("~/api/services/reaction.service");

const UserSettingsService = require("~/api/services/user.settings.service");

module.exports = (socket, io) => {
    async function broadcastReadStatus(conversationId, userId) {
        const messages = await ConversationService.markMessagesAsRead(
            conversationId,
            userId
        );

        if (messages.length > 0) {
            const participants = await ConversationService.getAllParticipants(
                conversationId
            );

            for (const participant of participants) {
                socket
                    .to(participant._id.toString())
                    .emit("conversation:updateMessageStatus", {
                        messages,
                        conversationId,
                    });
            }

            console.log(
                `Updated message status for conversation ${conversationId} for user ${userId}`
            );
        }
    }

    socket.on("conversation:markAsRead", async (conversationId) => {
        await broadcastReadStatus(conversationId, socket.user.id);
    });

    socket.on("conversation:join", async (conversationId) => {
        socket.join(conversationId);

        await broadcastReadStatus(conversationId, socket.user.id);

        console.log(
            `User ${socket.user.id} joined conversation ${conversationId}`
        );
    });

    socket.on("conversation:leave", async (conversationId) => {
        await ConversationService.updateLastSeen(
            conversationId,
            socket.user.id
        );
        socket.leave(conversationId);

        console.log(
            `User ${socket.user.id} left conversation ${conversationId}`
        );
    });

    socket.on("receiver:join", (conversationId) => {
        socket.join(conversationId);
        console.log(
            `User ${socket.id} joined 1:1 conversation ${conversationId}`
        );
    });

    socket.on(
        "message:send",
        async ({
            tempId,
            receiverId,
            conversationId,
            content,
            files,
            type,
            location,
            ...rest
        }) => {
            try {
                const msg = await messageService.createMessage({
                    senderId: socket.user.id,
                    receiverId,
                    conversationId,
                    content,
                    files,
                    type,
                    location,
                    ...rest,
                });

                await emitToConversation({
                    io,
                    socket,
                    msg,
                    tempId: tempId,
                });
            } catch (err) {
                console.error("Send message error:", err.message);
                socket.emit("error", { message: err.message });
            }
        }
    );

    // remove message
    socket.on("message:delete", async ({ messageId }) => {
        try {
            const { message, lastMessage } = await messageService.deleteMessage(
                messageId,
                socket.user.id
            );
            socket.emit("message:deleted", {
                messageId: message._id,
                lastMessage,
                conversationId: message.conversation._id,
            });
            console.log(
                `Message ${messageId} deleted by user ${socket.user.id}`
            );

            console.log(`Last message after deletion: ${lastMessage}`);
        } catch (err) {
            console.error(err);
            socket.emit("error", "Không thể xóa tin nhắn");
        }
    });

    socket.on("message:recall", async ({ messageId }) => {
        try {
            const { message } = await messageService.recallMessage({
                messageId,
                userId: socket.user.id,
            });

            const participants = await ConversationService.getAllParticipants(
                message.conversation._id.toString()
            );

            for (const participant of participants) {
                const participantId = participant._id.toString();

                if (participantId === socket.user.id) {
                    socket.emit("message:recalled", {
                        message: message,
                    });
                    continue; // Skip the sender
                }

                socket.to(participantId).emit("message:recalled", {
                    message: message,
                });
                console.log(
                    `Sent message to participant ${participantId} in conversation ${message.conversation._id.toString()}`
                );
            }
        } catch (err) {
            console.error(err);
            socket.emit("error", "Không thể thu hồi tin nhắn");
        }
    });

    // reaction
    socket.on("message:reaction", async ({ messageId, type }) => {
        try {
            const message = await ReactionService.toggleReaction({
                messageId,
                userId: socket.user.id,
                type: type,
            });


            const participants = await ConversationService.getAllParticipants(
                message.conversation._id.toString()
            );

            for (const participant of participants) {
                const participantId = participant._id.toString();

                if (participantId === socket.user.id) {
                    socket.emit("message:reacted", {
                        message: message,
                    });
                    continue; // Skip the sender
                }

                socket.to(participantId).emit("message:reacted", {
                    message: message,
                });
                console.log(
                    `Sent message to participant ${participantId} in conversation ${message.conversation._id.toString()}`
                );
            }
        } catch (err) {
            console.error(err);
            socket.emit("error", "Không thể thêm phản ứng");
        }
    });

    // Ghim tin nhắn
    socket.on("message:pin", async ({ messageId, conversationId }) => {
        try {
            await pinnedMessageService.pinMessage(messageId, socket.user.id);
            socket.to(conversationId).emit("message:pinned", { messageId });
        } catch (err) {
            socket.emit("error", "Không thể ghim tin nhắn");
        }
    });

    socket.on("message:unpin", async ({ messageId, conversationId }) => {
        try {
            await pinnedMessageService.unpinMessage({
                messageId,
                conversationId,
            });
            io.to(conversationId).emit("message:unpinned", { messageId });
        } catch (err) {
            socket.emit("error", "Không thể bỏ ghim tin nhắn");
        }
    });

    socket.on("message:getpin", async ({ conversationId }) => {
        try {
            const pinnedMessages = await pinnedMessageService.getPinnedMessages(
                conversationId
            );
            socket.emit("pinnedMessages", pinnedMessages);
        } catch (err) {
            socket.emit("error", "Không thể lấy tin nhắn đã ghim");
        }
    });

    socket.on("message:typing", async ({ conversationId }) => {
        // Broadcast to other users in the conversation

        if (!conversationId) {
            console.error("Conversation ID is required");
            return;
        }

        const participants = await ConversationService.getAllParticipants(
            conversationId
        );

        for (const participant of participants) {
            const participantId = participant._id.toString();
            if (participantId !== socket.user.id) {
                const participantSettings =
                    await UserSettingsService.getSetting(
                        participantId,
                        "privacySettings.typingStatus"
                    );

                console.log("participantSettings:", participantSettings);

                // Check if the participant has typing status enabled
                if (
                    participantSettings &&
                    participantSettings["privacySettings.typingStatus"] ===
                        false
                ) {
                    console.log(
                        `Typing status is off for user ${participantId}, not sending typing notification`
                    );
                    continue;
                }

                socket.to(participantId).emit("message:typing", {
                    userId: socket.user.id,
                    conversationId,
                });
                console.log(
                    `Sent message to participant ${participantId} in conversation ${conversationId}`
                );
            }
        }

        console.log(
            `User ${socket.user.id} is typing in conversation ${conversationId}`
        );
    });

    // Handle stopTyping event
    socket.on("message:stopTyping", async ({ conversationId }) => {
        // Broadcast to other users in the conversation
        if (!conversationId) {
            console.error("Conversation ID is required");
            return;
        }

        const participants = await ConversationService.getAllParticipants(
            conversationId
        );

        for (const participant of participants) {
            const participantId = participant._id.toString();
            if (participantId !== socket.user.id) {
                socket.to(participantId).emit("message:stopTyping", {
                    userId: socket.user.id,
                    conversationId,
                });
                console.log(
                    `Sent message to participant ${participantId} in conversation ${conversationId}`
                );
            }
        }

        console.log(
            `User ${socket.user.id} stopped typing in conversation ${conversationId}`
        );
    });

    socket.on(
        "message:forward",
        async ({ messageId, conversationId, tempId }) => {
            try {
                const message = await messageService.forwardMessage({
                    messageId,
                    conversationId,
                    userId: socket.user.id,
                });

                if (message) {
                    emitToConversation({
                        io,
                        socket,
                        msg: message,
                        tempId: tempId,
                    });
                } else {
                    socket.emit("error", "Không thể chuyển tiếp tin nhắn");
                }
            } catch (err) {
                console.error(err);
                socket.emit("error", "Không thể chuyển tiếp tin nhắn");
            }
        }
    );
};
