const { setExAsync, delAsync, getAsync } = require('~/config/redis');
const generateOTP = require('~/utils/otpGenerator.util');

const sendEmail = require('~/utils/sendEmail.util');
const {
	Verification_Email_Template,
} = require("~/public/templates/emailTemplate");

const sendOTP = async (user) => {
  await delAsync(`otp:${user._id}`); // Xóa OTP cũ nếu có

  
  await setExAsync(`otp:${user._id}`, generateOTP, 300); // OTP expires in 5 minutes

  const emailTemplate = Verification_Email_Template.replace(
    "{verificationCode}",
    generateOTP,
  ).replace("{email}", user.email);

  await sendEmail(user.email, 'Email Verification', emailTemplate);


};

const verifyOTP = async (user, otp) => {
  const realOtp = await getAsync(`otp:${user._id}`);
  return realOtp === otp;
};

module.exports = { sendOTP, verifyOTP };