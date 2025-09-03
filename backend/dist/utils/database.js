"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = exports.database = void 0;
// src/utils/database.ts
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./logger");
const config_1 = __importDefault(require("./config"));
class Database {
    constructor() {
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
        this.defaultOptions = {
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false, // Disable mongoose buffering
        };
        // Set mongoose global options
        mongoose_1.default.set("strictQuery", true);
        // Handle connection events
        this.setupEventListeners();
    }
    setupEventListeners() {
        mongoose_1.default.connection.on("connected", () => {
            logger_1.logger.info("MongoDB connected successfully");
            this.isConnected = true;
            this.connectionRetries = 0;
        });
        mongoose_1.default.connection.on("error", (error) => {
            logger_1.logger.error("MongoDB connection error:", error);
            this.isConnected = false;
        });
        mongoose_1.default.connection.on("disconnected", () => {
            logger_1.logger.warn("MongoDB disconnected");
            this.isConnected = false;
            if (this.connectionRetries < this.maxRetries) {
                this.reconnect();
            }
            else {
                logger_1.logger.error("Max reconnection attempts reached. Please check your MongoDB connection.");
            }
        });
        mongoose_1.default.connection.on("reconnected", () => {
            logger_1.logger.info("MongoDB reconnected");
            this.isConnected = true;
            this.connectionRetries = 0;
        });
        // Handle process termination
        process.on("SIGINT", this.gracefulShutdown.bind(this));
        process.on("SIGTERM", this.gracefulShutdown.bind(this));
    }
    async connect() {
        try {
            if (this.isConnected) {
                logger_1.logger.info("Database already connected");
                return;
            }
            const databaseConfig = this.getDatabaseConfig();
            logger_1.logger.info("Connecting to MongoDB...", {
                uri: this.sanitizeUri(databaseConfig.uri),
                environment: config_1.default.server.nodeEnv,
            });
            await mongoose_1.default.connect(databaseConfig.uri, databaseConfig.options);
            // Test the connection
            await this.testConnection();
        }
        catch (error) {
            logger_1.logger.error("Failed to connect to MongoDB:", error);
            throw new Error(`Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async reconnect() {
        this.connectionRetries++;
        logger_1.logger.info(`Attempting to reconnect to MongoDB (attempt ${this.connectionRetries}/${this.maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        try {
            await this.connect();
        }
        catch (error) {
            logger_1.logger.error(`Reconnection attempt ${this.connectionRetries} failed:`, error);
        }
    }
    getDatabaseConfig() {
        const uri = config_1.default.database.uri;
        if (!uri) {
            throw new Error("MONGODB_URI is not defined in environment variables");
        }
        // Add additional options based on environment
        const options = {
            ...this.defaultOptions,
        };
        // Production-specific options
        if (config_1.default.server.nodeEnv === "production") {
            options.retryWrites = true;
            options.w = "majority";
            options.readPreference = "primary";
        }
        return { uri, options };
    }
    async testConnection() {
        try {
            // Perform a simple operation to test the connection
            if (mongoose_1.default.connection.db) {
                await mongoose_1.default.connection.db.admin().ping();
                logger_1.logger.info("Database connection test successful");
            }
            else {
                throw new Error("Database connection not established");
            }
        }
        catch (error) {
            logger_1.logger.error("Database connection test failed:", error);
            throw error;
        }
    }
    async disconnect() {
        try {
            if (!this.isConnected) {
                logger_1.logger.info("Database already disconnected");
                return;
            }
            await mongoose_1.default.disconnect();
            this.isConnected = false;
            logger_1.logger.info("Database disconnected successfully");
        }
        catch (error) {
            logger_1.logger.error("Error disconnecting from database:", error);
            throw error;
        }
    }
    async gracefulShutdown(signal) {
        logger_1.logger.info(`Received ${signal}. Gracefully shutting down database connection...`);
        try {
            await this.disconnect();
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error("Error during graceful shutdown:", error);
            process.exit(1);
        }
    }
    sanitizeUri(uri) {
        // Remove password from URI for logging
        return uri.replace(/:([^:@]+)@/, ":***@");
    }
    // Health check methods
    isHealthy() {
        return this.isConnected && mongoose_1.default.connection.readyState === 1;
    }
    async getConnectionStatus() {
        const connection = mongoose_1.default.connection;
        return {
            isConnected: this.isConnected,
            readyState: connection.readyState,
            host: connection.host || "unknown",
            port: connection.port || 0,
            database: connection.name || "unknown",
        };
    }
    async getStats() {
        try {
            if (!this.isConnected) {
                throw new Error("Database not connected");
            }
            if (!mongoose_1.default.connection.db) {
                throw new Error("Database not connected");
            }
            const stats = await mongoose_1.default.connection.db.stats();
            return {
                collections: stats.collections,
                indexes: stats.indexes,
                dataSize: stats.dataSize,
                storageSize: stats.storageSize,
            };
        }
        catch (error) {
            logger_1.logger.error("Error getting database stats:", error);
            throw error;
        }
    }
    // Transaction helper
    async withTransaction(operation) {
        const session = await mongoose_1.default.startSession();
        try {
            session.startTransaction();
            const result = await operation(session);
            await session.commitTransaction();
            return result;
        }
        catch (error) {
            await session.abortTransaction();
            throw error;
        }
        finally {
            await session.endSession();
        }
    }
    // Index management
    async ensureIndexes() {
        try {
            logger_1.logger.info("Ensuring database indexes...");
            // Get all models and ensure their indexes
            const models = mongoose_1.default.modelNames();
            for (const modelName of models) {
                const model = mongoose_1.default.model(modelName);
                await model.ensureIndexes();
                logger_1.logger.info(`Indexes ensured for model: ${modelName}`);
            }
            logger_1.logger.info("All database indexes ensured successfully");
        }
        catch (error) {
            logger_1.logger.error("Error ensuring database indexes:", error);
            throw error;
        }
    }
    // Collection management
    async dropDatabase() {
        if (config_1.default.server.nodeEnv === "production") {
            throw new Error("Cannot drop database in production environment");
        }
        try {
            if (!mongoose_1.default.connection.db) {
                throw new Error("Database not connected");
            }
            await mongoose_1.default.connection.db.dropDatabase();
            logger_1.logger.warn("Database dropped successfully");
        }
        catch (error) {
            logger_1.logger.error("Error dropping database:", error);
            throw error;
        }
    }
    async listCollections() {
        try {
            if (!mongoose_1.default.connection.db) {
                throw new Error("Database not connected");
            }
            const collections = await mongoose_1.default.connection.db
                .listCollections()
                .toArray();
            return collections.map((col) => col.name);
        }
        catch (error) {
            logger_1.logger.error("Error listing collections:", error);
            throw error;
        }
    }
}
exports.Database = Database;
// Export singleton instance
exports.database = new Database();
//# sourceMappingURL=database.js.map