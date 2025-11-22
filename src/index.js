import "dotenv/config";
import { initConsumer_kafka } from "./kafka/consumer.js";
import { shutdownKafka, healthCheckKafka } from "./kafka/config.js";
import { shutdownRedis } from "./redis/config.js";
import logger from "./utils/logger.js";

const initServer = async () => {
    try {
        const kafkaHealthy = await healthCheckKafka().catch(() => false);
        if (!kafkaHealthy) logger.warn("Kafka not healthy, retrying in background...")

        await initConsumer_kafka();
        logger.info("Redis and Kafka initialized successfully");

        // global error handling
        process.on("uncaughtException", (err) => {
            logger.fatal({ err }, "Uncaught exception");
            shutdown(1);
        });
        process.on("unhandledRejection", (reason, promise) => {
            logger.error({ reason, promise }, "Unhandled promise rejection");
        });

        // graceful shutdown
        process.on("SIGTERM", () => shutdown());
        process.on("SIGINT", () => shutdown());

    } catch (error) {
        logger.fatal({ error }, "Failed to start server");
        process.exit(1);
    }
}

let shuttingDown = false;
async function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("Shutting down gracefully...");
    try {
        await shutdownKafka();
        await shutdownRedis();
        process.exit(code);
    } catch (err) {
        logger.error({ err }, "Error during shutdown");
        process.exit(1);
    }
}

initServer();
