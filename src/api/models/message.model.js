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
                "file",
                "emoji",
                "location",
                "contact",
            ],
            default: "text",
        },

        // Nội dung văn bản, emoji hoặc thông tin liên quan
        content: { type: String },

        media: [MediaSchema],
          

        // Vị trí nếu gửi location
        location: {
            lat: Number,
            lng: Number,
            name: String,
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
        forwardedFrom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
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

        // Sửa tin nhắn
        isEdited: { type: Boolean, default: false },
        editedAt: { type: Date },
        originalContent: { type: String, default: null },

        // Trạng thái
        status: {
            type: String,
            enum: ["sent", "delivered", "seen"],
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
    }
);

// MessageSchema.index({ sender, receiver, createdAt });
// MessageSchema.index({ conversation, createdAt });
// MessageSchema.index({ replyTo });
// MessageSchema.index({ isPinned });
// MessageSchema.index({ threadRoot });

MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ replyTo: 1 });
MessageSchema.index({ threadRoot: 1 });

MessageSchema.index({ content: 'text' });

module.exports = mongoose.model("Message", MessageSchema);
