const PinnedMessage = require("@/models/pinned.model");
const CreateError = require("http-errors");

class PinnedMessageService {
	async pinMessage(conversationId, messageId, userId) {
		const pinnedMessage = await PinnedMessage.findOne({
			conversationId,
			messageId,
		});
		if (pinnedMessage) {
			throw new CreateError.Conflict("Message already pinned.");
		}

		const newPinnedMessage = new PinnedMessage({
			conversationId,
			messageId,
			pinnedBy: userId,
		});

		return await newPinnedMessage.save();
	}

	async unpinMessage({ conversationId, messageId }) {
		const pinnedMessage = await PinnedMessage.findOneAndDelete({
			conversationId,
			messageId,
		});

		if (!pinnedMessage) {
			throw new CreateError.NotFound("Pinned message not found.");
		}

		return { success: true, message: "Message unpinned successfully." };
	}

	async getPinnedMessages(conversationId) {
		return await PinnedMessage.find({ conversationId }).populate("messageId");
	}
}

module.exports = new PinnedMessageService();
