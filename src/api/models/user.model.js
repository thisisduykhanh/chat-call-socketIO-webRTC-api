const mongoose = require("mongoose");
const {
	comparePassword,
	hashPassword,
} = require("@/middleware/user.middleware");

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

UserSchema.methods.comparePassword = comparePassword;

UserSchema.index({ email: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("User", UserSchema);
