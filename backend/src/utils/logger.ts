// src/utils/logger.ts
import winston from "winston";
import path from "path";
import config from "./config";

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
winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;

    let log = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      log += "\n" + JSON.stringify(metadata, null, 2);
    }

    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [];

// Console transport (always included)
transports.push(
  new winston.transports.Console({
    level: config.server.nodeEnv === "production" ? "info" : "debug",
    format: consoleFormat,
  })
);

// File transports (only in production or when explicitly enabled)
if (config.server.nodeEnv === "production") {
  const logDir = "logs";

  // Ensure log directory exists
  try {
    require("fs").mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.warn("Could not create log directory:", error);
  }

  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true,
    })
  );

  // HTTP access log (for API requests)
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "access.log"),
      level: "http",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    })
  );
}

// Create the logger
const winstonLogger = winston.createLogger({
  level: config.server.nodeEnv === "production" ? "info" : "debug",
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] })
  ),
  transports,
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    ...(config.server.nodeEnv === "production"
      ? [
          new winston.transports.File({
            filename: path.join("logs", "exceptions.log"),
            format: fileFormat,
          }),
        ]
      : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    ...(config.server.nodeEnv === "production"
      ? [
          new winston.transports.File({
            filename: path.join("logs", "rejections.log"),
            format: fileFormat,
          }),
        ]
      : []),
  ],
  exitOnError: false,
});

// Create a stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Enhanced logging methods with context
interface LogContext {
  userId?: string | undefined;
  requestId?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
  method?: string | undefined;
  url?: string | undefined;
  statusCode?: number | undefined;
  responseTime?: number | undefined;
  [key: string]: any;
}

class EnhancedLogger {
  private baseLogger: winston.Logger;

  constructor(baseLogger: winston.Logger) {
    this.baseLogger = baseLogger;
  }

  private formatMessage(message: string, context?: LogContext): [string, any] {
    if (!context) {
      return [message, {}];
    }

    const {
      userId,
      requestId,
      ip,
      userAgent,
      method,
      url,
      statusCode,
      responseTime,
      ...metadata
    } = context;

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

  error(message: string, context?: LogContext | Error): void {
    if (context instanceof Error) {
      this.baseLogger.error(message, { error: context, stack: context.stack });
    } else {
      const [enhancedMessage, metadata] = this.formatMessage(message, context);
      this.baseLogger.error(enhancedMessage, metadata);
    }
  }

  warn(message: string, context?: LogContext): void {
    const [enhancedMessage, metadata] = this.formatMessage(message, context);
    this.baseLogger.warn(enhancedMessage, metadata);
  }

  info(message: string, context?: LogContext): void {
    const [enhancedMessage, metadata] = this.formatMessage(message, context);
    this.baseLogger.info(enhancedMessage, metadata);
  }

  http(message: string, context?: LogContext): void {
    const [enhancedMessage, metadata] = this.formatMessage(message, context);
    this.baseLogger.http(enhancedMessage, metadata);
  }

  debug(message: string, context?: LogContext): void {
    const [enhancedMessage, metadata] = this.formatMessage(message, context);
    this.baseLogger.debug(enhancedMessage, metadata);
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operation} completed in ${duration}ms`, {
      ...context,
      operation,
      duration,
      type: "performance",
    });
  }

  // Security logging
  security(event: string, context?: LogContext): void {
    this.warn(`Security Event: ${event}`, {
      ...context,
      type: "security",
      timestamp: new Date().toISOString(),
    });
  }

  // API logging
  api(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: LogContext
  ): void {
    const level =
      statusCode >= 400 ? "error" : statusCode >= 300 ? "warn" : "info";
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
  database(
    operation: string,
    collection?: string,
    duration?: number,
    context?: LogContext
  ): void {
    this.debug(
      `Database: ${operation}${collection ? ` on ${collection}` : ""}${
        duration ? ` (${duration}ms)` : ""
      }`,
      {
        ...context,
        operation,
        collection,
        duration,
        type: "database",
      }
    );
  }

  // Authentication logging
  auth(
    event: string,
    userId?: string,
    success: boolean = true,
    context?: LogContext
  ): void {
    const level = success ? "info" : "warn";
    const message = `Auth: ${event}${userId ? ` for user ${userId}` : ""} - ${
      success ? "SUCCESS" : "FAILED"
    }`;

    this[level](message, {
      ...context,
      ...(userId && { userId }),
      success,
      type: "auth",
    });
  }

  // Translation logging
  translation(
    operation: string,
    textLength?: number,
    tone?: string,
    success: boolean = true,
    context?: LogContext
  ): void {
    const level = success ? "info" : "error";
    const message = `Translation: ${operation}${
      textLength ? ` (${textLength} chars)` : ""
    }${tone ? ` with ${tone} tone` : ""} - ${success ? "SUCCESS" : "FAILED"}`;

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
  child(persistentContext: LogContext): EnhancedLogger {
    const childLogger = this.baseLogger.child(persistentContext);
    return new EnhancedLogger(childLogger);
  }
}

// Export the enhanced logger instance
export const logger = new EnhancedLogger(winstonLogger);

// Export winston logger for direct access if needed
export { winstonLogger };

// Utility function to create request-specific logger
export const createRequestLogger = (
  requestId: string,
  userId?: string,
  ip?: string
): EnhancedLogger => {
  return logger.child({
    requestId,
    ...(userId && { userId }),
    ...(ip && { ip }),
  });
};

// Log application startup
logger.info("Logger initialized", {
  environment: config.server.nodeEnv,
  logLevel: config.server.nodeEnv === "production" ? "info" : "debug",
  fileLogging: config.server.nodeEnv === "production",
  logDir: "logs",
});
