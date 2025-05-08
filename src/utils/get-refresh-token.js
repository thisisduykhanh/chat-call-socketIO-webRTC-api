const { google } = require("googleapis");
const readline = require("node:readline");

require("dotenv").config();

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
	throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env");
}

const oAuth2Client = new google.auth.OAuth2(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.REDIRECT_URI,
);

const scopes = ["https://www.googleapis.com/auth/userinfo.email"];

const authUrl = oAuth2Client.generateAuthUrl({
	access_type: "offline", // cần để lấy refresh token
	prompt: "consent", // luôn hiện popup để cấp lại quyền
	scope: scopes,
});

console.log("💡 Vào đường dẫn sau và dán mã code ở bước tiếp theo:\n");
console.log(authUrl);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.question("\n📥 Nhập mã code ở đây: ", async (code) => {
	try {
		const { tokens } = await oAuth2Client.getToken(code);
		console.log("\n✅ Token đã lấy thành công:\n");
		console.log("Access Token:", tokens.access_token);
		console.log("Refresh Token:", tokens.refresh_token);
	} catch (error) {
		console.error("❌ Lỗi khi lấy token:", error.message);
		console.error(error.response?.data);
	}
	rl.close();
});
