const redis = require('redis');

require("dotenv").config();


const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`
});


const connectRedis = async () => {
    try {
        await redisClient.connect();
        const result = await redisClient.ping();
        console.log('Redis ping response:', result);
    } catch (err) {
        console.error('Error connecting to Redis:', err);
    }
};


redisClient.on('error', (err) => console.log('Redis Client Error', err));

redisClient.on('ready', () => {
    console.log('Redis is ready');
});


const setAsync = async (key, value, options) => {
    try {
        await redisClient.set(key, JSON.stringify(value), options);
    } catch (err) {
        console.error('Error setting value in Redis:', err);
    }
};

const setExAsync = async (key, value, seconds) => {
    try {
        await redisClient.setEx(key, seconds, JSON.stringify(value));
    } catch (err) {
        console.error('Error setting value in Redis with expiration:', err);
    }
}

const getAsync = async (key) => {
    try {
        const value = await redisClient.get(key);
        return JSON.parse(value);
    } catch (err) {
        console.error('Error getting value from Redis:', err);
    }
}

const delAsync = async (key) => {
    try {
        await redisClient.del(key);
    } catch (err) {
        console.error('Error deleting value from Redis:', err);
    }
}

const pushAsync = async (key, value) => {
    try {
        await redisClient.rPush(key, JSON.stringify(value));
    } catch (err) {
        console.error('Error pushing value to Redis:', err);
    }
}

const rangeAsync = async (key, start, stop) => {
    try {
        const values = await redisClient.lRange(key, start, stop);
        return values.map(value => JSON.parse(value));
    } catch (err) {
        console.error('Error getting range from Redis:', err);
    }
}



module.exports = { setAsync, setExAsync, getAsync, delAsync, pushAsync, rangeAsync, connectRedis };
