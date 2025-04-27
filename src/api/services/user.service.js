const User = require("@/models/user.model");
const CreateError = require("http-errors");

class UserService {
    async getMe(userId) {
        try {
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
        } catch (error) {
            throw error;
        }
    }

    async updateLastSeen(userId) {
        try {
           
            const user = await User.findByIdAndUpdate(
                userId,
                { lastSeen: Date.now() }
            );
            
            if (!user) throw CreateError.NotFound("User not found");

            console.log(
                `User ${userId} last seen updated to ${user.lastSeen}`
            );

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new UserService();
