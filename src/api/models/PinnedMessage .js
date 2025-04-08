const PinnedMessageSchema = new mongoose.Schema({
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
});
