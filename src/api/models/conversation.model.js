const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
    {
        isGroup: { type: Boolean, default: false },

        participants: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                lastSeenAt: {
                    type: Date,
                    default: new Date(0),
                },
                isPinned: { type: Boolean, default: false },

                unRead: {
                    type: Boolean,
                    default: false,
                },
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

        lastMessageMap: {
            type: Map,
            of: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Message",
            },
            default: {},
        },

        settings: {
            onlyAdminCanSend: { type: Boolean, default: false },
            allowPin: { type: Boolean, default: true },
            allowMention: { type: Boolean, default: true },
        },
    },
    { timestamps: true }
);

ConversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", ConversationSchema);
