import kafka from "./config.js"
import logger from "../utils/logger.js"
import { handleNotification } from "./handlers/notifications.js"

const consumer = kafka.consumer({ groupId: "notification-group" });

export async function initConsumer_kafka() {
    await consumer.connect();

    await consumer.subscribe({ topic: "NOTIFICATIONS", fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const value = message.value.toString();
            const parsedNotification = JSON.parse(value);

            logger.debug({ topic, parsedNotification }, "consumed a notification from kafka")

            switch (topic) {
                case "NOTIFICATIONS":
                    await handleNotification(parsedNotification);
                    break;
            }
        }
    });
}




