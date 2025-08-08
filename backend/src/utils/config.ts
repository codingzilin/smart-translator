// src/utils/config.ts
import dotenv from "dotenv";
import { logger } from "./logger";

// Load environment variables
dotenv.config();

interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    bufferCommands: boolean;
    bufferMaxEntries: number;
  };
}

interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  translation: {
    windowMs: number;
    maxRequests: number;
  };
}

interface Config {
  server: ServerConfig;
  database: DatabaseConfig;
  jwt: JWTConfig;
  openai: OpenAIConfig;
  rateLimit: RateLimitConfig;
}

// Validate required environment variables
const validateEnvVars = (): void => {
  const requiredVars = ["MONGODB_URI", "JWT_SECRET", "OPENAI_API_KEY"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
    process.exit(1);
  }
};

// Validate environment variables on startup
validateEnvVars();

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || "8000", 10),
    nodeEnv: process.env.NODE_ENV || "development",
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
      : process.env.NODE_ENV === "development"
      ? ["http://localhost:3000"]
      : [],
  },

  database: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/translation-app",
    options: {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || "10", 10),
      serverSelectionTimeoutMS: parseInt(
        process.env.DB_SERVER_SELECTION_TIMEOUT || "5000",
        10
      ),
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || "45000", 10),
      bufferCommands: false,
      bufferMaxEntries: 0,
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1000", 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
    translation: {
      windowMs: parseInt(
        process.env.TRANSLATION_RATE_LIMIT_WINDOW_MS || "60000",
        10
      ), // 1 minute
      maxRequests: parseInt(
        process.env.TRANSLATION_RATE_LIMIT_MAX_REQUESTS || "10",
        10
      ),
    },
  },
};

// Configuration validation
const validateConfig = (): void => {
  // Validate port
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error("Invalid port number. Must be between 1 and 65535.");
  }

  // Validate MongoDB URI
  if (
    !config.database.uri.startsWith("mongodb://") &&
    !config.database.uri.startsWith("mongodb+srv://")
  ) {
    throw new Error("Invalid MongoDB URI format.");
  }

  // Validate JWT secret length
  if (config.jwt.secret.length < 32) {
    logger.warn("JWT secret is shorter than recommended (32 characters)");
  }

  // Validate OpenAI configuration
  if (!config.openai.apiKey.startsWith("sk-")) {
    throw new Error("Invalid OpenAI API key format.");
  }

  if (config.openai.temperature < 0 || config.openai.temperature > 2) {
    throw new Error("OpenAI temperature must be between 0 and 2.");
  }

  if (config.openai.maxTokens < 1 || config.openai.maxTokens > 4096) {
    throw new Error("OpenAI max tokens must be between 1 and 4096.");
  }

  logger.info("Configuration validation passed");
};

// Validate configuration on startup
validateConfig();

// Helper functions
export const getConfig = (): Config => config;

export const isDevelopment = (): boolean =>
  config.server.nodeEnv === "development";

export const isProduction = (): boolean =>
  config.server.nodeEnv === "production";

export const isTest = (): boolean => config.server.nodeEnv === "test";

// Configuration getters for specific modules
export const getServerConfig = () => config.server;
export const getDatabaseConfig = () => config.database;
export const getJWTConfig = () => config.jwt;
export const getOpenAIConfig = () => config.openai;
export const getRateLimitConfig = () => config.rateLimit;

// Log configuration (without sensitive data)
export const logConfiguration = (): void => {
  const safeConfig = {
    server: {
      port: config.server.port,
      nodeEnv: config.server.nodeEnv,
      corsOrigins: config.server.corsOrigins,
    },
    database: {
      uri: config.database.uri.replace(/\/\/.*@/, "//***:***@"), // Hide credentials
    },
    jwt: {
      expiresIn: config.jwt.expiresIn,
      refreshExpiresIn: config.jwt.refreshExpiresIn,
    },
    openai: {
      model: config.openai.model,
      maxTokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    },
    rateLimit: config.rateLimit,
  };

  logger.info("Application configuration loaded", safeConfig);
};

export { config };
export default config;
