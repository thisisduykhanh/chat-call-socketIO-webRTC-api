const mongoose = require("mongoose");
const config = require("./index");

require("dotenv").config();

/**
 * Connect to MongoDB
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If there is an error connecting to MongoDB
 */
const connectDB = async () => {
	try {
		await mongoose.connect(config.MONGO_URI, {
			// dbName: config.MONGO_APP_NAME,
			// appName: config.MONGO_APP_NAME,
			retryWrites: true,
			w: "majority",
		});
	} catch (error) {
		console.error("MongoDB connection error:", error);
		process.exit(1);
	}
};

module.exports = connectDB;
