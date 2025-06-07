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

	checkBlockStatus: async (req, res) => {
		try {
			const { conversationId } = req.params;
			if (!conversationId) {
				return res.status(400).json({ error: "Conversation ID is required" });
			}

			const isBlocked = await ConversationService.checkBlockStatus(
				conversationId,
				req.user.id
			);

			res.status(200).json({ isBlocked });
		} catch (error) {
			res.status(500).json({ error: error.message || "Internal server error" });
		}
	},

	checkUserBlockStatus: async (req, res) => {
		try {
			const { receiverId } = req.params;
			if (!receiverId) {
				return res.status(400).json({ error: "Receiver ID is required" });
			}

			const isBlocked = await ConversationService.checkUserBlockStatus(
				receiverId,
				req.user.id
			);

			res.status(200).json({ isBlocked });
		} catch (error) {
			res.status(500).json({ error: error.message || "Internal server error" });
		}
	}
};
