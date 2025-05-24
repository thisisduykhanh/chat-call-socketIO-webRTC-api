const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema(
	{
		storage: {
			type: String,
		},
		fileId: { type: String, required: true },
		fileKey: { type: String },
		fileUrl: { type: String },
		mimeType: { type: String },
		fileName: { type: String },
		fileSize: { type: Number },
		blurHash: { type: String },
	},
	{ _id: false },
);

module.exports = MediaSchema;
