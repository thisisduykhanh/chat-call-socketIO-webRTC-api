const app = require("~/app");
const config = require("~/config");

const port = config.PORT;
const hostName = config.HOST_NAME;
const version = config.VERSION;

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
