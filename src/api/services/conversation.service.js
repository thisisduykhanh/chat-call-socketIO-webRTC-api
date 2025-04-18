const Conversation = require('@/models/conversation.model');

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
}

module.exports = new ConversationService();