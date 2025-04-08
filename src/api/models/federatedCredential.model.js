const mongoose = require("mongoose");

const federatedCredentialSchema = new mongoose.Schema({
	user_id: mongoose.Schema.Types.ObjectId,
	provider: String,
	subject: String,
});

const FederatedCredential = mongoose.model(
	"FederatedCredential",
	federatedCredentialSchema,
);

module.exports = FederatedCredential;
