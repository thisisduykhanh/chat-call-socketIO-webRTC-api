const User = require("@/models/user.model");
const CreateError = require("http-errors");

class UserService {
	async getMe(userId) {
		const user = await User.findById(userId);
		if (!user) throw CreateError.NotFound("User not found");
		return {
			id: user._id,
			name: user.name,
			username: user.username,
			avatar: user.avatarUrl,
			email: user.email,
			phone: user.phone,
		};
	}

	async updateLastSeen(userId) {
		const user = await User.findByIdAndUpdate(userId, { lastSeen: Date.now() });

		if (!user) throw CreateError.NotFound("User not found");

		console.log(`User ${userId} last seen updated to ${user.lastSeen}`);
	}
}

module.exports = new UserService();
