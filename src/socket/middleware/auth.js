const { verifyToken } = require("@/auth/jwt");
const CreateError = require("http-errors");
const { getAsync } = require("~/config/redis");

const socketAuth = async (socket, next) => {
    const authHeader =
        socket.handshake.headers.authorization ||
        socket.handshake.headers.Authorization;

    // console.log("🔐 Authorization header:", authHeader);

    if (!authHeader || authHeader.trim() === "") {
        return next(CreateError(401, "Authentication error: Token missing"));
    }

    // Tách "Bearer <token>"
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

    try {
        const decoded = verifyToken(token);
        console.log("✅ Authenticated user:", decoded);

        const refreshToken = await getAsync(
            `refresh_token:${decoded.id}:${decoded.sessionId}`
        );
        if (!refreshToken) {
            return next(CreateError(401, "Unauthorized"));
        }

        socket.user = decoded;
        next();
    } catch (err) {
        console.error("❌ Token verify failed:", err.message);

        if (err.name === "TokenExpiredError") {
            return next(new Error("TokenExpiredError"));
        }

        return next(new Error("InvalidToken"));
    }
};

module.exports = socketAuth;
