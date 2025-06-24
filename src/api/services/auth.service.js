const CreateError = require("http-errors");
const { v4: uuidv4 } = require("uuid");
const User = require("@/models/user.model");
const bcrypt = require("bcrypt");
const { sendOTP, verifyOTP } = require("~/utils/otp.util");
const FederatedCredential = require("@/models/federatedCredential.model");

const { OAuth2Client } = require("google-auth-library");
const config = require("~/config");

const { delAsync, getAsync, getKeysAsync } = require("~/config/redis");

const {
	verifyAndRefreshToken,
	createRefreshToken,
} = require("@/services/token.service");

const {
	signAccessToken,
	generateResetToken,
	verifyToken,
} = require("~/api/auth/jwt");

const admin = require("~/config/firebase-admin");

class AuthService {
	async register({ name, email, phone, password }) {
		if (!email || !phone)
			throw CreateError.BadRequest("Email or phone is required");
		if (!password) throw CreateError.BadRequest("Password is required");
		if (password.length < 6)
			throw CreateError.BadRequest("Password must be at least 6 characters");

		const query = [];

		if (email) query.push({ email });
		if (phone) query.push({ phone });

		const existingUser = await User.findOne({
			$or: query,
		});

		console.log("existingUser", email, phone);

		console.log("existingUser", existingUser);

		if (existingUser) throw CreateError.Conflict("User already exists");

		const newUser = new User({
			name,
			username: uuidv4(),
			email,
			phone,
			password,
		});

		return await newUser.save();
	}

	async verifyEmail({ email, otp }) {
		const user = await User.findOne({ email });
		if (!user) throw CreateError.NotFound("User not found");
		if (user.verified) return { alreadyVerified: true };

		const isValid = await verifyOTP(user, otp);
		if (!isValid) throw CreateError.Unauthorized("Invalid or expired OTP");

		await user.updateOne({ verified: true });

		const payload = { id: user._id, username: user.username };

		const { refreshToken, sessionId } = await createRefreshToken(payload);

		return {
			accessToken: signAccessToken({ ...payload, sessionId }),
			refreshToken,
			sessionId,
			user: user.toObject(),
		};
	}

	async verifyPhone({ phone, otp }) {
		const user = await User.findOne({ phone });
		if (!user) throw CreateError.NotFound("User not found");
		if (user.verified) return { alreadyVerified: true };

		const isValidOTP = await admin.auth().verifyPhoneNumber(phone, otp);
		if (!isValidOTP) throw CreateError.Unauthorized("Invalid OTP");

		await user.updateOne({ verified: true });

		const payload = { id: user._id, username: user.username };
		const { refreshToken, sessionId } = await createRefreshToken(payload);

		return {
			accessToken: signAccessToken({ ...payload, sessionId }),
			refreshToken,
			sessionId,
			user: user.toObject(),
		};
	}

	async login({ emailOrPhone, password }) {
		const user = await User.findOne({
			$or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
		});
		
		if (!user || !(await bcrypt.compare(password, user.password))) {
			throw CreateError.Unauthorized("Invalid credentials");
		}

		if (!user.verified) {
			if (user.email === emailOrPhone) await sendOTP(user);

			throw CreateError.Unauthorized(
				user.email === emailOrPhone
					? "Please check email to verify!"
					: "Please check SMS to verify!",
			);
		}

		const payload = { id: user._id, username: user.username };
		const { refreshToken, sessionId } = await createRefreshToken(payload);

		console.log("Login sessionId", sessionId);
		console.log("Login refreshToken", refreshToken);

		return {
			accessToken: signAccessToken({ ...payload, sessionId }),
			refreshToken,
			sessionId,
			user: user.toObject(),
		};
	}

	async refreshAccessToken(oldRefreshToken) {
		if (!oldRefreshToken) throw CreateError.Unauthorized("Invalid token");

		const result = await verifyAndRefreshToken(oldRefreshToken);
		if (!result.success) throw CreateError.Unauthorized(result.error);

		const { decoded } = result;

		const user = await User.findById(decoded.id);
		if (!user) throw CreateError.Unauthorized("Invalid Refresh Token");

		const payload = {
			id: user._id,
			username: user.username,
			sessionId: decoded.sessionId,
		};
		const { refreshToken, sessionId } = await createRefreshToken(payload);

		return {
			accessToken: signAccessToken({ ...payload, sessionId }),
			refreshToken,
			sessionId,
		};
	}

	async logout(userId, sessionId) {
		console.log("Logout userId", userId);
		console.log("Logout sessionId", sessionId);
		const refreshToken = await getAsync(`refresh_token:${userId}:${sessionId}`);
		if (!refreshToken) throw CreateError.Unauthorized("Invalid token");

		const result = await verifyAndRefreshToken(refreshToken);
		if (!result.success) throw CreateError.Unauthorized(result.error);

		const { decoded } = result;

		const user = await User.findById(decoded.id);

		if (!user) throw CreateError.Unauthorized("Invalid Refresh Token");

		await delAsync(`refresh_token:${userId}:${sessionId}`); // Xóa refresh token cũ nếu có
	}

	async logoutAllSessions(userId, sessionId) {
		console.log("Logout userId", userId);
		console.log("Logout sessionId", sessionId);
		const refreshToken = await getAsync(`refresh_token:${userId}:${sessionId}`);
		if (!refreshToken) throw CreateError.Unauthorized("Invalid token");

		const result = await verifyAndRefreshToken(refreshToken);
		if (!result.success) throw CreateError.Unauthorized(result.error);

		console.log("Logout all sessions for userId", result.decoded.id);
		const keys = await getKeysAsync(`refresh_token:${result.decoded.id}:*`);

		if (!keys || keys.length === 0)
			throw CreateError.Unauthorized("Invalid token");

		await delAsync(keys);

		return { message: "Logged out from all devices" };
	}

