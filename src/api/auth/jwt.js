const JWT = require("jsonwebtoken");
const fs = require("node:fs");

const privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, "utf8");
const publicKey = fs.readFileSync(process.env.PUBLIC_KEY_PATH, "utf8");

// Sign an access token
const signAccessToken = (payload) => {
	return JWT.sign(payload, privateKey, {
		algorithm: process.env.JWT_ALGORITHM,
		expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
	});
};

// Sign a refresh token
const signRefreshToken = (payload) => {
	return JWT.sign(payload, privateKey, {
		algorithm: process.env.JWT_ALGORITHM,
		expiresIn: "1y",
	});
};

const generateResetToken = (payload) => {
	return JWT.sign(payload, privateKey, {
		algorithm: process.env.JWT_ALGORITHM,
		expiresIn: "20m",
	});
};

// Verify a token (access or refresh)
const verifyToken = (token) => {
	return JWT.verify(token, publicKey, {
		algorithms: [process.env.JWT_ALGORITHM],
	});
};

module.exports = {
	signAccessToken,
	signRefreshToken,
	generateResetToken,
	verifyToken,
};
