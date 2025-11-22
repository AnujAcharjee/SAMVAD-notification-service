import { Kafka } from "kafkajs"
import fs from "fs"
import path from "path"
import logger from "../utils/logger.js"

const KAFKA_HOST = process.env.KAFKA_HOST;
const KAFKA_PORT = process.env.KAFKA_PORT;
const KAFKA_HEALTHCHECK_TIMEOUT = parseInt(process.env.KAFKA_HEALTHCHECK_TIMEOUT || "2000", 10);
const SERVER_ID = process.env.SERVER_ID
// const KAFKA_CA_PEM_PATH = process.env.KAFKA_CA_PEM_PATH;
// const KAFKA_USERNAME = process.env.KAFKA_USERNAME;
// const KAFKA_PASSWORD = process.env.KAFKA_PASSWORD;
// const KAFKA_MECHANISM = process.env.KAFKA_MECHANISM;

const requiredEnvs = {
    SERVER_ID,
    KAFKA_HOST,
    KAFKA_PORT,
    // KAFKA_CA_PEM_PATH,
    // KAFKA_USERNAME,
    // KAFKA_PASSWORD,
    // KAFKA_MECHANISM,
    KAFKA_HEALTHCHECK_TIMEOUT,
};

for (const [key, value] of Object.entries(requiredEnvs)) {
    if (!value) {
        throw new Error(`Environment variable ${key} is missing in Kafka config`);
    }
}

const kafka = new Kafka({
    clientId: SERVER_ID,
    brokers: [`${KAFKA_HOST}:${KAFKA_PORT}`],
    // ssl: KAFKA_CA_PEM_PATH
    //     ? { ca: [fs.readFileSync(path.resolve(KAFKA_CA_PEM_PATH), "utf-8")] }
    //     : true, // enable SSL but rely on system trust store
    // sasl: {
    //     username: KAFKA_USERNAME,
    //     password: KAFKA_PASSWORD,
    //     mechanism: KAFKA_MECHANISM
    // }
})

let admin;

function getAdmin() {
    if (!admin) admin = kafka.admin();
    return admin;
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Kafka health check timeout")), ms)
        ),
    ]);
}

export async function healthCheckKafka() {
    try {
        await withTimeout(getAdmin().connect(), KAFKA_HEALTHCHECK_TIMEOUT);
        const metadata = await withTimeout(
            getAdmin().fetchTopicMetadata({ topics: [] }),
            KAFKA_HEALTHCHECK_TIMEOUT
        );
        logger.info({ topics: metadata.topics.map(t => t.name) }, "Kafka health check results");
        return true;
    } catch (err) {
        logger.error({ err }, "Kafka health check failed");
        return false;
    } finally {
        await getAdmin().disconnect().catch(() => { });
        admin = null;
    }
}

export async function shutdownKafka() {
    try {
        if (admin) {
            await admin.disconnect();
            logger.info("Kafka connection closed");
            admin = null;
        }
    } catch (err) {
        logger.error({ err }, "Error closing Kafka connection");
    }
}

export default kafka;