const express = require("express");

const AuthCtrl = require("@/controllers/auth.controller");

const router = express.Router();

const {
    verifyFirebaseToken,
    verifyAccessToken,
} = require("@/middleware/auth.middleware");

router.get("/me", verifyAccessToken, AuthCtrl.getMe);

// POST /api/auth/google/token
router.post("/login/google", AuthCtrl.googleTokenLogin);

router.post("/register", AuthCtrl.register);
router.post("/verify/email", AuthCtrl.verifyEmail);
router.post("/verify/phone", verifyFirebaseToken, AuthCtrl.verifyPhone);
router.post("/login", AuthCtrl.login);
router.post("/refresh-token", AuthCtrl.refreshAccessToken);

router.delete("/logout", verifyAccessToken, AuthCtrl.logout);
router.delete("/logout-all", verifyAccessToken, AuthCtrl.logoutAllSessions);
router.post("/forgot-password", AuthCtrl.forgotPassword);
router.post("/verify-otp-reset-password", AuthCtrl.verifyOTPResetPassword);
router.post("/reset-password", AuthCtrl.resetPassword);
router.post("/change-password", verifyAccessToken, AuthCtrl.changePassword);
router.patch("/update-profile", verifyAccessToken, AuthCtrl.updateProfile);

module.exports = router;
