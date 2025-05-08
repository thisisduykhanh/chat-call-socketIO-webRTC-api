const Conversation = require("@/models/conversation.model");

class ConversationService {
	async getOrCreateOneToOneConversation(userAId, userBId) {
		const existing = await Conversation.findOne({
			isGroup: false,
			participants: { $all: [userAId, userBId], $size: 2 },
		});

		if (existing) return existing;

		const newConversation = new Conversation({
			isGroup: false,
			participants: [userAId, userBId],
		});
		return await newConversation.save();
	}

	async getConversationByUserId(userId) {
		const conversations = await Conversation.find({
			participants: userId,
		})
			.populate("participants", "username avatarUrl name")
			.populate({
				path: "lastMessage",
				select: "content sender createdAt",
				populate: {
					path: "sender",
					select: "username avatarUrl name",
				},
			})
			.sort({ updatedAt: -1 });

		return conversations;
	}

	async getAllParticipants(conversationId) {
		const conversation = await Conversation.findById(conversationId).populate(
			"participants",
			"username avatarUrl name",
		);
		if (!conversation) throw new Error("Conversation not found");

		return conversation.participants;
	}
}

module.exports = new ConversationService();
