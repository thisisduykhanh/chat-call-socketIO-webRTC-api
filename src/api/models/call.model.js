// models/Call.js
const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
	{
		conversation: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Conversation",
			required: true,
		},

		participants: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		],

		type: { type: String, enum: ["voice", "video"], required: true },

		status: {
			type: String,
			enum: ["missed", "completed"],
			default: "completed",
		},

		duration: { type: Number, default: 0 },

		caller: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
	},
	{
		timestamps: true,
	},
);

module.exports = mongoose.model("Call", callSchema);
