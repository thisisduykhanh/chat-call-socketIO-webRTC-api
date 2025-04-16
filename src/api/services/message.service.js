const Message = require("@/models/message.model");
const Conversation = require("@/models/conversation.model");
const CreateError = require("http-errors");


class MessageService {
    async createMessage({ conversationId, sender, receiver, type, content }) {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw CreateError.NotFound("Conversation not found.");
        }

        const message = new Message({
            conversation: conversationId,
            sender,
            receiver,
            type,
            content,
        });

        const savedMessage = await message.save();

        return savedMessage;
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
