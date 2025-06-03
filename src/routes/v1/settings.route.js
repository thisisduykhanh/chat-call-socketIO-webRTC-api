const express = require("express");
const router = express.Router();
const UserSettingsController = require("@/controllers/user.settings.controller");

const { verifyAccessToken } = require("@/middleware/auth.middleware");

router.put("/update", verifyAccessToken, UserSettingsController.updateSetting);
router.get("/", verifyAccessToken, UserSettingsController.getUserSettings);

router.get("/blocked-users", verifyAccessToken, UserSettingsController.getBlockedUsers);

router.post(
    "/blocked-users",
    verifyAccessToken,
    UserSettingsController.addBlockedUser
);

router.delete(
    "/blocked-users",
    verifyAccessToken,
    UserSettingsController.removeBlockedUser
);


module.exports = router;
