import pino from "pino";

const NODE_ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const isDev = NODE_ENV !== "production";

// Base logger config
const logger = pino({
  level: LOG_LEVEL || "info", // trace, debug, info, warn, error, fatal
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export default logger;