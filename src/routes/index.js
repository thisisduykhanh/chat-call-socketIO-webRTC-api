require("dotenv").config();
const rateLimit = require("@/middleware/rateLimit.middleware");
const apiRouter_v1 = require("./v1/index");
const passport = require("passport");
const config = require("~/config");

const { createRefreshToken } = require("@/services/token.service");
const { signAccessToken } = require("@/auth/jwt");

const apiRouter = (app) => {
	app.use(`/api/${config.VERSION}`, rateLimit, apiRouter_v1);

	app.get("/google", rateLimit, passport.authenticate("google"));

	app.get(
		"/google/callback",
		passport.authenticate("google", {
			session: false, // nếu không dùng session
			failureRedirect: "/login", // chuyển hướng khi thất bại
			failureMessage: true,
		}),
		async (req, res) => {
			// req.user được trả về từ verifyGoogleAccount
			const user = req.user;
			const payload = { id: user.id, username: user.username };

			//Tạo access token + refresh token ở đây nếu dùng JWT

			const { refreshToken, sessionId } = await createRefreshToken(payload);
			const accessToken = signAccessToken({ ...payload, sessionId });

			// // 👉 Gửi về frontend hoặc set cookie
			// res.redirect(`/success?token=${accessToken}&refreshToken=${refreshToken}`);

			res.status(200).json({
				accessToken,
				refreshToken: refreshToken,
				sessionId: sessionId,
			});
		},
	);
};

module.exports = apiRouter;
