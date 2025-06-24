const dotenv = require("dotenv");
const path = require("node:path");
const process = require("node:process");
const { z } = require("zod");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Environment modes
 *
 * @type {{ DEV: string; PROD: string; TEST: string; }}
 */
const ENVIRONMENT_MODES = {
	DEV: "development",
	PROD: "production",
	TEST: "test",
};

/**
 * Determine if the protocol is HTTPS or HTTP
 *
 * @type {("https" | "http")}
 */
const isHttps =
	process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH ? "https" : "http";

const schema = z.object({
	HOST_NAME: z.string().default("0.0.0.0"),
	MONGO_URI: z.string().url(),
	NODE_ENV: z.nativeEnum(ENVIRONMENT_MODES).default(ENVIRONMENT_MODES.DEV),
	PORT: z
		.string()
		.transform((val) => Number.parseInt(val, 10))
		.default(3000),
	PROTOCOL: z.enum(["http", "https"]).default(isHttps),
	REDIS_HOST: z.string(),
	REDIS_PORT: z.string().transform((val) => Number.parseInt(val, 10)),
	REDIS_PASS: z.string().optional(),
	SSL_KEY_PATH: z.string().optional(),
	SSL_CERT_PATH: z.string().optional(),
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),
	GOOGLE_CLIENT_ID_ANDROID: z.string(),
	FIREBASE_GOOGLE_CLIENT_ID: z.string(),
	// GOOGLE_CLIENT_ID_IOS: z.string(),
	ACCESS_TOKEN_EXPIRY: z.string().default("30m"),
	COOKIE_TOKEN_EXPIRY: z.string().default("1800000"),
	VERSION: z.string().default("v1"),
});

const config = schema.parse(process.env);

module.exports = config;
