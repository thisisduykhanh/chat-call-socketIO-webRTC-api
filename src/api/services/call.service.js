const Call = require("@/models/call.model");
const Conversation = require("@/models/conversation.model");

class CallService {
    async getCallsHistory(userId) {
        // Lấy lịch sử cuộc gọi từ Conversation

        const conversations = await Conversation.find({
            "participants.user": userId,
        });

        const conversationIds = conversations.map(
            (conversation) => conversation._id
        );


        return await Call.find({ conversation: { $in: conversationIds } })
            .populate({
                path: "participants",
                select: "name avatarUrl username",
            })
            .populate({
                path: "caller",
                select: "name avatarUrl username",
            })
            .populate({
                path: "conversation",
                select: "name avatar isGroup participants",
                populate: {
                    path: "participants.user",
                    select: "name avatarUrl username",
                },
            })
            .sort({ createdAt: -1 }); // Sắp xếp mới nhất trước, tùy bạn chọn
    }

    createCall(callData) {
        const call = new Call(callData);
        return call.save();
    }
}
module.exports = new CallService();
