

module.exports = {
    getConversations: async (req, res) => {
        try {
            const conversations = await req.conversationService.getConversations(req.user._id);
            res.status(200).json(conversations);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};