require("dotenv").config();
const rateLimit = require("@/middleware/rateLimit.middleware");
const apiRouter_v1 = require("./v1/index");

const apiRouter = (app) => {
	app.use(`/api/${process.env.Version}`, rateLimit, apiRouter_v1);

	/**
	 * @swagger
	 * /api:
	 *   get:
	 *     description: Returns a hello world message
	 *     responses:
	 *       200:
	 *         description: Hello World response
	 */
	app.get("/api", (req, res) => {
		res.send("Hello, world!");
	});
};

module.exports = apiRouter;
