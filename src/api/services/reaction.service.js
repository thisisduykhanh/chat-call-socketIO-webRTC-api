const Reaction = require("@/models/reaction.model");
const CreateError = require("http-errors");

class ReactionService {
	async createReaction({ messageId, userId, type }) {
		// Kiểm tra nếu user đã reaction cho message này chưa
		const existingReaction = await Reaction.findOne({
			message: messageId,
			user: userId,
		});
		if (existingReaction) {
			throw CreateError.BadRequest("User has already reacted to this message.");
		}

		// Tạo mới reaction
		const reaction = new Reaction({
			message: messageId,
			user: userId,
			type,
		});

		const savedReaction = await reaction.save();
		return savedReaction;
	}

	// Lấy tất cả reactions cho một message
	async getReactionsForMessage(messageId) {
		const reactions = await Reaction.find({ message: messageId }).populate(
			"user",
			"username",
		); // Giả sử bạn muốn lấy tên người dùng
		return reactions;
	}

	// Xóa reaction của user trên message
	async deleteReaction({ messageId, userId }) {
		const deletedReaction = await Reaction.findOneAndDelete({
			message: messageId,
			user: userId,
		});
		if (!deletedReaction) {
			throw CreateError.NotFound("Reaction not found.");
		}
		return deletedReaction;
	}
}

module.exports = new ReactionService();
