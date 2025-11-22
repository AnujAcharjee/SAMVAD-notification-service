import logger from "../utils/logger.js";
import { redis } from "./config.js";

// sessionId : List
const UNSENT_MESSAGE_KEY = (sessionId) => `message:unsent:${sessionId}`;

export async function pushUnsentMessage_redis(sessionId, message) {
    const KEY = UNSENT_MESSAGE_KEY(sessionId);

    try {
        await redis.lpush(KEY, JSON.stringify(message));
    } catch (error) {
        throw new Error("Failed to push unsent message to Redis: " + error.message);
    }
}

export async function popAllUnsentMessages_redis(sessionId) {
    const KEY = UNSENT_MESSAGE_KEY(sessionId);

    try {
        const all = await redis.lrange(KEY, 0, -1);

        if (!all || all.length === 0) {
            return null;
        }
        await redis.del(KEY);
        return all.map(msg => JSON.parse(msg));
    } catch (error) {
        logger.error({ error }, "Failed to pop unsent messages from Redis: " + error.message);
    }
}
