const SearchService = require("@/services/search.service");

module.exports = {
	async searchUsers(req, res, next) {
		try {
			const { query } = req.query;
			const userId = req.user.id;

			const users = await SearchService.searchUsers(query, userId);
			res.status(200).json(users);
		} catch (error) {
			next(error);
		}
	},

	async searchMessages(req, res, next) {
		try {
			const { query } = req.query;


			const userId = req.user.id;
			const messages = await SearchService.searchMessages(query, userId);

			console.log("Search results:", messages);

			res.status(200).json(messages);
		} catch (error) {
			next(error);
		}
	},

	async searchMessagesInConversation(req, res, next) {
		try {
			const { query } = req.query;
			const { conversationId } = req.body;
			const userId = req.user.id;

			const messages = await SearchService.searchMessagesInConversation(
				query,
				conversationId,
				userId
			);
			res.status(200).json(messages);
		} catch (error) {
			next(error);
		}
	},
};
