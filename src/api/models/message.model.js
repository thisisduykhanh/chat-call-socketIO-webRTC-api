const mongoose = require("mongoose");
const MediaSchema = require("@/models/media.model");

const MessageSchema = new mongoose.Schema(
	{
		conversation: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Conversation",
			required: true,
		},

		sender: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},

		// Tin nhắn nhóm => receiver = null, lấy từ conversation.participants
		receiver: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			default: null,
		},

		type: {
			type: String,
			enum: [
				"text",
				"image",
				"video",
				"audio",
				"call",
				"file",
				"emoji",
				"location",
				"contact",
			],
			default: "text",
		},

		callData: {
			callType: {
				type: String,
				enum: ["voice", "video"],
				default: "voice",
			},
			duration: { type: Number, default: 0 },
			participants: [
				{
					type: mongoose.Schema.Types.ObjectId,
					ref: "User",
				},
			],
		},

		// Nội dung văn bản, emoji hoặc thông tin liên quan
		content: { type: String },

		media: [MediaSchema],

		// Vị trí nếu gửi location
		location: {
			type: {
				lat: { type: Number, required: true },
				lng: { type: Number, required: true },
				name: { type: String },
			},
			required: function () {
				return this.type === "location";
			},
		},

		// Thông tin danh bạ nếu gửi contact
		contact: {
			name: String,
			phone: String,
			avatar: String,
		},

		// Trích dẫn tin nhắn
		replyTo: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
			default: null,
		},

		// Chuyển tiếp từ tin nhắn cũ
		originalMessageId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
			default: null,
		},

		isForwarded: {
			type: Boolean,
			default: false,
		},

		// Thread nâng cao
		threadRoot: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
			default: null,
		},
		threadCount: {
			type: Number,
			default: 0,
		},

		// Thu hồi/xóa
		isDeletedForEveryone: { type: Boolean, default: false },
		deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

		reactions: [
					{
						user: {
							type: mongoose.Schema.Types.ObjectId,
							ref: "User",
							required: true,
						},
						type: {
							type: String,
							// enum: ["like", "love", "haha", "sad", "angry", "wow"],
							required: true,
						},
					},
				],

		// Sửa tin nhắn
		isEdited: { type: Boolean, default: false },
		editedAt: { type: Date },
		originalContent: { type: String, default: null },

		// Trạng thái
		status: {
			type: String,
			enum: ["sent", "delivered", "seen", "recalled"],
			default: "sent",
		},

		seenBy: [
			{
				user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
				seenAt: { type: Date, default: Date.now },
			},
		],

		// Mention bạn bè
		mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
	},
	{
		timestamps: true, // Tự động có createdAt và updatedAt
	},
);

// MessageSchema.index({ sender, receiver, createdAt });
// MessageSchema.index({ conversation, createdAt });
// MessageSchema.index({ replyTo });
// MessageSchema.index({ isPinned });
// MessageSchema.index({ threadRoot });

MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, _id: -1 });
MessageSchema.index({ replyTo: 1 });
MessageSchema.index({ threadRoot: 1 });

MessageSchema.index({ content: "text" });

module.exports = mongoose.model("Message", MessageSchema);
