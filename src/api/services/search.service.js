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
            validUserIds.has(user._id.toString())
        );

        return filteredUsers;
    }

    async searchMessages(query, userId) {
        try {
            const userConversations = await Conversation.find(
                { "participants.user": userId },
                { _id: 1 }
            );

            const conversationIds = userConversations.map((conv) => conv._id);

            if (conversationIds.length === 0) return [];

            const cleanedQuery = query.trim();
            const regex = new RegExp(cleanedQuery, "i"); // không phân biệt hoa thường

            // 2. Tìm các tin nhắn chứa từ khóa trong các cuộc hội thoại đó
            const messages = await Message.find(
                {
                    $text: { $search: regex },
                    deletedFor: { $ne: userId },

                    conversation: { $in: conversationIds },
                },
                {
                    score: { $meta: "textScore" },
                }
            )
                .populate("sender", "name avatarUrl username")
                .populate("conversation", "participants")
                .sort({ score: { $meta: "textScore" }, createdAt: -1 })
                .limit(20);

            return messages;
        } catch (err) {
            console.error("Error in searchMessages:", err);
            throw err;
        }
    }

    async searchMessagesInConversation(query, conversationId, userId) {
        if (!query || query.trim().length === 0) return [];

        const cleanedQuery = query.trim();
        const regex = new RegExp(cleanedQuery, "i"); // không phân biệt hoa thường

        const conversation = await Conversation.findOne(
            { _id: conversationId, "participants.user": userId },
            { "participants.$": 1 }
        );

        if (!conversation) {
            throw new Error(
                "Conversation not found or you are not a participant"
            );
        }

        const messages = await Message.find({
            conversation: conversation._id,
            deletedFor: { $ne: userId },
            $text: { $search: regex },
        })
            .populate("sender", "name avatarUrl username")
            .sort({ createdAt: -1 })
            .limit(20);

        return messages;
    }
}

module.exports = new SearchService();
