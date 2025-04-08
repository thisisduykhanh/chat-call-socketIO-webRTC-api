const express = require("express");
const passport = require("passport");
const AuthCtrl = require("@/controllers/auth.controller");
const jwt = require("jsonwebtoken");

const router = express.Router();

const { verifyFirebaseToken } = require("@/middleware/auth.middleware");

/**
 * @swagger
 * /register:
 *   post:
 *     tags:
 *       - User
 *     summary: Register a new user and send OTP
 *     description: Registers a new user and sends OTP to their email or phone number.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *               - password
 *               - name
 *
 *
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: OTP has been sent successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */

router.post("/register", AuthCtrl.register);
router.post("/verify/email", AuthCtrl.verifyEmail);
router.post("/verify/phone", verifyFirebaseToken, AuthCtrl.verifyPhone);
router.post("/login", AuthCtrl.login);
router.post("/refresh-token", AuthCtrl.refreshAccessToken);

router.get(
	"/google",
	passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
	"/google/callback",
	passport.authenticate("google", {
		session: false,
		failureRedirect: "/login",
		failureMessage: true,
	}),
	(req, res) => {
		const payload = { id: req.user.id };

		const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
			expiresIn: "15m",
		});
		const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
			expiresIn: "7d",
		});
		res.redirect(`/success?token=${accessToken}&refreshToken=${refreshToken}`);
	},
);

module.exports = router;
