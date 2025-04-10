const AuthService = require("@/services/auth.service");

const register = async (req, res) => {
	try {
		await AuthService.register(req.body);
		res.json({ message: "Create Account successfully." });
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

const verifyEmail = async (req, res) => {
	try {
		const result = await AuthService.verifyEmail(req.body);
		if (result.alreadyVerified) return res.json({ message: "Already verified" });

		res.json(result);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

const verifyPhone = async (req, res) => {
	try {
		const result = await AuthService.verifyPhone(req.body);
		if (result.alreadyVerified) return res.json({ message: "Already verified" });

		res.json(result);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

const login = async (req, res) => {
	try {
		const result = await AuthService.login(req.body);
		res.json(result);
	} catch (err) {
		res.status(401).json({ message: err.message });
	}
};

const refreshAccessToken = async (req, res) => {
	try {
		const {accessToken, refreshToken} = await AuthService.refreshAccessToken(req.body.refreshToken);
		res.json({ accessToken, refreshToken });
	} catch (err) {
		res.status(401).json({ message: err.message });
	}
};

const logout = async (req, res) => {
	try {
		await AuthService.logout(req.body.userId);
		res.json({ message: "Logout successfully" });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

const verifyGoogleAccount = AuthService.verifyGoogleAccount.bind(AuthService);

module.exports = {
	register,
	verifyEmail,
	login,
	refreshAccessToken,
	verifyGoogleAccount,
	verifyPhone,
	logout,
};
