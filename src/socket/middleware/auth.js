const { verifyToken } = require("@/auth/jwt");
const CreateError = require("http-errors");

const socketAuth = (socket, next) => {
  const authHeader = socket.handshake.headers["authorization"];
  // console.log("🔐 Authorization header:", authHeader);

  if (!authHeader) {
    return next(CreateError(401, "Authentication error: Token missing"));
  }

  // Tách "Bearer <token>"
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;


  try {
    const decoded = verifyToken(token);
    console.log("✅ Authenticated user:", decoded);
    socket.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    next(CreateError(401, "Authentication error: Invalid token"));
  }
};

module.exports = socketAuth;
