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
declare const config: Config;
export declare const getConfig: () => Config;
export declare const isDevelopment: () => boolean;
export declare const isProduction: () => boolean;
export declare const isTest: () => boolean;
export declare const getServerConfig: () => ServerConfig;
export declare const getDatabaseConfig: () => DatabaseConfig;
export declare const getJWTConfig: () => JWTConfig;
export declare const getOpenAIConfig: () => OpenAIConfig;
export declare const getRateLimitConfig: () => RateLimitConfig;
export declare const logConfiguration: () => void;
export { config };
export default config;
//# sourceMappingURL=config.d.ts.map