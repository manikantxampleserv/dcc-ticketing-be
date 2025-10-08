"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const COLORS = {
    info: "\x1b[34m",
    warn: "\x1b[33m",
    error: "\x1b[31m",
    success: "\x1b[32m",
    debug: "\x1b[36m",
    default: "\x1b[37m",
};
const RESET = "\x1b[0m";
const { combine, timestamp, printf, errors } = winston_1.format;
const logFormat = printf(({ level, message, stack }) => {
    const color = COLORS[level] || COLORS.default;
    const coloredLevel = `${color}[${level}] ${stack || message}${RESET}`;
    return `${coloredLevel}`;
});
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        success: 2,
        info: 3,
        debug: 4,
    },
    colors: {
        error: "red",
        warn: "yellow",
        success: "green",
        info: "blue",
        debug: "cyan",
    },
};
const logger = (0, winston_1.createLogger)({
    levels: customLevels.levels,
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), errors({ stack: true }), logFormat),
    transports: [new winston_1.transports.Console()],
    exitOnError: false,
});
logger.success = function (message) {
    this.log({ level: "success", message });
};
exports.default = logger;
