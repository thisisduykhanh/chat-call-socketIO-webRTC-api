const UserSettingsService = require("@/services/user.settings.service");

const CreateError = require("http-errors");

module.exports = {
    getUserSettings: async (req, res) => {
        try {
            const userId = req.user.id;
            const settings = await UserSettingsService.getUserSettings(userId);
            return res.status(200).json({ settings });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    },

    updateSetting: async (req, res) => {
        try {
            const userId = req.user.id;
            const { field, value } = req.body;

            if (!field) {
                throw new CreateError.BadRequest("Field is required");
            }

            const result = await UserSettingsService.updateSetting(
                userId,
                field,
                value
            );

            return res.status(200).json({ success: true, result });
        } catch (error) {
            return res.status(error.status || 400).json({ message: error.message });
        }
    },

    addBlockedUser: async (req, res) => {
        try {
            const userId = req.user.id;
            const { blockedUserId } = req.body;

            const result = await UserSettingsService.addBlockedUser(
                userId,
                blockedUserId
            );

            return res.status(200).json({ success: true, result });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    },

    removeBlockedUser: async (req, res) => {
        try {
            const userId = req.user.id;
            const { blockedUserId } = req.body;

            const result = await UserSettingsService.removeBlockedUser(
                userId,
                blockedUserId
            );

            return res.status(200).json({ success: true, result });
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
};
