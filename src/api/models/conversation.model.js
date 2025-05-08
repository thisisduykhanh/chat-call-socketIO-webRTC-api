const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
	{
		isGroup: { type: Boolean, default: false },
		participants: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		name: String,
		avatar: String,
		admin: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},

		lastMessage: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
		},

		settings: {
			onlyAdminCanSend: { type: Boolean, default: false },
			allowPin: { type: Boolean, default: true },
			allowMention: { type: Boolean, default: true },
		},
	},
	{ timestamps: true },
);

ConversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", ConversationSchema);
