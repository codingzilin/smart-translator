# Smart Translator Backend

## 项目概述

这是一个智能翻译应用的后端服务，使用 Node.js、TypeScript 和 Express 构建，集成了 OpenAI API 进行智能翻译。

## 功能特性

- 🔐 JWT 身份验证
- 🌐 OpenAI API 集成
- 📊 MongoDB 数据存储
- 🚦 速率限制
- ✅ 输入验证
- 📝 详细日志记录

## 技术栈

- **运行时**: Node.js
- **语言**: TypeScript
- **框架**: Express.js
- **数据库**: MongoDB
- **AI 服务**: OpenAI API
- **认证**: JWT
- **验证**: Joi

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制环境变量模板文件并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的配置：

- OpenAI API 密钥
- MongoDB 连接字符串
- JWT 密钥

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 构建
npm run build
```

## 环境变量配置

### 必需的配置

- `OPENAI_API_KEY`: OpenAI API 密钥
- `MONGODB_URI`: MongoDB 数据库连接字符串
- `JWT_SECRET`: JWT 签名密钥

### 可选的配置

- `PORT`: 服务器端口（默认：8000）
- `NODE_ENV`: 环境模式（development/production）
- `OPENAI_MODEL`: OpenAI 模型名称
- `OPENAI_MAX_TOKENS`: 最大 token 数
- `OPENAI_TEMPERATURE`: 温度参数

## API 端点

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/logout` - 用户登出

### 翻译相关

- `POST /api/translation/translate` - 文本翻译
- `GET /api/translation/history` - 翻译历史
- `DELETE /api/translation/history/:id` - 删除翻译记录

### 用户相关

- `GET /api/user/profile` - 获取用户资料
- `PUT /api/user/profile` - 更新用户资料
- `DELETE /api/user/account` - 删除账户

## 项目结构

```
src/
├── controllers/     # 控制器层
├── middleware/      # 中间件
├── models/         # 数据模型
├── routes/         # 路由定义
├── services/       # 业务逻辑
└── utils/          # 工具函数
```

## 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码

### 测试

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 数据库迁移

项目使用 MongoDB，无需运行迁移脚本。确保 MongoDB 服务正在运行。

## 部署

### 生产环境

1. 设置 `NODE_ENV=production`
2. 配置生产环境的 MongoDB 实例
3. 使用强密码的 JWT 密钥
4. 配置适当的 CORS 源
5. 设置速率限制参数

### Docker 部署

```bash
# 构建镜像
docker build -t smart-translator-backend .

# 运行容器
docker run -p 8000:8000 --env-file .env smart-translator-backend
```

## 故障排除

### 常见问题

1. **环境变量缺失**: 检查 `.env` 文件是否存在且包含所有必需的变量
2. **MongoDB 连接失败**: 确认 MongoDB 服务正在运行且连接字符串正确
3. **OpenAI API 错误**: 验证 API 密钥是否有效且有足够的配额

### 日志

应用使用结构化日志记录，可以通过环境变量 `LOG_LEVEL` 控制日志级别。

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License

## 支持

如有问题，请创建 Issue 或联系开发团队。
