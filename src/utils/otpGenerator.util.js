const otpGenerator = require("otp-generator");

/**
 * Generates a 6-digit OTP.
 * @returns {string} - The generated OTP.
 */
const generateOTP = () => {
	return otpGenerator.generate(6, {
		digits: true,
		upperCaseAlphabets: false,
		lowerCaseAlphabets: false,
		specialChars: false,
	});
};

module.exports = generateOTP;
