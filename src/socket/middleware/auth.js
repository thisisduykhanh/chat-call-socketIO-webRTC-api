const { verifyToken } = require("@/auth/jwt");
const CreateError = require("http-errors");
const { getAsync } = require("~/config/redis");

const socketAuth = async (socket, next) => {
    const authHeader = socket.handshake.headers["authorization"] || socket.handshake.headers["Authorization"];

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

        const refreshToken = await getAsync(`refresh_token:${decoded.id}:${decoded.sessionId}`);
        if (!refreshToken) {
            return next(CreateError(401, "Unauthorized")); 
        }

        socket.user = decoded;
        next();
    } catch (err) {
        console.error("❌ Invalid token:", err.message);
        next(CreateError(401, "Authentication error: Invalid token"));
    }
};

module.exports = socketAuth;
