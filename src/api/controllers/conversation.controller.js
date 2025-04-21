const ConversationService = require('@/services/conversation.service');

module.exports = {
    getConversations: async (req, res) => {
        try {
            const conversations = await ConversationService.getConversationByUserId(req.user.id);
            res.status(200).json(conversations);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};