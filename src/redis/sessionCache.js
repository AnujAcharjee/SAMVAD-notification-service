import { redis } from "./config.js";
import logger from "../utils/logger.js";

const SESSION_KEY = (sessionId) => `auth:session:${sessionId}`;
const ACTIVE_SESSION_KEY = (username) => `auth:active-sessions:${username}`;

export async function getUserSessionsWithGateways(username) {
    try {
        // 1. Get all session IDs for the user
        const sessionIds = await redis.smembers(ACTIVE_SESSION_KEY(username));
        if (!sessionIds || !sessionIds.length) return {};

        // 2. Fetch each session from Redis and extract gateway
        const result = {};
        await Promise.all(sessionIds.map(async (sessionId) => {
            const sessionStr = await redis.get(SESSION_KEY(sessionId));
            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                result[sessionId] = session.gateway || null;
            } else {
                result[sessionId] = null; // session missing in Redis
            }
        }));

        return result; // { sessionId: gatewayId }
    } catch (error) {
        logger.error({ error, username }, "getUserSessionsWithGateways failed");
        throw error;
    }
}
