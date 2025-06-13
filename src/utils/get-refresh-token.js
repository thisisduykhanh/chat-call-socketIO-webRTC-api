const { google } = require('googleapis');

require('dotenv').config();

const oAuth2Client = new google.auth.OAuth2(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.REDIRECT_URI,
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline', // bắt buộc để có refresh_token
  prompt: 'consent',       // bắt buộc để luôn nhận refresh_token
  scope: ['https://mail.google.com/'],
});

console.log('Authorize this app by visiting this url:', authUrl);
