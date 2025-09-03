import winston from "winston";
declare const winstonLogger: winston.Logger;
export declare const httpLogStream: {
    write: (message: string) => void;
};
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
declare class EnhancedLogger {
    private baseLogger;
    constructor(baseLogger: winston.Logger);
    private formatMessage;
    error(message: string, context?: LogContext | Error): void;
    warn(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    http(message: string, context?: LogContext): void;
    debug(message: string, context?: LogContext): void;
    performance(operation: string, duration: number, context?: LogContext): void;
    security(event: string, context?: LogContext): void;
    api(method: string, url: string, statusCode: number, responseTime: number, context?: LogContext): void;
    database(operation: string, collection?: string, duration?: number, context?: LogContext): void;
    auth(event: string, userId?: string, success?: boolean, context?: LogContext): void;
    translation(operation: string, textLength?: number, tone?: string, success?: boolean, context?: LogContext): void;
    child(persistentContext: LogContext): EnhancedLogger;
}
export declare const logger: EnhancedLogger;
export { winstonLogger };
export declare const createRequestLogger: (requestId: string, userId?: string, ip?: string) => EnhancedLogger;
//# sourceMappingURL=logger.d.ts.map