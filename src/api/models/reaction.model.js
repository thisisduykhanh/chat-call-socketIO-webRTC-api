const mongoose = require("mongoose");

const ReactionSchema = new mongoose.Schema(
	{
		message: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
			required: true,
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		type: { type: String }, // ❤️, 😂, etc.
	},
	{ timestamps: true },
);

ReactionSchema.index({ message: 1, user: 1 }, { unique: true }); // mỗi user chỉ 1 reaction / message

module.exports = mongoose.model("Reaction", ReactionSchema);
