const { Redis } = require("ioredis");
const config = require("./index");
const activeCalls = require("~/socket/state/callState");

// const redisClient = new Redis(
// 	url: `redis://${config.REDIS_HOST || "redis"}:${config.REDIS_PORT || 6379}`);

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
});

console.log("Connecting to Redis at:", `redis://${config.REDIS_HOST}:${config.REDIS_PORT}`);

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
const rPushAsync = async (key, values) => {
	try {
		if (Array.isArray(values)) {
			const stringifiedValues = values.map((v) => JSON.stringify(v));
			await redisClient.rpush(key, ...stringifiedValues);
		} else {
			await redisClient.rpush(key, JSON.stringify(values));
		}
	} catch (err) {
		console.error("Error pushing values to Redis:", err);
	}
};

const lPushAsync = async (key, value) => {
	try {
		await redisClient.lpush(key, JSON.stringify(value));
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
const lRangeAsync = async (key, start, stop) => {
	try {
		const values = await redisClient.lrange(key, start, stop);
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

const saveInfoCallAsync = async ({
	callKey,
	participantsKey,
	userId,
	callType,
}) => {
	try {
		await redisClient
			.multi()
			.hset(callKey, {
				initiator: userId,
				callType: callType,
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

const updateStartTimeAsync = async ({ callKey }) => {
	try {
		const hasStartTime = await redisClient.hexists(callKey, "startTime");
		if (!hasStartTime) {
			await redisClient.hset(callKey, {
				startTime: new Date().toISOString(),
			});
			console.log(`Set startTime for call ${callKey}`);
		} else {
			console.log(`startTime already set for call ${callKey}`);
		}
	} catch (err) {
		console.error("Error updating startTime:", err);
	}
};


const sIsMemberAsync = async (key, member) => {
	try {
		const isMember = await redisClient.sismember(key, member);
		return isMember === 1;
	} catch (err) {
		console.error(`Error checking if member ${member} exists in set ${key}:`, err);
		throw err;
	}
}


const cleanupRedis = async () => {
    const keys = await redisClient.keys('user:*:status');
    for (const key of keys) {
        const ttl = await redisClient.ttl(key);
        if (ttl < 0) {
            await delAsync(key);
            console.log(`Cleaned up expired key: ${key}`);
        }
    }
    const callKeys = await redisClient.keys('call:*:participants');
    for (const key of callKeys) {
        const conversationId = key.split(':')[1];
        if (!activeCalls.has(conversationId)) {
            await delAsync(key);
            await delAsync(`call:${conversationId}`);
            console.log(`Cleaned up stale call data: ${key}`);
        }
    }
};

module.exports = {
	setAsync,
	// setExAsync,
	cleanupRedis,
	getAsync,
	delAsync,
	lPushAsync,
	rPushAsync,
	lRangeAsync,
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
	updateStartTimeAsync,
	sIsMemberAsync
};
