const mongoose = require('mongoose');
const acccountSeeder = require('./account');
const MessageSeeder = require('./message');

const connectDB = async () => {
	try {
		await mongoose.connect('mongodb://mongo:YkxrEDTZDzbLOZInulGGDaGTdTjvAcSH@shinkansen.proxy.rlwy.net:31597/chatrealtime?authSource=admin', {
			retryWrites: true,
			w: "majority",
		});
        console.log("✅ MongoDB connected successfully");
	} catch (error) {
		console.error("MongoDB connection error:", error);
		process.exit(1);
	}
};



const seeders = async () => {
	try {
		await connectDB();

		// await acccountSeeder();
		// console.log("✅ Account seeding completed successfully");

		await MessageSeeder();
		console.log("✅ Message seeding completed successfully");

		
	} catch (error) {
		console.error("Account seeding error:", error);
	}
};



seeders()