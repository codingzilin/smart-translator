"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./utils/config");
const logger_1 = require("./utils/logger");
const database_1 = require("./utils/database");
// 导入路由
const auth_1 = __importDefault(require("./routes/auth"));
const translation_1 = __importDefault(require("./routes/translation"));
const user_1 = __importDefault(require("./routes/user"));
const app = (0, express_1.default)();
const PORT = config_1.config.server.port;
// 中间件
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 日志中间件
app.use((req, res, next) => {
    logger_1.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    next();
});
// 路由
app.use('/api/auth', auth_1.default);
app.use('/api/translation', translation_1.default);
app.use('/api/user', user_1.default);
// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config_1.config.server.nodeEnv
    });
});
// 404处理
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// 错误处理中间件
app.use((err, req, res, next) => {
    logger_1.logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// 启动服务器
const startServer = async () => {
    try {
        // 连接数据库
        await (0, database_1.connectDatabase)();
        logger_1.logger.info('Database connected successfully');
        // 启动服务器
        app.listen(PORT, () => {
            logger_1.logger.info(`Server is running on port ${PORT}`);
            logger_1.logger.info(`Environment: ${config_1.config.server.nodeEnv}`);
            logger_1.logger.info(`Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
// 优雅关闭
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
// 启动应用
startServer();
//# sourceMappingURL=index.js.map