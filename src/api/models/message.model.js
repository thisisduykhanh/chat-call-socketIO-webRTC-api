const mongoose = require("mongoose");

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

        // File/Media (ảnh, video, v.v)
        fileUrl: { type: String },
        mimeType: { type: String },
        fileName: { type: String },
        fileSize: { type: Number },

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

        // Ghim tin nhắn
        isPinned: { type: Boolean, default: false },

        // Thu hồi/xóa
        isDeletedForEveryone: { type: Boolean, default: false },
        deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        // Sửa tin nhắn
        isEdited: { type: Boolean, default: false },
        editedAt: { type: Date },

        // Trạng thái
        status: {
            type: String,
            enum: ["sent", "delivered", "seen"],
            default: "sent",
        },

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
MessageSchema.index({ isPinned: 1 });
MessageSchema.index({ threadRoot: 1 });

module.exports = mongoose.model("Message", MessageSchema);