	/**
	 * Verify Google account using Passport.js.
	 *
	 * @param {string} accessToken
	 * @param {string} refreshToken
	 * @param {string} profile
	 * @param {string} cb
	 * @returns
	 */
	async verifyGoogleAccount(_accessToken, _refreshToken, profile, cb) {
		try {
			const cred = await FederatedCredential.findOne({
				provider: "https://accounts.google.com",
				subject: profile.id,
			});

			const email = profile.emails?.[0]?.value || null;
			const phone = profile.phones?.[0]?.value || undefined;
			const avatarUrl = profile.photos?.[0]?.value || null;

			if (!cred) {
				const newUser = new User({
					name: profile.displayName,
					email: email,
					verified: true,
					username: profile.id,
					phone: phone,
					avatarUrl: avatarUrl,
				});
				const savedUser = await newUser.save();

				const newCred = new FederatedCredential({
					user_id: savedUser._id,
					provider: "https://accounts.google.com",
					subject: profile.id,
				});
				await newCred.save();

				return cb(null, {
					id: savedUser._id,
					username: savedUser.username,
					email: savedUser.email,
				});
			}

			const user = await User.findById(cred.user_id);
			if (!user) return cb(null, false);

			return cb(null, user);
		} catch (err) {
			return cb(err);
		}
	}

	async verifyGoogleTokenId(idToken) {
		try {
			const client = new OAuth2Client();

			const ticket = await client.verifyIdToken({
				idToken,
				audience: [
					config.GOOGLE_CLIENT_ID_ANDROID,
					config.GOOGLE_CLIENT_ID,
					// config.GOOGLE_CLIENT_ID_IOS,
				],
			});

			const payload = ticket.getPayload();
			const googleId = payload.sub;
			const email = payload.email || null;
			const name = payload.name || null;
			const avatar = payload.picture || null;
			const phone = payload.phone || undefined;

			const cred = await FederatedCredential.findOne({
				provider: "https://accounts.google.com",
				subject: googleId,
			});

			let user;

			if (!cred) {
				const newUser = new User({
					email,
					name,
					phone: phone,
					username: googleId,
					verified: true,
					avatarUrl: avatar,
				});
				const savedUser = await newUser.save();

				await new FederatedCredential({
					user_id: savedUser._id,
					provider: "https://accounts.google.com",
					subject: googleId,
				}).save();

				user = savedUser;
			} else {
				user = await User.findById(cred.user_id);
			}

			const payloadJwt = { id: user._id, username: user.username };
			const { refreshToken, sessionId } = await createRefreshToken(payloadJwt);
			const accessToken = signAccessToken({ ...payloadJwt, sessionId });

			return { accessToken, refreshToken, sessionId, user: user.toObject() };
		} catch (err) {
			throw new Error("Invalid Google token");
		}
	}
	async forgotPassword({ emailOrPhone }) {
		const user = await User.findOne({
			$or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
		});

		if (user) {
			await sendOTP(user);
		}

		return { message: "If an account exists, an OTP has been sent." };
	}

	async verifyOTPResetPassword({ email, otp }) {
		const user = await User.findOne({ email });

		if (!user || !(await verifyOTP(user, otp))) {
			throw CreateError.Unauthorized("Invalid OTP");
		}

		const resetToken = generateResetToken({ userId: user._id });
		return { message: "OTP verified", resetToken };
	}

	async resetPassword({ resetToken, newPassword, confirmPassword }) {
		if (newPassword !== confirmPassword) {
			throw CreateError.BadRequest("Passwords do not match");
		}

		let payload;
		try {
			payload = verifyToken(resetToken);
		} catch (err) {
			throw CreateError.Unauthorized("Invalid or expired reset token");
		}

		const user = await User.findById(payload.userId);
		if (!user) throw CreateError.NotFound("User not found");

		user.password = newPassword;
		await user.save();



		if (!user.verified) {
			if (user.email === emailOrPhone) await sendOTP(user);

			throw CreateError.Unauthorized(
				user.email === emailOrPhone
					? "Please check email to verify!"
					: "Please check SMS to verify!",
			);
		}

		payload = { id: user._id, username: user.username };
		const { refreshToken, sessionId } = await createRefreshToken(payload);

		return { message: "Password has been reset successfully", user: user.toObject(), refreshToken, sessionId, accessToken: signAccessToken({ ...payload, sessionId }) };
	}

	async changePassword({ userId, oldPassword, newPassword, confirmPassword }) {

		console.log("oldPassword", oldPassword);
		console.log("newPassword", newPassword);
		if (!oldPassword || !newPassword || !confirmPassword) {
			throw CreateError.BadRequest("All fields are required");
		}
		
		if (newPassword !== confirmPassword) {
			throw CreateError.BadRequest("Passwords do not match");
		} else if (oldPassword === newPassword) {
			throw CreateError.BadRequest("New password must be different from old password");
		}

		const user = await User.findById(userId);
		if (!user) throw CreateError.NotFound("User not found");


		const isMatch = await user.comparePassword(oldPassword);
		if (!isMatch) throw CreateError.Unauthorized("Invalid credentials");

		user.password = newPassword;
		await user.save();

		return { message: "Password has been changed successfully" };
	}
}

module.exports = new AuthService();
