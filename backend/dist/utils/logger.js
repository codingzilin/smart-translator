"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestLogger = exports.winstonLogger = exports.logger = exports.httpLogStream = void 0;
// src/utils/logger.ts
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
// Define log levels
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Define colors for each log level
const logColors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};
// Add colors to winston
winston_1.default.addColors(logColors);
// Custom format for console output
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;
    let log = `${timestamp} [${level}]: ${message}`;
    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
        log += "\n" + JSON.stringify(metadata, null, 2);
    }
    return log;
}));
// Custom format for file output
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
// Create transports array
const transports = [];
// Console transport (always included)
transports.push(new winston_1.default.transports.Console({
    level: config_1.default.server.nodeEnv === "production" ? "info" : "debug",
    format: consoleFormat,
}));
// File transports (only in production or when explicitly enabled)
if (config_1.default.server.nodeEnv === "production") {
    const logDir = "logs";
    // Ensure log directory exists
    try {
        require("fs").mkdirSync(logDir, { recursive: true });
    }
    catch (error) {
        console.warn("Could not create log directory:", error);
    }
    // Error log file
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, "error.log"),
        level: "error",
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
    }));
    // Combined log file
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, "combined.log"),
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        tailable: true,
    }));
    // HTTP access log (for API requests)
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logDir, "access.log"),
        level: "http",
        format: fileFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
    }));
}
// Create the logger
const winstonLogger = winston_1.default.createLogger({
    level: config_1.default.server.nodeEnv === "production" ? "info" : "debug",
    levels: logLevels,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.metadata({ fillExcept: ["message", "level", "timestamp"] })),
    transports,
    // Handle uncaught exceptions and rejections
    exceptionHandlers: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        ...(config_1.default.server.nodeEnv === "production"
            ? [
                new winston_1.default.transports.File({
                    filename: path_1.default.join("logs", "exceptions.log"),
                    format: fileFormat,
                }),
            ]
            : []),
    ],
    rejectionHandlers: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
        }),
        ...(config_1.default.server.nodeEnv === "production"
            ? [
                new winston_1.default.transports.File({
                    filename: path_1.default.join("logs", "rejections.log"),
                    format: fileFormat,
                }),
            ]
            : []),
    ],
    exitOnError: false,
});
exports.winstonLogger = winstonLogger;
// Create a stream for Morgan HTTP logging
exports.httpLogStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
class EnhancedLogger {
    constructor(baseLogger) {
        this.baseLogger = baseLogger;
    }
    formatMessage(message, context) {
        if (!context) {
            return [message, {}];
        }
        const { userId, requestId, ip, userAgent, method, url, statusCode, responseTime, ...metadata } = context;
        let enhancedMessage = message;
        if (requestId) {
            enhancedMessage = `[${requestId}] ${enhancedMessage}`;
        }
        if (userId) {
            enhancedMessage = `[User:${userId}] ${enhancedMessage}`;
        }
        const enhancedMetadata = {
            ...metadata,
            ...(ip && { ip }),
            ...(userAgent && { userAgent }),
            ...(method && { method }),
            ...(url && { url }),
            ...(statusCode && { statusCode }),
            ...(responseTime && { responseTime }),
        };
        return [enhancedMessage, enhancedMetadata];
    }
    error(message, context) {
        if (context instanceof Error) {
            this.baseLogger.error(message, { error: context, stack: context.stack });
        }
        else {
            const [enhancedMessage, metadata] = this.formatMessage(message, context);
            this.baseLogger.error(enhancedMessage, metadata);
        }
    }
    warn(message, context) {
        const [enhancedMessage, metadata] = this.formatMessage(message, context);
        this.baseLogger.warn(enhancedMessage, metadata);
    }
    info(message, context) {
        const [enhancedMessage, metadata] = this.formatMessage(message, context);
        this.baseLogger.info(enhancedMessage, metadata);
    }
    http(message, context) {
        const [enhancedMessage, metadata] = this.formatMessage(message, context);
        this.baseLogger.http(enhancedMessage, metadata);
    }
    debug(message, context) {
        const [enhancedMessage, metadata] = this.formatMessage(message, context);
        this.baseLogger.debug(enhancedMessage, metadata);
    }
    // Performance logging
    performance(operation, duration, context) {
        this.info(`Performance: ${operation} completed in ${duration}ms`, {
            ...context,
            operation,
            duration,
            type: "performance",
        });
    }
    // Security logging
    security(event, context) {
        this.warn(`Security Event: ${event}`, {
            ...context,
            type: "security",
            timestamp: new Date().toISOString(),
        });
    }
    // API logging
    api(method, url, statusCode, responseTime, context) {
        const level = statusCode >= 400 ? "error" : statusCode >= 300 ? "warn" : "info";
        const message = `${method} ${url} ${statusCode} - ${responseTime}ms`;
        this[level](message, {
            ...context,
            method,
            url,
            statusCode,
            responseTime,
            type: "api",
        });
    }
    // Database logging
    database(operation, collection, duration, context) {
        this.debug(`Database: ${operation}${collection ? ` on ${collection}` : ""}${duration ? ` (${duration}ms)` : ""}`, {
            ...context,
            operation,
            collection,
            duration,
            type: "database",
        });
    }
    // Authentication logging
    auth(event, userId, success = true, context) {
        const level = success ? "info" : "warn";
        const message = `Auth: ${event}${userId ? ` for user ${userId}` : ""} - ${success ? "SUCCESS" : "FAILED"}`;
        this[level](message, {
            ...context,
            ...(userId && { userId }),
            success,
            type: "auth",
        });
    }
    // Translation logging
    translation(operation, textLength, tone, success = true, context) {
        const level = success ? "info" : "error";
        const message = `Translation: ${operation}${textLength ? ` (${textLength} chars)` : ""}${tone ? ` with ${tone} tone` : ""} - ${success ? "SUCCESS" : "FAILED"}`;
        this[level](message, {
            ...context,
            operation,
            textLength,
            tone,
            success,
            type: "translation",
        });
    }
    // Child logger with persistent context
    child(persistentContext) {
        const childLogger = this.baseLogger.child(persistentContext);
        return new EnhancedLogger(childLogger);
    }
}
// Export the enhanced logger instance
exports.logger = new EnhancedLogger(winstonLogger);
// Utility function to create request-specific logger
const createRequestLogger = (requestId, userId, ip) => {
    return exports.logger.child({
        requestId,
        ...(userId && { userId }),
        ...(ip && { ip }),
    });
};
exports.createRequestLogger = createRequestLogger;
// Log application startup
exports.logger.info("Logger initialized", {
    environment: config_1.default.server.nodeEnv,
    logLevel: config_1.default.server.nodeEnv === "production" ? "info" : "debug",
    fileLogging: config_1.default.server.nodeEnv === "production",
    logDir: "logs",
});
//# sourceMappingURL=logger.js.map