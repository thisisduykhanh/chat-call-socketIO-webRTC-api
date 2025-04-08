const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

async function sendMail(email, subject, text) {
    if (!email || !subject || !text) {
        console.error("Missing required parameters: email, subject, text");
        return false;
    }

    try {
        const accessToken = await oAuth2Client.getAccessToken();
        console.log("Access Token:", accessToken);


        const transporter = nodemailer.createTransport({
            secure: true,
            host: "smtp.gmail.com",
            service: "gmail",
            port: 465,
            auth: {
                type: "OAuth2",
                user: process.env.EMAIL_USER,
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.REFRESH_TOKEN,
                accessToken: accessToken.token,
            },
        });

        const mailOptions = {
            from: `Brotato < ${process.env.EMAIL_USER} >`,
            to: email,
            subject,
            html: text,
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent to:", email);
        return true;
    } catch (error) {
        console.error("❌ Failed to send email:", error.response?.data || error.response || error.message || error);

        return false;
    }
}

module.exports = sendMail;
