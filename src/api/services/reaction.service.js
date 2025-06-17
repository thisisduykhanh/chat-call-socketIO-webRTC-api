const CreateError = require("http-errors");
const Message = require("@/models/message.model");

class ReactionService {
    async toggleReaction({ messageId, userId, type }) {
        const message = await Message.findById(messageId);
        if (!message)
            return CreateError(404, "Message not found");

        const existingReactionIndex = message.reactions.findIndex(
            (r) => r.user.toString() === userId
        );

        if (existingReactionIndex !== -1) {
            const existingReaction = message.reactions[existingReactionIndex];

            if (existingReaction.type === type) {
                // Nếu đã thả cùng loại → gỡ reaction
                message.reactions.splice(existingReactionIndex, 1);
                await message.save();
                return message;
            } else {
                // Nếu đã thả nhưng khác loại → cập nhật
                message.reactions[existingReactionIndex].type = type;
                await message.save();
                return message;
            }
        } else {
            // Nếu chưa thả → thêm mới
            message.reactions.push({ user: userId, type });
            await message.save();
            return message;
        }
    }

}

module.exports = new ReactionService();
