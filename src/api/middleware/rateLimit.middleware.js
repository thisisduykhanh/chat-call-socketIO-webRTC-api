const rateLimit = require("express-rate-limit");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("~/config/redis");

// Global rate limiter
const globalRateLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 100, // limit each IP to 100 requests per windowMs
	message: { message: "Too many requests, please try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Auth endpoints rate limiter (more strict)
const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // limit each IP to 5 requests per windowMs
	message: { message: "Too many login attempts, please try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// API endpoints rate limiter
const apiRateLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 60, // limit each IP to 60 requests per windowMs
	message: { message: "Too many API requests, please try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// Redis-based rate limiter for WebSocket connections
const wsRateLimiter = new RateLimiterRedis({
	storeClient: Redis,
	keyPrefix: "ws_rate_limit",
	points: 10, // Number of points
	duration: 1, // Per second
	blockDuration: 60, // Block for 60 seconds if consumed
});

// WebSocket rate limiting middleware
const wsRateLimiterMiddleware = async (socket, next) => {
	try {
		await wsRateLimiter.consume(socket.handshake.address);
		next();
	} catch (error) {
		next(new Error("Too many WebSocket connections"));
	}
};

module.exports = {
	globalRateLimiter,
	authRateLimiter,
	apiRateLimiter,
	wsRateLimiterMiddleware,
};
