const User = require("@/models/user.model");
const Message = require("@/models/message.model");
const Conversation = require("@/models/conversation.model");

class SearchService {
	async searchUsers(query, userId) {
		if (!query || query.trim().length === 0) return [];

		const cleanedQuery = query.trim();
		const regex = new RegExp(cleanedQuery, "i"); // không phân biệt hoa thường

		const exactMatchUser = await User.findOne({
			$or: [
				{ username: cleanedQuery },
				{ email: cleanedQuery },
				{ phone: cleanedQuery },
			],
		}).select("username email phone name avatar");

		if (exactMatchUser) {
			return [exactMatchUser];
		}

		const users = await User.find({
			$or: [
				{ username: regex },
				{ email: regex },
				{ phone: regex },
				{ name: regex },
			],
		}).select("username email phone name avatar");

		if (!users.length) return [];

		const conversations = await Conversation.find({
			"participants.user": { $all: [userId] },
		}).select("participants.user");

		const validUserIds = new Set();
		validUserIds.add(userId.toString());
		for (const convo of conversations) {
			for (const participant of convo.participants) {
				if (participant.user.toString() !== userId.toString()) {
					validUserIds.add(participant.user.toString());
				}
			}
		}

		// Filter users who are part of any conversation with `userId`
		const filteredUsers = users.filter((user) =>
			validUserIds.has(user._id.toString()),
		);

		return filteredUsers;
	}

	async searchMessages(query, userId) {
		const userConversations = await Conversation.find({
			participants: userId,
		}).distinct("_id");

		const messages = await Message.find(
			{
				conversationId: { $in: userConversations },
				$text: { $search: query },
			},
			{
				score: { $meta: "textScore" },
			},
		)
			.populate("sender", "name avatar")
			.populate("conversationId", "participants")
			.sort({ score: { $meta: "textScore" }, createdAt: -1 })
			.limit(50);

		return messages;
	}
}

module.exports = new SearchService();
