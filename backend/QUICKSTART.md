# 快速启动指南

## 🚀 立即开始

您的 OpenAI API 配置已经完成！现在可以启动服务器了。

### 1. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 或者构建后启动
npm run build
npm start
```

### 2. 验证服务

服务器启动后，访问健康检查端点：

```
http://localhost:8000/health
```

### 3. 测试 API

使用 Postman 或其他 API 测试工具测试翻译功能：

```
POST http://localhost:8000/api/translation/translate
Content-Type: application/json

{
  "text": "Hello, world!",
  "sourceLanguage": "en",
  "targetLanguage": "zh"
}
```

## 📋 当前配置状态

✅ **OpenAI API**: 已配置并验证
✅ **数据库**: MongoDB 本地连接
✅ **服务器**: 端口 8000
✅ **环境**: 开发模式
✅ **JWT**: 已配置

## 🔧 下一步

1. **启动 MongoDB 服务**

   ```bash
   # macOS (使用Homebrew)
   brew services start mongodb-community

   # 或者直接启动
   mongod
   ```

2. **安装前端依赖**

   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

3. **测试完整流程**
   - 注册用户账户
   - 登录获取 JWT 令牌
   - 使用翻译 API

## 🆘 遇到问题？

- 检查 MongoDB 是否正在运行
- 确认端口 8000 未被占用
- 查看控制台日志信息
- 参考 `ENV_SETUP.md` 获取详细配置说明

## 📚 相关文档

- `ENV_SETUP.md` - 环境变量详细配置
- `README.md` - 完整项目文档
- `src/utils/config.ts` - 配置源代码

---

🎉 **恭喜！您的智能翻译后端服务已经准备就绪！**
