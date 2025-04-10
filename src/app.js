const passport = require("passport");
require("~/config/passport");

const createError = require("http-errors");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const apiRouter = require("~/routes");
const morgan = require("morgan");
const connectDB = require("~/config/mongoDB");
const { connectRedis } = require("~/config/redis");

const path = require("node:path");
const cors = require("cors");
const { swaggerUi, swaggerSpec } = require("~/config/swagger");

require("dotenv").config();

// connect to database
connectDB();
connectRedis();

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.use(passport.initialize());
// app.use(passport.session())

app.use(
	cors({
		origin: process.env.FRONTEND_URL,
		methods: ["GET", "POST", "PATCH", "DELETE"],
		allowedHeaders: ["Content-Type", "Authorization", "Accept"],
		credentials: true,
	}),
);

app.use(helmet());
app.use(morgan("combined"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Use the apiRouter function to set up the API routes
apiRouter(app);

// Error handling
app.use((req, res, next) => {
	next(createError(404, "Page not found"));
});

app.use((error, req, res, next) => {
	res.status(error.status || 500);
	res.json({
		status: error.status || 500,
		message: error.message,
	});
});

module.exports = app;
