import express from "express";
import { config } from "./utils/config";
import { logger } from "./utils/logger";
import { connectDatabase } from "./utils/database";

// 导入路由
import authRoutes from "./routes/auth";
import translationRoutes from "./routes/translation";
import userRoutes from "./routes/user";

const app = express();
const PORT = config.server.port;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/translation", translationRoutes);
app.use("/api/user", userRoutes);

// 健康检查端点
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
  });
});

// 404处理
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 错误处理中间件
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDatabase();
    logger.info("Database connected successfully");

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error as Error);
    process.exit(1);
  }
};

// 优雅关闭
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// 启动应用
startServer();
