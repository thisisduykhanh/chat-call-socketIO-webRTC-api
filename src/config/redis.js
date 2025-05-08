const { Redis } = require("ioredis");
const config = require("./index");

const redisClient = new Redis({
	url: `redis://${config.REDIS_HOST || "redis"}:${config.REDIS_PORT || 6379}`,
});

/**
 * Connect to Redis
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} If there is an error connecting to Redis
 */
const connectRedis = async () => {
	try {
		// await redisClient.connect();
		const result = await redisClient.ping();
		console.log("Redis ping response:", result);
	} catch (err) {
		console.error("Error connecting to Redis:", err);
	}
};

redisClient.on("error", (err) => console.log("Redis Client Error", err));

redisClient.on("ready", () => {
	console.log("Redis is ready");
});

/**
 * Set a value in Redis.
 *
 * @async
 * @param {string} key - The key to set.
 * @param {any} value - The value to set.
 * @param {object} [options] - Additional options for the Redis set command.
 * @returns {Promise<void>}
 * @throws {Error} If there is an error setting the value.
 */
// const setAsync = async (key, value, seconds) => {
// 	try {
// 		await redisClient.set(key, JSON.stringify(value), "EX", seconds);
// 	} catch (err) {
// 		console.error("Error setting value in Redis:", err);
// 	}
// };

const setAsync = async (key, value, seconds) => {
	try {
		if (typeof seconds === "number" && seconds > 0) {
			await redisClient.set(key, JSON.stringify(value), "EX", seconds);
		} else {
			await redisClient.set(key, JSON.stringify(value));
		}
	} catch (err) {
		console.error(`Error setting value in Redis for key ${key}:`, err);
		throw err;
	}
};

// /**
//  * Set a value in Redis with an expiration time.
//  *
//  * @async
//  * @param {string} key - The key to set.
//  * @param {any} value - The value to set.
//  * @param {number} seconds - The expiration time in seconds.
//  * @returns {Promise<void>}
//  * @throws {Error} If there is an error setting the value with expiration.
//  */
// const setExAsync = async (key, value, seconds) => {
// 	try {
// 		await redisClient.setEx(key, seconds, JSON.stringify(value));
// 	} catch (err) {
// 		console.error("Error setting value in Redis with expiration:", err);
// 	}
// };

/**
 * Get a value from Redis.
 *
 * @async
 * @param {string} key - The key to retrieve.
 * @returns {Promise<any>} The value associated with the key.
 * @throws {Error} If there is an error retrieving the value.
 */
const getAsync = async (key) => {
	try {
		const value = await redisClient.get(key);
		return JSON.parse(value);
	} catch (err) {
		console.error("Error getting value from Redis:", err);
	}
};

/**
 * Delete a value from Redis.
 *
 * @async
 * @param {string} key - The key to delete.
 * @returns {Promise<void>}
 * @throws {Error} If there is an error deleting the value.
 */
const delAsync = async (key) => {
	try {
		await redisClient.del(key);
	} catch (err) {
		console.error("Error deleting value from Redis:", err);
	}
};

/**
 * Push a value to a Redis list.
 *
 * @async
 * @param {string} key - The key of the list.
 * @param {any} value - The value to push.
 * @returns {Promise<void>}
 * @throws {Error} If there is an error pushing the value.
 */
const pushAsync = async (key, value) => {
	try {
		await redisClient.rPush(key, JSON.stringify(value));
	} catch (err) {
		console.error("Error pushing value to Redis:", err);
	}
};

/**
 * Get a range of values from a Redis list.
 *
 * @async
 * @param {string} key - The key of the list.
 * @param {number} start - The start index of the range.
 * @param {number} stop - The stop index of the range.
 * @returns {Promise<any[]>} The range of values from the list.
 * @throws {Error} If there is an error retrieving the range.
 */
const rangeAsync = async (key, start, stop) => {
	try {
		const values = await redisClient.lRange(key, start, stop);
		return values.map((value) => JSON.parse(value));
	} catch (err) {
		console.error("Error getting range from Redis:", err);
	}
};

const getKeysAsync = async (key) => {
	return await redisClient.keys(key);
};

const delKeysAsync = async (pattern) => {
	try {
		let cursor = "0";
		const keysToDelete = [];

		do {
			const reply = await redisClient.scan(
				cursor,
				"MATCH",
				pattern,
				"COUNT",
				100,
			);
			cursor = reply[0];
			const keys = reply[1];

			if (keys.length > 0) {
				keysToDelete.push(...keys);
			}
		} while (cursor !== "0");

		if (keysToDelete.length > 0) {
			const deleted = await redisClient.del(...keysToDelete);
			console.log(`Deleted ${deleted} keys matching pattern "${pattern}"`);
			return deleted;
		}

		return 0;
	} catch (err) {
		console.error(`Failed to delete keys with pattern "${pattern}":`, err);
		throw err;
	}
};

const existsAsync = async (key) => {
	try {
		const exists = await redisClient.exists(key);
		return exists === 1;
	} catch (err) {
		console.error("Error checking existence of key in Redis:", err);
		throw err;
	}
};

const hSetAsync = async (key, data) => {
	try {
		await redisClient.hset(key, data);
	} catch (err) {
		console.error(`Error setting hash for key ${key}:`, err);
	}
};

const hGetAllAsync = async (key) => {
	return await redisClient.hgetall(key);
};

const sAddAsync = async (key, member) => {
	try {
		await redisClient.sadd(key, member);
	} catch (err) {
		console.error(`Error adding member to set ${key}:`, err);
	}
};

const sCardAsync = async (key) => {
	try {
		return await redisClient.scard(key);
	} catch (err) {
		console.error(`Error getting cardinality of set ${key}:`, err);
	}
};

const sMembersAsync = async (key) => {
	try {
		return await redisClient.smembers(key);
	} catch (err) {
		console.error(`Error getting members of set ${key}:`, err);
	}
};

const sRemAsync = async (key, member) => {
	try {
		await redisClient.srem(key, member);
	} catch (err) {
		console.error(`Error removing member from set ${key}:`, err);
	}
};

const saveInfoCallAsync = async ({ callKey, participantsKey, userId }) => {
	try {
		await redisClient
			.multi()
			.hset(callKey, {
				initiator: userId,
				startTime: new Date().toISOString(),
			})
			.sadd(participantsKey, userId)
			.expire(callKey, 3600)
			.expire(participantsKey, 3600)
			.exec();

		console.log(`Saved call info for user ${userId}`);
	} catch (err) {
		console.error("Error saving call info:", err);
	}
};

module.exports = {
	setAsync,
	// setExAsync,
	getAsync,
	delAsync,
	pushAsync,
	rangeAsync,
	connectRedis,
	getKeysAsync,
	delKeysAsync,
	saveInfoCallAsync,
	existsAsync,
	hSetAsync,
	sAddAsync,
	sCardAsync,
	sMembersAsync,
	sRemAsync,
	hGetAllAsync,
};
