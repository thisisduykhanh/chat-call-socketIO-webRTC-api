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


    async deleteMessage(messageId) {
        const message = await Message.findByIdAndDelete(messageId);
        if (!message) {
            throw CreateError.NotFound("Message not found.");
        }
        return { success: true, message: "Message deleted successfully." };
    }


    // async reactToMessage(messageId, userId, type) {
    //     const message = await Message.findById(messageId);
    //     if (!message) {
    //         throw CreateError.NotFound("Message not found.");
    //     }

    //     // Cập nhật hoặc thêm reaction
    //     const existingReactionIndex = message.reactions.findIndex(
    //         (r) => r.user.toString() === userId
    //     );

    //     if (existingReactionIndex !== -1) {
    //         message.reactions[existingReactionIndex].type = type;
    //     } else {
    //         message.reactions.push({ user: userId, type });
    //     }

    //     return await message.save();
    // }

    
}

module.exports = new MessageService();
