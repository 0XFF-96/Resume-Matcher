## 部署文档（ResumeMatcher）

### 1. 目标与组成
本项目是一个 monorepo，生产部署通常包含两部分：

1) 后端 API：`artifacts/api-server`
- Express 5
- 负责登录/注册（`/api/auth/*`）、会话（`HttpOnly sid` cookie）、接收 PDF+JD 并启动 AI 匹配工作流（`/api/analyses`）

2) 前端 Web：`artifacts/resume-matcher`
- React + Vite（构建后产物在 `dist/public`）
- 负责 UI、上传简历、轮询 `/api/analyses/:id/status`、展示结果、查看/删除历史

建议使用 HTTPS 反向代理（如 Nginx）把同一个域名上的：
- `/api/*` 转发到后端
- 其他路径（`/`、`/analyze`、`/history` 等）落到前端静态资源

---

### 2. 运行时必需的环境变量

#### 后端（api-server）必需
- `PORT`：后端监听端口
- `DATABASE_URL`：PostgreSQL 连接串（给 Drizzle ORM + session/analyses 使用）
- `AI_INTEGRATIONS_OPENAI_BASE_URL`：OpenAI 集成代理的 Base URL
- `AI_INTEGRATIONS_OPENAI_API_KEY`：OpenAI 集成 API Key
- `LOG_LEVEL`（可选）：日志等级

后端还会要求 `multer` 上传解析 PDF，且内存限制默认配置为 `10MB`（`fileSize: 10 * 1024 * 1024`）。

#### 前端（resume-matcher）必需
- `PORT`：Vite/preview/serve 端口
- `BASE_PATH`：Vite `base` 配置（打包时也会读取；生产静态部署下建议与反向代理路径一致）

---

### 3. 数据库迁移/建表
使用 Drizzle Kit 将 schema 推送到数据库：

```bash
pnpm --filter @workspace/db push
```

如你需要强制重建（谨慎，仅用于需要覆写的场景）：

```bash
pnpm --filter @workspace/db push-force
```

---

### 4. 构建
构建后端与前端产物：

```bash
pnpm run build
```

说明：
- 前端构建会读取 `BASE_PATH`（必须在构建环境中提供，否则 `vite.config.ts` 会直接抛错）。

---

### 5. 生产启动方式（推荐：反向代理 + 静态前端）

#### 5.1 后端启动
构建完成后，API server 的入口在：
- `artifacts/api-server/dist/index.mjs`

启动示例：

```bash
cd artifacts/api-server
export PORT=3001
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
export AI_INTEGRATIONS_OPENAI_BASE_URL="https://YOUR-INTEGRATION-BASE_URL"
export AI_INTEGRATIONS_OPENAI_API_KEY="YOUR-INTEGRATION-KEY"
node --enable-source-maps ./dist/index.mjs
```

#### 5.2 前端静态文件部署
前端构建产物在：
- `artifacts/resume-matcher/dist/public`

推荐由 Nginx / CDN 直接提供静态文件，并将 SPA 路由交回 `index.html`（由反向代理实现）。

#### 5.3 反向代理路由规则（示例）
假设你的域名为 `https://example.com`：
- `https://example.com/api/*` -> 后端（http://127.0.0.1:3001/api/*）
- 其他路径 -> 前端静态站点（`/` 下的 `index.html`）

并确保代理转发 cookie 时不丢失 `sid`。

---

### 6. HTTPS 与 Cookie 的关键注意点（必须看）
后端会把 session cookie `sid` 设置为 `secure: true`。
这意味着：
- 你必须通过 **HTTPS** 访问站点（或确保反向代理在对浏览器的响应上是 HTTPS）
- 否则浏览器可能不发送 cookie，表现为：登录后仍然未认证、上传接口反复 401

---

### 7. 验证清单
部署完成后依次验证：
1. `GET /api/healthz` 返回 `{ "status": "ok" }`
2. 打开页面，完成登录/注册
3. 上传 PDF + JD，创建 analysis 后跳转 processing
4. processing 页面能轮询成功并最终进入 results
5. history 列表能加载，并可删除某条 analysis

---

### 8. 产物路径速查
- 后端：`artifacts/api-server/dist/`
- 前端：`artifacts/resume-matcher/dist/public/`

