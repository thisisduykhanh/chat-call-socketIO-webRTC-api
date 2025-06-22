const mongoose = require("mongoose");
const {
    comparePassword,
    hashPassword,
} = require("@/middleware/user.middleware");

const UserSettings = require("@/models/user.settings.model");


// const {
//     comparePassword,
//     hashPassword,
// } = require("../middleware/user.middleware");

// const UserSettings = require("./user.settings.model");

const UserSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    phone: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        min: 10,
        max: 10,
    },
    password: { type: String },
    avatarUrl: String,

    verified: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },

    otp: { type: String },

    socketId: String, // dùng tạm trong runtime
    lastSeen: Date,

    createdAt: { type: Date, default: Date.now },
});

UserSchema.pre("save", hashPassword);

UserSchema.post("save", async function (doc, next) {
    try {
        const existed = await UserSettings.findOne({ userId: this._id });
        if (!existed) {
            const settings = new UserSettings({ userId: this._id });
            await settings.save();
        }
        next();
    } catch (error) {
        next(error);
    }
});

UserSchema.methods.comparePassword = comparePassword;

UserSchema.index({ email: 1, phone: 1 }, { unique: true });

UserSchema.index({
    username: "text",
    email: "text",
    phone: "text",
    name: "text",
});

module.exports = mongoose.model("User", UserSchema);
