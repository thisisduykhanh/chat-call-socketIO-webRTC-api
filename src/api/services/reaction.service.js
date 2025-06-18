const CreateError = require("http-errors");
const Message = require("@/models/message.model");

class ReactionService {
    async toggleReaction({ messageId, userId, type }) {
        const message = await Message.findById(messageId).populate(
            "reactions.user",
            "username avatar name"
        ); // ✅ Thêm dòng này

        if (!message) return CreateError(404, "Message not found");

        const existingReactionIndex = message.reactions.findIndex(
            (r) => r.user._id.toString() === userId // ✅ Vì giờ r.user là object đã populate
        );

        if (existingReactionIndex !== -1) {
            const existingReaction = message.reactions[existingReactionIndex];

            if (existingReaction.type === type) {
                // Nếu đã thả cùng loại → gỡ reaction
                message.reactions.splice(existingReactionIndex, 1);
                await message.save();
            } else {
                // Nếu đã thả nhưng khác loại → cập nhật
                message.reactions[existingReactionIndex].type = type;
                await message.save();
            }
        } else {
            // Nếu chưa thả → thêm mới
            message.reactions.push({ user: userId, type });
            await message.save();
        }

        // ✅ Populate lại sau khi thay đổi (vì .save() không tự populate lại)
        return await Message.findById(message._id).populate(
            "reactions.user",
            "username avatar name"
        );
    }
}

module.exports = new ReactionService();
