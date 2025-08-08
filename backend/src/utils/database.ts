// src/utils/database.ts
import mongoose from "mongoose";
import { logger } from "./logger";
import config from "./config";

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

class Database {
  private isConnected = false;
  private connectionRetries = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 5000; // 5 seconds

  private readonly defaultOptions: mongoose.ConnectOptions = {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    bufferCommands: false, // Disable mongoose buffering
  };

  constructor() {
    // Set mongoose global options
    mongoose.set("strictQuery", true);

    // Handle connection events
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    mongoose.connection.on("connected", () => {
      logger.info("MongoDB connected successfully");
      this.isConnected = true;
      this.connectionRetries = 0;
    });

    mongoose.connection.on("error", (error) => {
      logger.error("MongoDB connection error:", error);
      this.isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      this.isConnected = false;

      if (this.connectionRetries < this.maxRetries) {
        this.reconnect();
      } else {
        logger.error(
          "Max reconnection attempts reached. Please check your MongoDB connection."
        );
      }
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
      this.isConnected = true;
      this.connectionRetries = 0;
    });

    // Handle process termination
    process.on("SIGINT", this.gracefulShutdown.bind(this));
    process.on("SIGTERM", this.gracefulShutdown.bind(this));
  }

  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info("Database already connected");
        return;
      }

      const databaseConfig = this.getDatabaseConfig();

      logger.info("Connecting to MongoDB...", {
        uri: this.sanitizeUri(databaseConfig.uri),
        environment: config.server.nodeEnv,
      });

      await mongoose.connect(databaseConfig.uri, databaseConfig.options);

      // Test the connection
      await this.testConnection();
    } catch (error) {
      logger.error("Failed to connect to MongoDB:", error as Error);
      throw new Error(
        `Database connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async reconnect(): Promise<void> {
    this.connectionRetries++;

    logger.info(
      `Attempting to reconnect to MongoDB (attempt ${this.connectionRetries}/${this.maxRetries})`
    );

    await new Promise((resolve) => setTimeout(resolve, this.retryDelay));

    try {
      await this.connect();
    } catch (error) {
      logger.error(
        `Reconnection attempt ${this.connectionRetries} failed:`,
        error as Error
      );
    }
  }

  private getDatabaseConfig(): DatabaseConfig {
    const uri = config.database.uri;

    if (!uri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Add additional options based on environment
    const options: mongoose.ConnectOptions = {
      ...this.defaultOptions,
    };

    // Production-specific options
    if (config.server.nodeEnv === "production") {
      options.retryWrites = true;
      options.w = "majority";
      options.readPreference = "primary";
    }

    return { uri, options };
  }

  private async testConnection(): Promise<void> {
    try {
      // Perform a simple operation to test the connection
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        logger.info("Database connection test successful");
      } else {
        throw new Error("Database connection not established");
      }
    } catch (error) {
      logger.error("Database connection test failed:", error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info("Database already disconnected");
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;
      logger.info("Database disconnected successfully");
    } catch (error) {
      logger.error("Error disconnecting from database:", error as Error);
      throw error;
    }
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(
      `Received ${signal}. Gracefully shutting down database connection...`
    );

    try {
      await this.disconnect();
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown:", error as Error);
      process.exit(1);
    }
  }

  private sanitizeUri(uri: string): string {
    // Remove password from URI for logging
    return uri.replace(/:([^:@]+)@/, ":***@");
  }

  // Health check methods
  isHealthy(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    readyState: number;
    host: string;
    port: number;
    database: string;
  }> {
    const connection = mongoose.connection;

    return {
      isConnected: this.isConnected,
      readyState: connection.readyState,
      host: connection.host || "unknown",
      port: connection.port || 0,
      database: connection.name || "unknown",
    };
  }

  async getStats(): Promise<{
    collections: number;
    indexes: number;
    dataSize: number;
    storageSize: number;
  }> {
    try {
      if (!this.isConnected) {
        throw new Error("Database not connected");
      }

      if (!mongoose.connection.db) {
        throw new Error("Database not connected");
      }
      const stats = await mongoose.connection.db.stats();

      return {
        collections: stats.collections,
        indexes: stats.indexes,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
      };
    } catch (error) {
      logger.error("Error getting database stats:", error as Error);
      throw error;
    }
  }

  // Transaction helper
  async withTransaction<T>(
    operation: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Index management
  async ensureIndexes(): Promise<void> {
    try {
      logger.info("Ensuring database indexes...");

      // Get all models and ensure their indexes
      const models = mongoose.modelNames();

      for (const modelName of models) {
        const model = mongoose.model(modelName);
        await model.ensureIndexes();
        logger.info(`Indexes ensured for model: ${modelName}`);
      }

      logger.info("All database indexes ensured successfully");
    } catch (error) {
      logger.error("Error ensuring database indexes:", error as Error);
      throw error;
    }
  }

  // Collection management
  async dropDatabase(): Promise<void> {
    if (config.server.nodeEnv === "production") {
      throw new Error("Cannot drop database in production environment");
    }

    try {
      if (!mongoose.connection.db) {
        throw new Error("Database not connected");
      }
      await mongoose.connection.db.dropDatabase();
      logger.warn("Database dropped successfully");
    } catch (error) {
      logger.error("Error dropping database:", error as Error);
      throw error;
    }
  }

  async listCollections(): Promise<string[]> {
    try {
      if (!mongoose.connection.db) {
        throw new Error("Database not connected");
      }
      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      return collections.map((col) => col.name);
    } catch (error) {
      logger.error("Error listing collections:", error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const database = new Database();

// Export the class for testing purposes
export { Database };
