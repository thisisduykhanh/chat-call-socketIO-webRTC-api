const Message = require("@/models/message.model");
const Conversation = require("@/models/conversation.model");
const CreateError = require("http-errors");
const conversationService = require("@/services/conversation.service");
const { handleFileUpload } = require("~/api/middleware/upload.middeware");

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
                throw new CreateError.Forbidden('You are not a participant in this conversation');
              }

              if (conversation.participants.length === 2) {
                const receiver = conversation.participants.find(
                  (p) => p.user && p.user._id.toString() !== senderId.toString()
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

        if (type === 'location' && (!location || !location.lat || !location.lng)) {
            throw new CreateError.BadRequest('Invalid location data');
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

        conversation.lastMessage = message._id;

        await Promise.all([message.save(), conversation.save()]);

        await message.populate([
            { path: 'receiver', select: 'name avatarUrl' },
            { path: 'sender', select: 'name avatarUrl' },
            { path: 'conversation', select: 'name avatar' }
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
        if (!message || !message.sender.equals(userId)) {
            throw CreateError.NotFound("Message not found.");
        }

        if (message.isDeletedForEveryone) {
            throw CreateError.NotFound("Message already deleted.");
        }

        message.isDeletedForEveryone = true;

        await message.save();

        return { success: true, message: "Message deleted successfully." };
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

    async getMessagesByConversationId({ conversationId, receiverId, userId }) {
        let conversation;

        if (receiverId) {
            conversation = await Conversation.findOne({
                'participants.user': { $all: [userId, receiverId] },
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
                (p) => p.user && p.user._id === userId
            );

            if (isInConversation) {
                throw CreateError.Forbidden(
                    "You are not a member of this conversation."
                );
            }
        }

        const messages = await Message.find({ conversation: conversation._id })
            .sort({ createdAt: 1 })
            .populate({
                path: "sender",
                select: "avatarUrl name", // CHỈ lấy trường avatar
            });

        return messages;
    }

    async updateStatusWhenInRoom(receivers, messageId) {
        return await Message.findOneAndUpdate(
            { _id: messageId },
            {
                $addToSet: {
                    seenBy: {
                        $each: receivers.map(userId => ({ user: userId, seenAt: new Date() }))
                    }
                },
                $set: { status: 'seen' }
            },
            { new: true }
        );
        
    }
}

module.exports = new MessageService();
