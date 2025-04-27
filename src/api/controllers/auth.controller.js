const AuthService = require("@/services/auth.service");
const UserService = require("@/services/user.service");

const getMe = async (req, res) => {
	try {
		const user = await UserService.getMe(req.user.id);
		res.json(user);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

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
		const {accessToken, refreshToken, sessionId} = await AuthService.refreshAccessToken(req.body.refreshToken);
		res.json({ accessToken, refreshToken, sessionId });
	} catch (err) {
		res.status(401).json({ message: err.message });
	}
};

const logout = async (req, res) => {
	try {

		console.log(req.user);
		await AuthService.logout(req.user.id, req.user.sessionId);
		res.json({ message: "Logout successfully" });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};

const verifyGoogleAccount = AuthService.verifyGoogleAccount.bind(AuthService);

const forgotPassword = async (req, res) => {
	try {
		const result = await AuthService.forgotPassword(req.body);
		res.json(result);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

const verifyOTPResetPassword = async (req, res) => {
	try {
		const result = await AuthService.verifyOTPResetPassword(req.body);

		res.json(result);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
}

const resetPassword = async (req, res) => {
	try {
		const result = await AuthService.resetPassword(req.body);
		res.json(result);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

const changePassword = async (req, res) => {
	try {

		// console.log(req.user);
		const result = await AuthService.changePassword({ userId: req.user.id, ...req.body });
		res.json(result);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

const logoutAllSessions = async (req, res) => {
	try {
		await AuthService.logoutAllSessions(req.user.id, req.user.sessionId);
		res.json({ message: "Logout all sessions successfully" });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};


async function googleTokenLogin(req, res) {
	const { idToken } = req.body;

	if (!idToken) {
		return res.status(400).json({ message: "Missing idToken" });
	}

	try {
		const { accessToken, refreshToken, sessionId } = await AuthService.verifyGoogleTokenId(idToken);
		res.status(200).json({ accessToken, refreshToken, sessionId });
	} catch (error) {
		console.error("Google login error:", error);
		res.status(401).json({ message: error.message || "Google login failed" });
	}
}

module.exports = {
	googleTokenLogin,
	register,
	verifyEmail,
	login,
	refreshAccessToken,
	verifyGoogleAccount,
	verifyPhone,
	logout,
	logoutAllSessions,
	forgotPassword,
	verifyOTPResetPassword,
	resetPassword,
	changePassword,
	getMe,
};
