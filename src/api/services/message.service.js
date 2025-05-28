const Message = require("@/models/message.model");
const Conversation = require("@/models/conversation.model");
const CreateError = require("http-errors");
const conversationService = require("@/services/conversation.service");
const UserSettingsService = require("@/services/user.settings.service");

const { rPushAsync, setAsync } = require("~/config/redis");

class MessageService {
    async createMessage({
        senderId,
        receiverId = null,
        conversationId = null,
        content,
        files = [],
        type,
        location = null,
        ...rest
    }) {
        let conversation;

        if (conversationId) {
            console.log("Conversation ID:", conversationId);
            conversation = await Conversation.findById(conversationId);

            if (!conversation)
                throw new CreateError.NotFound("Conversation not found");

            const isParticipant = conversation.participants.some(
                (p) => p.user && p.user._id.toString() === senderId.toString()
            );

            if (!isParticipant) {
                throw new CreateError.Forbidden(
                    "You are not a participant in this conversation"
                );
            }

            if (conversation.participants.length === 2) {
                const receiver = conversation.participants.find(
                    (p) =>
                        p.user && p.user._id.toString() !== senderId.toString()
                );
                if (receiver) {
                    receiverId = receiver.user._id;
                }
            }
        } else if (receiverId) {
            console.log("Receiver ID:", receiverId);
            conversation =
                await conversationService.getOrCreateOneToOneConversation(
                    senderId,
                    receiverId
                );
        } else {
            throw new CreateError.BadRequest(
                "Missing receiverId or conversationId"
            );
        }

        if (conversation.participants.length === 2 && receiverId) {
            const senderSettings = await UserSettingsService.getSetting(
                senderId,
                "privacySettings.blockedUsers"
            );
            const receiverSettings = await UserSettingsService.getSetting(
                receiverId,
                "privacySettings.blockedUsers"
            );

            if (
                senderSettings["privacySettings.blockedUsers"].includes(
                    receiverId.toString()
                )
            ) {
                throw new CreateError.Forbidden(
                    "You have blocked this user and cannot send messages to them"
                );
            }
            if (
                receiverSettings["privacySettings.blockedUsers"].includes(
                    senderId.toString()
                )
            ) {
                throw new CreateError.Forbidden(
                    "You are blocked by this user and cannot send messages to them"
                );
            }
        }

        if (
            type === "location" &&
            (!location || !location.lat || !location.lng)
        ) {
            throw new CreateError.BadRequest("Invalid location data");
        }

        const messageData = {
            conversation: conversation._id,
            sender: senderId,
            receiver: receiverId || null,
            content,
            location,
            type,
            ...rest,
        };

        if (files.length > 0) {
            messageData.media = files;
        }

        const message = new Message(messageData);

        conversation.lastMessageMap = conversation.lastMessageMap || new Map();

        if (!(conversation.lastMessageMap instanceof Map)) {
            conversation.lastMessageMap = new Map(
                Object.entries(conversation.lastMessageMap)
            );
        }

        for (const p of conversation.participants) {
            conversation.lastMessageMap.set(p.user.toString(), message._id);
        }

        conversation.lastMessageMap = Object.fromEntries(
            conversation.lastMessageMap
        );

        await Promise.all([message.save(), conversation.save()]);

        await message.populate([
            { path: "receiver", select: "name avatarUrl" },
            { path: "sender", select: "name avatarUrl" },
            { path: "conversation", select: "name avatar" },
            { path: "replyTo", select: "content sender" },
        ]);

        return message;
    }

    async getMessages(conversationId) {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw CreateError.NotFound("Conversation not found.");
        }

        const messages = await Message.find({
            conversation: conversationId,
        }).sort({ createdAt: 1 });

