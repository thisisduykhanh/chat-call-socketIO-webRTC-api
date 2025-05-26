const Conversation = require("@/models/conversation.model");
const Message = require("@/models/message.model");

class ConversationService {
    async markMessagesAsRead(conversationId, userId) {
        const now = new Date();

        const conversation = await Conversation.findOne(
            { _id: conversationId, "participants.user": userId },
            { "participants.$": 1 }
        );

        const lastSeenAt =
            conversation?.participants?.[0]?.lastSeenAt ?? new Date(0);

        const messagesToUpdate = await Message.find({
            conversation: conversationId,
            sender: { $ne: userId },
            createdAt: { $gt: lastSeenAt },
            "seenBy.user": { $ne: userId },
        })
            .sort({ createdAt: 1 })
            .lean(); // Sử dụng .lean() để tăng hiệu suất

        if (messagesToUpdate.length === 0) return []; // Không có tin nhắn nào cần cập nhật

        const messageIds = messagesToUpdate.map((msg) => msg._id);

        await Message.updateMany(
            { _id: { $in: messageIds } },
            {
                $push: { seenBy: { user: userId, seenAt: now } },
                $set: { status: "seen" },
            }
        );

        await Conversation.updateOne(
            { _id: conversationId, "participants.user": userId },
            { $set: { "participants.$.lastSeenAt": now } }
        );

        return messagesToUpdate.map((msg) => ({
            ...msg,
            status: "seen",
            seenBy: [...(msg.seenBy || []), { user: userId, seenAt: now }],
        }));
    }

    async updateMessageStatusForReceivers(userId) {
        const conversations = await Conversation.find({
            "participants.user": userId,
        }).select("participants _id");

        const bulkOps = [];

        for (const convo of conversations) {
            const participant = convo.participants.find(
                (p) => p.user.toString() === userId.toString()
            );
            if (!participant) continue;

            const lastSeenAt = participant.lastSeenAt || new Date(0);

            bulkOps.push({
                updateMany: {
                    filter: {
                        conversation: convo._id,
                        sender: { $ne: userId },
                        "seenBy.user": { $ne: userId },
                        createdAt: { $gt: lastSeenAt },
                    },
                    update: {
                        $set: { status: "delivered" },
                    },
                },
            });
        }

        if (bulkOps.length > 0) {
            await Message.bulkWrite(bulkOps);
            console.log("Message status updated for receivers:", bulkOps);
        }
    }

    async updateLastSeen(conversationId, userId) {
        const now = new Date();
        await Conversation.updateOne(
            { _id: conversationId, "participants.user": userId },
            { $set: { "participants.$.lastSeenAt": now } }
        );
    }

    async getOrCreateOneToOneConversation(userAId, userBId) {
        const existing = await Conversation.findOne({
            isGroup: false,
            "participants.user": { $all: [userAId, userBId] },
            $expr: { $eq: [{ $size: "$participants" }, 2] },
        });

        if (existing) return existing;

        const newConversation = new Conversation({
            isGroup: false,
            participants: [
                { user: userAId, lastSeenAt: new Date(0) },
                { user: userBId, lastSeenAt: new Date(0) },
            ],
        });
        return await newConversation.save();
    }


    async getConversationByUserId(userId) {
        const conversations = await Conversation.find({
            "participants.user": userId,
        })
            .populate({
                path: "participants.user",
                select: "username avatarUrl name",
            })
            .sort({ updatedAt: -1 })
            .lean(); // để object JS thuần, dễ thao tác

        // Lấy tất cả messageId của lastMessageMap[userId]
        const messageIds = conversations
            .map((c) => c.lastMessageMap?.[userId.toString()])
            .filter(Boolean);

        // Lấy chi tiết các message đó
        const messages = await Message.find({
            _id: { $in: messageIds },
        })
            .select("content sender createdAt status seenBy")
            .populate({
                path: "sender",
                select: "username avatarUrl name",
            })
            .lean();

        const messageMap = new Map(messages.map((m) => [m._id.toString(), m]));

        for (const conv of conversations) {
            const msgId = conv.lastMessageMap?.[userId.toString()];
            conv.lastMessage = msgId ? messageMap.get(msgId.toString()) : null;
        }

        return conversations;
    }

    async getAllParticipants(conversationId) {
        const conversation = await Conversation.findById(
            conversationId
        ).populate({
            path: "participants.user",
            select: "username avatarUrl name",
        });
        if (!conversation) throw new Error("Conversation not found");

        // Trả về mảng các user đã tham gia (chỉ user object)
        return conversation.participants.map((p) => p.user);
    }

    async getUsersInPrivateConversations(userId) {
        const conversations = await Conversation.find({
            "participants.user": userId,
            isGroup: false,
            $expr: { $eq: [{ $size: "$participants" }, 2] },
        }).populate({
            path: "participants.user",
            select: "username email phone name avatar",
        });

        const users = [];

        for (const convo of conversations) {
            for (const participant of convo.participants) {
                if (participant.user._id.toString() !== userId.toString()) {
                    users.push(participant.user);
                }
            }
        }

        return users;
    }
}

module.exports = new ConversationService();
