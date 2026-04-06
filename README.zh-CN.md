# auto-trade

[English](./README.md) | [简体中文](./README.zh-CN.md)

`auto-trade` 是一个面向 AI 辅助交易控制台的 monorepo。
当前实现主要聚焦于：

- Web 控制台原型（`apps/web`）
- 后端基础能力（`apps/api`）
- 阶段清单与技术设计文档（`docs`）

## 当前状态（2026-04-06）

- Phase 1（Web 控制台原型）：核心页面已完成
- Phase 2（后端基础与前后端接线）：已完成
- Phase 3.1/3.2（Telegram 接入与消息落库）：已完成并补齐自动化代测
- Phase 3+（AI 决策引擎、OKX 执行、虚拟账本）：规划中/进行中

当前项目已可用于本地 API/Web 联调与回归测试，但尚不是完整可用的端到端自动交易系统。

## 仓库结构

```text
auto-trade/
  apps/
    api/        FastAPI 后端（认证、设置、日志、SSE、健康检查）
    web/        React + Vite 控制台
  docs/         需求、阶段清单、技术设计
  README.md     英文版
  README.zh-CN.md 中文版
```

## 技术栈

- 后端：Python 3.11+、FastAPI、SQLAlchemy（async）、Redis
- 前端：React 18、TypeScript、Vite
- 存储：PostgreSQL + Redis
- 测试：pytest、Playwright

## 前置要求

- Python 3.11+
- Node.js 18+（推荐 Node 20）
- npm
- PostgreSQL 16+（或兼容版本）
- Redis 7+（或兼容版本）

## 快速开始（真实 API 模式）

以下命令默认从仓库根目录（`auto-trade/`）执行。

### 1）启动依赖（PostgreSQL + Redis）

首次运行：

```bash
docker run -d --name auto-trade-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=auto_trade -p 5432:5432 postgres:16
docker run -d --name auto-trade-redis -p 6379:6379 redis:7
```

如果容器已创建过：

```bash
docker start auto-trade-postgres auto-trade-redis
```

### 2）配置并启动 API（`apps/api`）

```bash
cd apps/api
python -m pip install -e .[dev]
cp .env.example .env
```

PowerShell 可用：`Copy-Item .env.example .env -Force`

生成 `OWNER_PASSWORD_HASH`（示例密码为 `123456`）：

```bash
python -c "from argon2 import PasswordHasher; print(PasswordHasher().hash('123456'))"
```

把生成结果填入 `.env`，然后启动：

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

API 地址：`http://127.0.0.1:8000`（前缀 `/api/v1`）

建议在 `apps/api/.env` 中配置：

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3）配置并启动 Web（`apps/web`）

```bash
cd apps/web
npm install
cp .env.example .env
```

PowerShell 可用：`Copy-Item .env.example .env -Force`

将 Web 环境切到 API 模式：

```env
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_ENABLE_SSE=true
```

然后启动前端：

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Web 地址：`http://127.0.0.1:5173`

### 4）首次登录与快速验收

- 如果你使用了上面的示例哈希命令，登录密码是 `123456`。
- 打开 `/settings`、`/logs`，确认真实 API 数据可加载。
- 可选回归命令：

```bash
cd apps/api
python -m pytest tests/integration/test_phase3_manual_checks_auto.py -q
python -m pytest tests -q
```

```bash
cd apps/web
npx playwright test tests/phase-4-3-api-real-backend.spec.ts --workers=1
npx playwright test tests/phase-2-manual-checks-real-backend.spec.ts --workers=1
```

### 5）常见问题

- 登录预检 `OPTIONS /api/v1/auth/login` 返回 `400`：
  `CORS_ORIGINS` 没包含当前前端来源；本地开发建议同时包含 `localhost` 与 `127.0.0.1`。
- 登录后停在 `/login`，且 API 日志出现 `POST /auth/login 404`：
  检查 `VITE_API_BASE_URL` 是否为 `http://127.0.0.1:8000/api/v1`。
- 登录成功但会话像“没登录”：
  避免浏览器/API 混用 `localhost` 和 `127.0.0.1`，两边请保持同一主机名。
- `/health/ready` 或 `/auth/login` 返回 `503`：
  说明 PostgreSQL/Redis 不可用或连接配置错误。
- `8000` 或 `5173` 端口被占用：
  先停止现有进程，或改端口并同步修改环境变量。

## 环境变量

### API（`apps/api/.env`）

必填项：

- `POSTGRES_DSN`（示例：`postgresql+asyncpg://postgres:postgres@localhost:5432/auto_trade`）
- `REDIS_URL`（示例：`redis://localhost:6379/0`）
- `OWNER_PASSWORD_HASH`（Argon2 哈希）

常用项：

- `APP_ENV`、`APP_HOST`、`APP_PORT`、`API_PREFIX`
- `CORS_ORIGINS`（默认：`http://localhost:5173`）
- `AUTO_CREATE_SCHEMA`（默认：`true`）

### Web（`apps/web/.env`）

- `VITE_DATA_SOURCE` = `mock` 或 `api`
- `VITE_API_BASE_URL` = API 前缀基址（默认 `/api/v1`）
- `VITE_ENABLE_SSE` = `true` 或 `false`

## API 概览

当前稳定基础接口：

- 健康检查：`/health/live`、`/health/ready`、`/health/deps`
- 认证：`/api/v1/auth/login`、`/api/v1/auth/session`、`/api/v1/auth/logout`
- 运行时设置：`/api/v1/settings/runtime`
- 日志：`/api/v1/logs`
- SSE：`/api/v1/events/stream`

用于前端联调的兼容接口（Phase 2 范围）：

- `/api/v1/overview/summary`
- `/api/v1/channels`（list/create/patch）
- `/api/v1/manual-confirmations`
- `/api/v1/orders`、`/api/v1/fills`、`/api/v1/real-positions`、`/api/v1/virtual-positions`

Phase 3 intake 最小可运行接口：

- `/api/v1/intake/channels`（list/create/patch）
- `/api/v1/intake/channels/{channel_id}/sync`

说明：部分兼容资源当前仍为占位/空响应，会在后续阶段逐步补齐。

## 常用命令

### API

```bash
cd apps/api
python -m pytest tests/unit -q
python -m pytest tests/integration -q
python -m pytest tests/integration/test_phase3_manual_checks_auto.py -q
python -m pytest tests -q
```

### Web

```bash
cd apps/web
npm run typecheck
npm run build
```

API 模式下 E2E 示例：

```bash
cd apps/web
npx playwright test tests/phase-4-3-api-real-backend.spec.ts --workers=1
npx playwright test tests/phase-2-manual-checks-real-backend.spec.ts --workers=1
```

## 文档入口

- 项目范围与说明：`docs/project-spec.md`、`docs/requirements-v1.md`
- 阶段交付状态：`docs/project-phase-checklist.md`
- 测试清单：`docs/project-phase-test-checklist.md`
- 技术设计索引：`docs/technical-design/README.md`
