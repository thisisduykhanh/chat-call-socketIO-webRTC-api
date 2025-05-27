const mongoose = require("mongoose");

const UserSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    chatSettings: {
      shareContacts: { type: Boolean, default: true },
      mutedChatsArchived: { type: Boolean, default: false },
    },
    privacySettings: {
      phoneVisible: { type: Boolean, default: false },
      phoneSearchable: { type: Boolean, default: false },
      readStatus: { type: Boolean, default: true },
      typingStatus: { type: Boolean, default: false },
      blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    dataUsage: {
      autoDownload: {
        photo: { type: String, enum: ["none", "wifi", "all"], default: "wifi" },
        video: { type: String, enum: ["none", "wifi", "all"], default: "wifi" },
        audio: { type: String, enum: ["none", "wifi", "all"], default: "wifi" },
        document: { type: String, enum: ["none", "wifi", "all"], default: "wifi" },
      },
      mediaQuality: { type: String, enum: ["standard", "high"], default: "high" },
    },
  },
  { timestamps: true } // Thêm timestamps để theo dõi thời gian tạo/cập nhật
);


module.exports = mongoose.model("UserSettings", UserSettingsSchema);