        return messages;
    }

    async deleteMessage(messageId, userId) {
        const message = await Message.findById(messageId);
        if (!message) {
            throw CreateError.NotFound("Message not found.");
        }

        if (message.deletedFor.includes(userId)) {
            throw CreateError.NotFound("Message already deleted.");
        }

        message.deletedFor.push(userId);
        await message.save();

        const conversation = await Conversation.findById(message.conversation);
        if (!conversation) {
            throw CreateError.NotFound("Conversation not found.");
        }

        let lastMessageIdForUser;

        if (conversation.lastMessageMap instanceof Map) {
            lastMessageIdForUser = conversation.lastMessageMap
                .get(userId.toString())
                ?.toString();
        } else {
            lastMessageIdForUser =
                conversation.lastMessageMap?.[userId.toString()]?.toString();
        }

        let newLastMessage = null;

        console.log("Last message ID for user:", lastMessageIdForUser);

        if (lastMessageIdForUser === messageId.toString()) {
            const lastMessageForUser = await Message.findOne({
                conversation: conversation._id,
                _id: { $ne: message._id },
                deletedFor: { $ne: userId },
            })
                .sort({ createdAt: -1 })
                .populate({ path: "sender", select: "username avatarUrl name" })
                .lean();

            // Cập nhật lại lastMessageMap
            const map = new Map(
                conversation.lastMessageMap instanceof Map
                    ? conversation.lastMessageMap.entries()
                    : Object.entries(conversation.lastMessageMap || {})
            );

            map.set(
                userId.toString(),
                lastMessageForUser ? lastMessageForUser._id : null
            );
            conversation.lastMessageMap = Object.fromEntries(map);

            await conversation.save();

            newLastMessage = lastMessageForUser || null;
        }

        return {
            success: true,
            message,
            lastMessage: newLastMessage,
        };
    }

    async recallMessage({ messageId, userId }) {
        const message = await Message.findById(messageId);
        if (!message) {
            throw CreateError.NotFound("Message not found.");
        }
        if (!message.sender.equals(userId)) {
            throw CreateError.Forbidden(
                "You are not allowed to recall this message."
            );
        }
        if (message.isDeletedForEveryone) {
            throw CreateError.NotFound("Message already recalled.");
        }
        message.isDeletedForEveryone = true;
        message.content = "This message has been recalled.";
        message.status = "recalled";
        message.media = []; // Xóa tất cả media
        message.type = "text"; // Đặt lại type về 'text'
        await message.save();
        return { success: true, message };
    }

    async updateMessageContent(messageId, userId, newContent) {
        const message = await Message.findById(messageId);
        if (!message) {
            throw CreateError.NotFound("Message not found.");
        }

        if (!message.sender.equals(userId))
            throw CreateError.Forbidden(
                "You are not allowed to edit this message."
            );

        if (!message.isEdited) {
            message.originalContent = message.content;
        }

        message.content = newContent;
        message.isEdited = true;
        message.editedAt = new Date();

        return await message.save();
    }

    async getMessagesByConversationId({
        conversationId,
        receiverId,
        userId,
        cursor,
        limit = 50,
    }) {
        let conversation;

        if (receiverId) {
            conversation = await Conversation.findOne({
                "participants.user": { $all: [userId, receiverId] },
                $expr: { $eq: [{ $size: "$participants" }, 2] },
                isGroup: false,
            });
            if (!conversation) {
                throw CreateError.NotFound("Conversation not found.");
            }
        } else {
            conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw CreateError.NotFound("Conversation not found.");
            }

            const isInConversation = conversation.participants.some(
                (p) => p.user && p.user.toString() === userId
            );

            if (!isInConversation) {
                throw CreateError.Forbidden(
                    "You are not a member of this conversation."
                );
            }
        }

        const query = {
            conversation: conversation._id,
            deletedFor: { $ne: userId },
        };
        if (cursor) {
            console.log("Cursor:", cursor);
            query._id = { $lt: cursor }; // Lấy các tin nhắn có _id lớn hơn cursor
        }

        console.log("limit:", limit);

        limit = Number(limit);
        if (Number.isNaN(limit) || limit < 1) limit = 50;

        const messages = await Message.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate([
                {
                    path: "sender",
                    select: "avatarUrl name",
                },
                {
                    path: "replyTo",
                    select: "content sender",
                },
            ]);

        if (!messages || messages.length === 0) {
            throw CreateError.NotFound("No messages found.");
        }

        // Xác định nextCursor
        let nextCursor = null;
        if (messages.length > limit) {
            nextCursor = messages[messages.length - 1]._id.toString();
            messages.pop(); // Xóa tin nhắn thừa (dùng để xác định cursor)
        }

        const totalMessages = await Message.countDocuments({
            conversation: conversation._id,
        });

        console.log("message from db");

        return {
            messages,
            nextCursor,
            total: totalMessages,
        };
    }

    async updateStatusWhenInConversation(receivers, messageId, status) {
        const update = {
            $set: { status },
        };

        // Chỉ cập nhật seenBy nếu là 'seen'
        if (status === "seen") {
            update.$addToSet = {
                seenBy: {
                    $each: receivers.map((userId) => ({
                        user: userId,
                        seenAt: new Date(),
                    })),
                },
            };
        }

        const updatedMessage = await Message.findOneAndUpdate(
            { _id: messageId },
            update,
            { new: true }
        );

        return updatedMessage;
    }

    async getMediaByConversationId(conversationId, userId) {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw CreateError.NotFound("Conversation not found.");
        }

        const messages = await Message.find({
            conversation: conversationId,
            deletedFor: { $ne: userId },
            media: { $exists: true, $ne: [] },
        })
            .sort({ createdAt: -1 })
            .populate("sender", "name");

        if (!messages || messages.length === 0) {
            throw CreateError.NotFound("No media messages found.");
        }

        const mediaSet = new Set();
        const mediaList = [];

        messages.forEach((msg) => {
            if (msg.media && msg.media.length > 0) {
                msg.media.forEach((media) => {
                    if (!mediaSet.has(media.fileUrl.toString())) {
                        mediaSet.add(media.fileUrl.toString());
                        mediaList.push({
                            fileId: media.fileId,
                            type: msg.type,
                            sender: msg.sender.name,
                            fileName: media.fileName,
                            fileSize: media.fileSize,
                            blurHash: media.blurHash,
                            mimeType: media.mimeType,
                            createdAt: msg.createdAt,
                            url: media.fileUrl,
                        });
                    }
                });
            }
        });

        return mediaList;
    }
}

module.exports = new MessageService();
