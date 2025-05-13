const messageService = require("@/services/message.service");
const reactionService = require("@/services/reaction.service");
const pinnedMessageService = require("@/services/pinned.service");
// const reactionService = require('@/services/reaction.service');
const { emitToConversation } = require("~/socket/utils/socket.helpers");

const {sendMulticastNotification} = require("~/utils/sendPushNotification.util");

const ConversationService = require("~/api/services/conversation.service");

module.exports = (socket, io) => {
    socket.on("conversation:join", (conversationId) => {
        socket.join(conversationId);
        console.log(`User ${socket.id} joined conversation ${conversationId}`);
    });

    // socket.on("join-conversation", ({ conversationId }) => {
    //     socket.join(conversationId);
    //     socket.conversationId = conversationId;
    //     io.to(conversationId).emit("user-connected", { userId: socket.user.id });
    //     console.log(`${socket.user.id} joined conversation ${conversationId}`);
    // });

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
                let filesToUpload = [];

                if (files) {
                    filesToUpload = [
                        {
                            buffer: Buffer.from(files),
                            mimetype:
                                type === "image" ? "image/jpeg" : "video/mp4",
                        },
                    ];
                }

                const msg = await messageService.createMessage({
                    senderId: socket.user.id,
                    receiverId,
                    conversationId,
                    content,
                    files: filesToUpload,
                    type,
                    location,
                    ...rest,
                });

                console.log("Message sent:", msg);

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
            await messageService.deleteMessage(messageId, socket.user.id);
            io.emit("message:deleted", { messageId });
        } catch (err) {
            console.error(err);
            socket.emit("error", "Không thể xóa tin nhắn");
        }
    });

    // reaction
    socket.on("message:reaction", async ({ messageId, reaction }) => {
        try {
            await reactionService.createReaction({
                messageId,
                userId: socket.user.id,
                reaction,
            });
            io.emit("message:reacted", { messageId, reaction });
        } catch (err) {
            console.error(err);
            socket.emit("error", "Không thể thêm phản ứng");
        }
    });

    socket.on("message:unreaction", async ({ messageId, reaction }) => {
        try {
            await reactionService.deleteReaction({
                messageId,
                userId: socket.user.id,
            });
            io.emit("message:unreacted", { messageId, reaction });
        } catch (err) {
            console.error(err);
            socket.emit("error", "Không thể bỏ phản ứng");
        }
    });

    socket.on("message:getreaction", async ({ messageId }) => {
        try {
            const reactions = await reactionService.getReactionsForMessage(
                messageId
            );
            socket.emit("message:reactions", { messageId, reactions });
        } catch (err) {
            console.error(err);
            socket.emit("error", "Không thể lấy phản ứng");
        }
    });

    // Ghim tin nhắn
    socket.on("message:pin", async ({ messageId, conversationId }) => {
        try {
            await pinnedMessageService.pinMessage(messageId, socket.user.id);
            io.to(conversationId).emit("message:pinned", { messageId });
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

        const participants = await ConversationService.getAllParticipants(
            conversationId
        );

        for (const participant of participants) {
            const participantId = participant._id.toString();
            if (participantId !== socket.user.id) {
                io.to(participantId).emit("message:typing", {
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

        const participants = await ConversationService.getAllParticipants(
            conversationId
        );

        for (const participant of participants) {
            const participantId = participant._id.toString();
            if (participantId !== socket.user.id) {
                io.to(participantId).emit("message:stopTyping", {
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
};
