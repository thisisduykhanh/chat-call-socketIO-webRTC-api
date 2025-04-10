const CreateError = require("http-errors");
const { v4: uuidv4 } = require("uuid");
const User = require("@/models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { sendOTP, verifyOTP } = require("~/utils/otp.util");
const FederatedCredential = require("@/models/federatedCredential.model");

const { delAsync } = require("~/config/redis");

const {
    verifyAndRefreshToken,
    createRefreshToken,
} = require("@/services/token.service");

const { signAccessToken } = require("~/api/auth/jwt");

const admin = require("~/config/firebase-admin");

class AuthService {
    async register({ name, email, phone, password }) {
        try {
            if (!email && !phone)
                throw CreateError.BadRequest("Email or phone is required");
            if (!password) throw CreateError.BadRequest("Password is required");
            if (password.length < 6)
                throw CreateError.BadRequest(
                    "Password must be at least 6 characters"
                );

            const existingUser = await User.findOne({
                $or: [{ email }, { phone }],
            });
            if (existingUser) throw CreateError.Conflict("User already exists");

            const newUser = new User({
                name,
                username: uuidv4(),
                email,
                phone,
                password,
            });

            return await newUser.save();
        } catch (error) {
            throw error;
        }
    }

    async verifyEmail({ email, otp }) {
        try {
            const user = await User.findOne({ email });
            if (!user) throw CreateError.NotFound("User not found");
            if (user.verified) return { alreadyVerified: true };

            const isValid = await verifyOTP(user, otp);
            if (!isValid)
                throw CreateError.Unauthorized("Invalid or expired OTP");

            await user.updateOne({ verified: true });

            const payload = { id: user._id, username: user.username };
            return {
                accessToken: signAccessToken(payload),
                refreshToken: await createRefreshToken(payload),
            };
        } catch (error) {
            throw error;
        }
    }

    async verifyPhone({ phone, otp }) {
        try {
            const user = await User.findOne({ phone });
            if (!user) throw CreateError.NotFound("User not found");
            if (user.verified) return { alreadyVerified: true };

            const isValidOTP = await admin.auth().verifyPhoneNumber(phone, otp);
            if (!isValidOTP) throw CreateError.Unauthorized("Invalid OTP");

            await user.updateOne({ verified: true });

            const payload = { id: user._id, username: user.username };
            return {
                accessToken: signAccessToken(payload),
                refreshToken: await createRefreshToken(payload),
            };
        } catch (error) {
            throw error;
        }
    }

    async login({ emailOrPhone, password }) {
        try {
            const user = await User.findOne({
                $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
            });
            if (!user || !(await bcrypt.compare(password, user.password))) {
                throw CreateError.Unauthorized("Invalid credentials");
            }

            if (!user.verified) {
                await sendOTP(user);
                throw CreateError.Unauthorized(
                    user.email === emailOrPhone
                        ? "Please check email to verify!"
                        : "Please check SMS to verify!"
                );
            }

            const payload = { id: user._id, username: user.username };
            return {
                accessToken: signAccessToken(payload),
                refreshToken: await createRefreshToken(payload),
            };
        } catch (error) {
            throw error;
        }
    }

    async refreshAccessToken(refreshToken) {
        try {
            const decoded = await verifyAndRefreshToken(refreshToken);
            if (!decoded.success) throw CreateError.Unauthorized(decoded.error);

            const user = await User.findById(decoded.id);
            if (!user) throw CreateError.Unauthorized("Invalid Refresh Token");

            const payload = { id: user._id, username: user.username };
            return {
                accessToken: signAccessToken(payload),
                refreshToken: await createRefreshToken(payload),
            };
        } catch (error) {
            throw error;
        }
    }

    async logout(userId) {
        try {

            const refreshToken = await getAsync(`refresh_token:${userId}`);
            if (!refreshToken) throw CreateError.Unauthorized("Invalid token");

            const decoded = await verifyAndRefreshToken(refreshToken);

            if (!decoded.success) throw CreateError.Unauthorized(decoded.error);
            
            const user = await User.findById(decoded.id);

            if (!user) throw CreateError.Unauthorized("Invalid Refresh Token");

            await delAsync(`refresh_token:${userId}`);

        } catch (error) {
            throw error;
        }
    }

    async verifyGoogleAccount(accessToken, refreshToken, profile, cb) {
        try {
            const cred = await FederatedCredential.findOne({
                provider: "https://accounts.google.com",
                subject: profile.id,
            });

            const email = profile.emails?.[0]?.value || null;
            const phone = profile.phones?.[0]?.value || null;
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
                    name: savedUser.name,
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
}

module.exports = new AuthService();
