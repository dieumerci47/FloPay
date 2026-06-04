// src/utils/logger.js
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, colorize, printf, errors } = format;

const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    process.env.NODE_ENV !== "production" ? colorize() : format.uncolorize(),
    devFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/error.log",   level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
  ],
});

module.exports = logger;
