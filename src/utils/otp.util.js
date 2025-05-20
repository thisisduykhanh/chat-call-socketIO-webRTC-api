const { setAsync, delAsync, getAsync } = require("~/config/redis");
const generateOTP = require("~/utils/otpGenerator.util");
const sendEmail = require("~/utils/sendEmail.util");
const {
	Verification_Email_Template,
} = require("~/public/templates/emailTemplate");

/**
 * Sends an OTP to the user's email.
 * @param {Object} user - The user object.
 * @param {string} user._id - The user's unique ID.
 * @param {string} user.email - The user's email address.
 * @returns {Promise<void>}
 */
const sendOTP = async (user) => {
	await delAsync(`otp:${user._id}`); // Delete old OTP if it exists

	const otp = generateOTP(); // Generate a new OTP
	await setAsync(`otp:${user._id}`, otp, 300); // OTP expires in 5 minutes

	const emailTemplate = Verification_Email_Template.replace(
		"{verificationCode}",
		otp,
	).replace("{email}", user.email);

	await sendEmail(user.email, "Email Verification", emailTemplate);
};

/**
 * Verifies the provided OTP against the stored OTP.
 * @param {Object} user - The user object.
 * @param {string} user._id - The user's unique ID.
 * @param {string} otp - The OTP to verify.
 * @returns {Promise<boolean>} - Returns true if OTP matches, otherwise false.
 */
const verifyOTP = async (user, otp) => {
	const realOtp = await getAsync(`otp:${user._id}`);
	if (!realOtp) return false;

	if (realOtp === otp.trim()) {
		await delAsync(`otp:${user._id}`);
		return true;
	}

	return false;
};

module.exports = { sendOTP, verifyOTP };
