// import passport from 'passport';
const passport = require("passport");
const protect = passport.authenticate("jwt", { session: false });

const { verifyToken } = require("@/auth/jwt");

const admin = require("~/config/firebase-admin");
const { getAsync } = require("~/config/redis");

const verifyFirebaseToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken)
        return res.status(401).json({ message: "Missing Firebase ID Token" });

    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.firebaseUser = decoded;
        next();
    } catch {
        return res.status(403).json({ message: "Invalid Firebase ID Token" });
    }
};

const verifyAccessToken = async (req, res, next) => {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = verifyToken(token);

		const refreshToken = await getAsync(`refresh_token:${decoded.id}:${decoded.sessionId}`);
		if (!refreshToken) {
			return res.status(401).json({ message: "Unauthorized" });
		}

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Access token expired" });
        }

        return res.status(403).json({ message: "Invalid access token" });
    }
};

module.exports = {
    protect,
    verifyFirebaseToken,
    verifyAccessToken,
};
