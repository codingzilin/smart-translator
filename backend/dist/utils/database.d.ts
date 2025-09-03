import mongoose from "mongoose";
declare class Database {
    private isConnected;
    private connectionRetries;
    private readonly maxRetries;
    private readonly retryDelay;
    private readonly defaultOptions;
    constructor();
    private setupEventListeners;
    connect(): Promise<void>;
    private reconnect;
    private getDatabaseConfig;
    private testConnection;
    disconnect(): Promise<void>;
    private gracefulShutdown;
    private sanitizeUri;
    isHealthy(): boolean;
    getConnectionStatus(): Promise<{
        isConnected: boolean;
        readyState: number;
        host: string;
        port: number;
        database: string;
    }>;
    getStats(): Promise<{
        collections: number;
        indexes: number;
        dataSize: number;
        storageSize: number;
    }>;
    withTransaction<T>(operation: (session: mongoose.ClientSession) => Promise<T>): Promise<T>;
    ensureIndexes(): Promise<void>;
    dropDatabase(): Promise<void>;
    listCollections(): Promise<string[]>;
}
export declare const database: Database;
export { Database };
//# sourceMappingURL=database.d.ts.map