const passport = require("passport");
require("~/config/passport");

const createError = require("http-errors");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const apiRouter = require("~/routes");
const morgan = require("morgan");
const connectDB = require("~/config/mongoDB");
const { connectRedis, cleanupRedis } = require("~/config/redis");

const socket = require("~/socket");
const http = require("node:http");
const path = require("node:path");
const cors = require("cors");

const errorHandler = require("@/middleware/errorHandler");

require("dotenv").config();

const app = express();
app.set('trust proxy', true); 
const server = http.createServer(app);

// connect to database
connectDB();
connectRedis();
socket(app, server);

app.use(express.static(path.join(__dirname, "public")));

app.use(passport.initialize());
// app.use(passport.session())

app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept"],
        credentials: true,
    })
);

app.use(helmet());
app.use(morgan("combined"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Use the apiRouter function to set up the API routes
apiRouter(app);

// Error handling
app.use((req, res, next) => {
    next(createError.NotFound("Page not found"));
});

app.use(errorHandler);

setInterval(cleanupRedis, 24 * 60 * 60 * 1000); // Cleanup Redis every 24 hours

module.exports = server;
