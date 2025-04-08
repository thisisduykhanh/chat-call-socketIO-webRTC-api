const app = require("~/app");

const port = process.env.PORT || 3000;
const hostName = process.env.HOST_NAME || "localhost";
const version = process.env.VERSION || "v1";

const handleExit = (signal) => {
	console.info(`${signal} signal received.`);
	console.log("Closing server...");
	process.exit(0);
};

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);

process.on("unhandledRejection", (err) => {
	console.error(err);
	process.exit(1);
});

app.listen(port, hostName, () => {
	console.log(`Server is running on http://${hostName}:${port}/${version}`);
});
