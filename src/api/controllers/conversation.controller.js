const ConversationService = require("@/services/conversation.service");

module.exports = {
	getConversations: async (req, res) => {
		try {
			const conversations = await ConversationService.getConversationByUserId(
				req.user.id,
			);

			res.status(200).json(conversations);
		} catch (error) {
			res.status(500).json({ error: "Internal server error" });
		}
	},

	pinConversation: async (req, res) => {
		try {
			const { conversationId, isPinned } = req.body;
			if (!conversationId || typeof isPinned !== "boolean") {
				return res.status(400).json({ error: "Invalid request data" });
			}

			console.log(
				`User ${req.user.id} is trying to pin conversation ${conversationId} to ${isPinned}`
			);

			const conversation = await ConversationService.pinConversation(
				conversationId,
				req.user.id,
				isPinned
			);

			res.status(200).json(conversation);
		} catch (error) {
			res.status(500).json({ error: error.message || "Internal server error" });
		}
	},
};
