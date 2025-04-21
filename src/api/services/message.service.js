const Message = require("@/models/message.model");
const Conversation = require("@/models/conversation.model");
const CreateError = require("http-errors");
const conversationService = require("@/services/conversation.service");

class MessageService {

    async createMessage({ senderId, receiverId = null, conversationId = null, content, ...rest }) {
        let conversation;
    
        if (conversationId) {
            // 🟦 Nhắn nhóm — conversation đã có
            conversation = await Conversation.findById(conversationId);

            if (!conversation) throw new CreateError.NotFound("Conversation not found");
        } else if (receiverId) {
            // 🟩 1:1 — Tìm hoặc tạo conversation giữa 2 người
            conversation = await conversationService.getOrCreateOneToOneConversation(senderId, receiverId);
        } else {
            throw new CreateError.BadRequest("Missing receiverId or conversationId");
        }
    
        const message = new Message({
            conversation: conversation._id,
            sender: senderId,
            receiver: receiverId || null,
            content,
            ...rest,
        });

        conversation.lastMessage = message._id;
        await message.save();
        await conversation.save();
    
        return message;
    }
    

    async getMessages(conversationId) {

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw CreateError.NotFound("Conversation not found.");
        }

        const messages = await Message.find({ conversation: conversationId })
        .sort({ createdAt: 1 });

        return messages;
    }


    async deleteMessage(messageId, userId) {
        const message = await Message.findById(messageId);
        if (!message || !message.sender.equals(userId)) {
            throw CreateError.NotFound("Message not found.");
        }

        if(message.isDeletedForEveryone) {
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

        if (!message.sender.equals(userId)) throw CreateError.Forbidden("You are not allowed to edit this message.");

        if (!message.isEdited) {
            message.originalContent = message.content;
        }

        message.content = newContent;
        message.isEdited = true;
        message.editedAt = new Date();
        
        return await message.save();
    }

    
}

module.exports = new MessageService();
