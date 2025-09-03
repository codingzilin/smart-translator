# 环境变量配置指南

本文档说明如何配置智能翻译应用的环境变量。

## 快速开始

1. 在 `backend` 目录中创建 `.env` 文件：

```bash
cd backend
touch .env
```

2. 将以下内容复制到 `.env` 文件中，并填入您的实际值：

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# Server Configuration
PORT=8000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/translation-app
DB_MAX_POOL_SIZE=10
DB_SERVER_SELECTION_TIMEOUT=5000
DB_SOCKET_TIMEOUT=45000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
TRANSLATION_RATE_LIMIT_WINDOW_MS=60000
TRANSLATION_RATE_LIMIT_MAX_REQUESTS=10
```

## 重要说明

### 安全注意事项

- **永远不要**将 `.env` 文件提交到版本控制系统
- `.env` 文件已被添加到 `.gitignore` 中
- 只提交 `.env.example` 文件作为模板

### 必需的配置项

以下环境变量是必需的，缺少任何一个都会导致应用启动失败：

- `OPENAI_API_KEY`: OpenAI API 密钥
- `MONGODB_URI`: MongoDB 数据库连接字符串
- `JWT_SECRET`: JWT 签名密钥

### 可选配置项

其他配置项都有默认值，您可以根据需要调整：

- `PORT`: 服务器端口（默认：8000）
- `OPENAI_MODEL`: OpenAI 模型名称（默认：gpt-3.5-turbo）
- `OPENAI_MAX_TOKENS`: 最大 token 数（默认：1000）
- `OPENAI_TEMPERATURE`: 温度参数（默认：0.7）

## 验证配置

启动应用后，系统会自动验证配置：

1. 检查必需的环境变量是否存在
2. 验证 OpenAI API 密钥格式
3. 验证数据库连接字符串格式
4. 验证端口号范围
5. 验证 JWT 密钥长度

如果验证失败，应用会在控制台显示错误信息并退出。

## 生产环境

在生产环境中：

1. 使用更强的 JWT 密钥
2. 设置适当的 CORS 源
3. 调整速率限制参数
4. 使用生产级别的 MongoDB 实例
5. 设置 `NODE_ENV=production`

## 故障排除

### 常见问题

1. **"Missing required environment variables"**

   - 检查 `.env` 文件是否存在
   - 确认所有必需的变量都已设置

2. **"Invalid OpenAI API key format"**

   - 确认 API 密钥以 `sk-` 开头

3. **"Invalid MongoDB URI format"**

   - 确认 MongoDB 连接字符串格式正确

4. **"Invalid port number"**
   - 确认端口号在 1-65535 范围内

### 调试模式

设置 `NODE_ENV=development` 可以获得更详细的日志信息。
