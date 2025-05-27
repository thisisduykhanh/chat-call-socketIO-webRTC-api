const UserSettings = require("@/models/user.settings.model");
const User = require("@/models/user.model");
const CreateError = require("http-errors");
const mongoose = require("mongoose");

const VALID_FIELDS = {
    "chatSettings.shareContacts": { type: "boolean" },
    "chatSettings.mutedChatsArchived": { type: "boolean" },
    "privacySettings.phoneVisible": { type: "boolean" },
    "privacySettings.phoneSearchable": { type: "boolean" },
    "privacySettings.readStatus": { type: "boolean" },
    "privacySettings.typingStatus": { type: "boolean" },
    "dataUsage.autoDownload.photo": {
        type: "enum",
        values: ["none", "wifi", "all"],
    },
    "dataUsage.autoDownload.video": {
        type: "enum",
        values: ["none", "wifi", "all"],
    },
    "dataUsage.autoDownload.audio": {
        type: "enum",
        values: ["none", "wifi", "all"],
    },
    "dataUsage.autoDownload.document": {
        type: "enum",
        values: ["none", "wifi", "all"],
    },
    "dataUsage.mediaQuality": { type: "enum", values: ["standard", "high"] },
};

class UserSettingsService {
    async validateUserId(userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new CreateError.BadRequest("Invalid user ID");
        }
        const user = await User.findById(userId);
        if (!user) {
            throw new CreateError.NotFound("User not found");
        }
        return user;
    }

    async getUserSettings(userId) {
        await this.validateUserId(userId);
        const settings = await UserSettings.findOne({ userId }).populate(
            "privacySettings.blockedUsers",
            "username name avatarUrl"
        );
        if (!settings) {
            throw new Error("User settings not found");
        }
        return settings;
    }

    async getSetting(userId, field) {
        if (!VALID_FIELDS[field]) {
            throw new CreateError.BadRequest(`Invalid field: ${field}`);
        }

        await this.validateUserId(userId);

        let settings = await UserSettings.findOne(
            { userId },
            { [field]: 1, userId: 1 }
        );

        if (!settings) {
            // Tạo mới UserSettings nếu không tồn tại
            settings = new UserSettings({ userId });
            await settings.save();
        }

        // Truy cập giá trị field
        const fieldParts = field.split(".");
        let result = settings.toObject(); // Chuyển sang plain object để truy cập dễ dàng
        for (const part of fieldParts) {
            result = result?.[part];
            if (result === undefined) {
                // Trả về giá trị mặc định từ schema nếu field chưa được set
                const defaultSettings = new UserSettings({ userId });
                result = fieldParts.reduce(
                    (obj, p) => obj?.[p],
                    defaultSettings.toObject()
                );
                break;
            }
        }

        return { [field]: result };
    }

    async updateSetting(userId, field, value) {
        if (!VALID_FIELDS[field]) {
            throw new CreateError.BadRequest(`Invalid field: ${field}`);
        }

        const fieldConfig = VALID_FIELDS[field];
        if (fieldConfig.type === "boolean" && typeof value !== "boolean") {
            throw new CreateError.BadRequest(
                `Value for ${field} must be a boolean`
            );
        } else if (
            fieldConfig.type === "enum" &&
            !fieldConfig.values.includes(value)
        ) {
            throw new CreateError.BadRequest(
                `Value for ${field} must be one of: ${fieldConfig.values.join(
                    ", "
                )}`
            );
        }

        await this.validateUserId(userId);

        const update = { [field]: value };

        const settings = await UserSettings.findOneAndUpdate(
            { userId },
            { $set: update },
            {
                new: true,
                upsert: true,
                runValidators: true,
                projection: { [field]: 1, userId: 1 },
            }
        );

        if (!settings) {
            throw new CreateError.NotFound("User settings not found");
        }

        const fieldParts = field.split(".");

        const result = fieldParts.reduce((obj, part) => obj?.[part], settings);
        if (result === undefined) {
            throw new CreateError.InternalServerError(
                "Failed to retrieve updated value"
            );
        }

        return { [field]: result };
    }

    async updateDataUsage(userId, dataUsage) {
        await this.validateUserId(userId);

        const settings = await UserSettings.findOneAndUpdate(
            { userId },
            { $set: { dataUsage } },
            { new: true, upsert: true, runValidators: true }
        );

        if (!settings) {
            throw new CreateError.NotFound("User settings not found");
        }

        return settings;
    }

    async addBlockedUser(userId, blockedUserId) {
        await this.validateUserId(userId);
        await this.validateUserId(blockedUserId);

        const settings = await UserSettings.findOneAndUpdate(
            { userId },
            { $addToSet: { "privacySettings.blockedUsers": blockedUserId } },
            { new: true, runValidators: true }
        );

        if (!settings) {
            throw new CreateError.NotFound("User settings not found");
        }

        return settings.privacySettings.blockedUsers;
    }

    async removeBlockedUser(userId, blockedUserId) {
        await this.validateUserId(userId);
        await this.validateUserId(blockedUserId);

        const settings = await UserSettings.findOneAndUpdate(
            { userId },
            { $pull: { "privacySettings.blockedUsers": blockedUserId } },
            { new: true, runValidators: true }
        );

        if (!settings) {
            throw new CreateError.NotFound("User settings not found");
        }

        return settings.privacySettings.blockedUsers;
    }
}

module.exports = new UserSettingsService();
