import Redis from "ioredis"
import logger from "../utils/logger.js";

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10);
// const REDIS_USERNAME = process.env.REDIS_USERNAME;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES, 10);
const REDIS_RETRY_DELAY = parseInt(process.env.REDIS_RETRY_DELAY, 10);
const REDIS_HEALTHCHECK_TIMEOUT = parseInt(process.env.REDIS_HEALTHCHECK_TIMEOUT, 10);

const requiredEnvs = {
    REDIS_HOST,
    REDIS_PORT,
    // REDIS_USERNAME,
    REDIS_PASSWORD,
    REDIS_MAX_RETRIES,
    REDIS_RETRY_DELAY,
    REDIS_HEALTHCHECK_TIMEOUT,
};

for (const [key, value] of Object.entries(requiredEnvs)) {
    if (value === undefined || value === null || value === "" || Number.isNaN(value)) {
        throw new Error(`Environment variable ${key} is missing or invalid in redisClient`);
    }
}

function retryStrategy(times) {
    if (times > REDIS_MAX_RETRIES) {
        logger.error("Redis retry limit reached, stopping reconnects");
        return null; // stop retrying
    }
    return Math.min(times * REDIS_RETRY_DELAY, 2000);
}

export const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    // username: REDIS_USERNAME,
    password: REDIS_PASSWORD,
    retryStrategy,
    // tls: tlsOptions,
});

export const pub = redis.duplicate();
export const sub = redis.duplicate();

// event listeners
function attachListeners(client, name) {
    client.on("connect", () => logger.info(`${name} connected`));
    client.on("ready", () => logger.info(`${name} ready`));
    client.on("error", (err) => logger.error({ err }, `${name} error`));
    client.on("close", () => logger.warn(`${name} connection closed`));
    client.on("reconnecting", (time) =>
        logger.warn(`${name} reconnecting in ${time}ms`)
    );
}

attachListeners(redis, "Redis:main");
attachListeners(pub, "Redis:pub");
attachListeners(sub, "Redis:sub");

// Health check with timeout
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Redis health check timeout")), ms)
        ),
    ]);
}

export async function healthCheckRedis() {
    try {
        const [redisRes, pubRes, subRes] = await Promise.all([
            withTimeout(redis.ping(), REDIS_HEALTHCHECK_TIMEOUT),
            withTimeout(pub.ping(), REDIS_HEALTHCHECK_TIMEOUT),
            withTimeout(sub.ping(), REDIS_HEALTHCHECK_TIMEOUT),
        ]);

        logger.info({ redisRes, pubRes, subRes }, "Redis health check results");
        return true;
    } catch (err) {
        logger.error({ err }, "Redis health check failed");
        return false;
    }
}

export async function shutdownRedis() {
    try {
        await Promise.all([redis.quit(), pub.quit(), sub.quit()]);
        logger.info("Redis connections closed");
    } catch (err) {
        logger.error({ err }, "Error closing Redis connections");
    }
}