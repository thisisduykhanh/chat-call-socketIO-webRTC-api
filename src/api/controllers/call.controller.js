const callService = require("@/services/call.service");

module.exports = {
	getCallsHistory: async (req, res) => {
		try {
			const calls = await callService.getCallsHistory(req.user.id);
			res.status(200).json(calls);
		} catch (error) {
			res.status(500).json({ error: "Internal server error" });
		}
	},
};
