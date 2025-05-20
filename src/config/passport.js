const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const User = require("@/models/user.model");
const { verifyGoogleAccount } = require("@/controllers/auth.controller");
const config = require("./index");

/**
 * Configure Google OAuth strategy for Passport.
 */
passport.use(
	new GoogleStrategy(
		{
			clientID:
				config.GOOGLE_CLIENT_ID ||
				(() => {
					throw new Error("GOOGLE_CLIENT_ID is not defined");
				})(),
			clientSecret:
				config.GOOGLE_CLIENT_SECRET ||
				(() => {
					throw new Error("GOOGLE_CLIENT_SECRET is not defined");
				})(),
			callbackURL: "/google/callback",
			scope: ["profile", "email"],
			// state: true,
		},
		/**
		 * Verify Google account and handle user authentication.
		 * @param {string} accessToken - OAuth access token.
		 * @param {string} refreshToken - OAuth refresh token.
		 * @param {Object} profile - User profile information.
		 * @param {Function} done - Callback function.
		 */
		verifyGoogleAccount,
	),
);

/**
 * Serialize user instance to the session.
 * @param {Object} user - User object.
 * @param {Function} done - Callback function.
 */
passport.serializeUser((user, done) => {
	done(null, user.id);
});

/**
 * Deserialize user instance from the session.
 * @param {string} id - User ID.
 * @param {Function} done - Callback function.
 */
passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		if (!user) return done(new Error("User not found"));
		done(null, user);
	} catch (error) {
		done(error);
	}
});
