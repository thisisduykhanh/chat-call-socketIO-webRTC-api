const rateLimit = require("express-rate-limit");

const rateLimiterMiddleware = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	max: 100, // limit each IP to 100 requests per windowMs
	message: { message: "Too many requests, please try again later." },
});

// const {RateLimiterRedis} = require("rate-limiter-flexible");
// const Redis = require("~/config/redis");

// const rateLimiter = new RateLimiterRedis({
// 	storeClient: Redis,
// 	points: 100, // Number of points
// 	duration: 60, // Per second
// 	keyPrefix: "rateLimiter",
// });

// const rateLimiterMiddleware = (req, res, next) => {
// 	rateLimiter
// 		.consume(req.ip)
// 		.then(() => {
// 			next();
// 		})
// 		.catch((err) => {
// 			res.status(429).json({
// 				message: "Too many requests, please try again later.",
// 			});
// 		});
// }

module.exports = rateLimiterMiddleware;
