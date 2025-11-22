import logger from "../../utils/logger.js"
import { getUserSessionsWithGateways } from "../../redis/sessionCache.js"
import { publishToRedisConsumer } from "../../redis/pubSub.js"
import { pushUnsentMessage_redis } from "../../redis/unsentMessages.js"

export async function handleNotification(notification) {
    const { action, type, forMsg, chatId, receiver, timestamp } = notification; // receive: username (only 1)

    // validate
    if (!action || !type || !forMsg || !chatId || !receiver || !timestamp) {
        logger.error({ notification }, "handleNotification:: Invalid notification payload");
        return;
    }

    // get online & offline sessionIds
    let sessionIds = {};
    try {
        if (type === "DELIVERED" || type === "SEEN") {
            // get receiver sessionIds
            sessionIds = await getUserSessionsWithGateways(receiver); // {sessionId: gatewayId}
            logger.debug({ sessionIds }, `handleNotification: ${receiver} session ids`)

        } else {
            logger.warn({ type }, "handleNotification:: Unknown message type");
            return
        }
    } catch (error) {
        logger.error({ error }, "handleNotification:: Failed to fetch sessionIds");
        return;
    }

    if (!sessionIds || Object.keys(sessionIds).length === 0) { // may be account deleted
        logger.warn({ sessionIds }, "handleNotification:: No sessions found")
        return
    }

    // Split online and offline
    const offline = new Set() // sessionId 
    const online = new Map() // gatewayId: Set(sessionIds)
    for (const [sid, gatewayId] of Object.entries(sessionIds)) {
        if (!gatewayId) {
            offline.add(sid);
        } else {
            if (!online.has(gatewayId)) {
                online.set(gatewayId, new Set());
            }
            online.get(gatewayId).add(sid);
        }
    }

    logger.debug({ offline, online }, "handleNotification:: msg receiver sessions")

    // process data
    const data = {
        action,
        type,
        chatId,
        forMsg,
        timestamp
    };
    // logger.debug({ data }, "handleNotification:: data to be sent to receiver")

    // Publish to online sessions - gateways
    for (const [gid, sid_set] of online) {
        const pubChannel = `chat:gateway:${gid}`;
        await publishToRedisConsumer(
            pubChannel,
            {
                action_redis: "ONLINE_DELIVERY",
                data,
                sessionIds: [...sid_set],
            });

        logger.debug({ gid, sid_set }, "Published to online sessions ")
    }

    // Store unsent messages for offline sessions
    for (const sid of offline) {
        await pushUnsentMessage_redis(sid, data);

        logger.debug({ sid }, "Stored in redis for offline ")
    }
}