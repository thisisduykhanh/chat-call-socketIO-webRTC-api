const mongoose = require("mongoose");

const PinnedMessageSchema = new mongoose.Schema(
	{
		conversationId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Conversation",
			required: true,
		},
		messageId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
			required: true,
		},
		pinnedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		pinnedAt: { type: Date, default: Date.now },
	},
	{
		timestamps: true,
	},
);

PinnedMessageSchema.index(
	{ conversationId: 1, messageId: 1 },
	{ unique: true },
); // Đảm bảo một tin nhắn chỉ có thể được ghim một lần trong mỗi cuộc trò chuyện

module.exports = mongoose.model("PinnedMessage", PinnedMessageSchema);
