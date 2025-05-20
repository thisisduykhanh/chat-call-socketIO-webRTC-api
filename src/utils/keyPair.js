const crypto = require("node:crypto");

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
	modulusLength: 4096,
	publicKeyEncoding: {
		type: "spki",
		format: "pem",
	},
	privateKeyEncoding: {
		type: "pkcs8",
		format: "pem",
	},
});

console.log("Private Key:", privateKey);
console.log("Public Key:", publicKey);

module.exports = {
	privateKey,
	publicKey,
};
