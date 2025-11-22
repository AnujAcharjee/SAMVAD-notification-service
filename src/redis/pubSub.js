import { pub, sub } from "./config.js"
import logger from "../utils/logger.js"

export async function publishToRedisConsumer(channel, message) {
    try {
        await pub.publish(channel, JSON.stringify(message));
    } catch (error) {
        logger.error({ err }, "Failed to publish to Redis channel");
    }
}