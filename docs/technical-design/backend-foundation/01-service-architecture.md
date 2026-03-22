# 01. 后端服务架构与工程骨架

## 1. 目标

本文件定义 Phase 2 后端服务的最小架构基线，目标是：

- 保证后端可稳定启动、可观测、可扩展。
- 保证认证、配置、日志和健康检查能力可独立演进。
- 保证后续接 Telegram、AI、OKX 模块时不推翻基础骨架。

## 2. 运行时角色与边界

Phase 2 最小运行时角色建议如下：

- `api`：FastAPI 主服务，负责认证、设置、日志查询、SSE 推送、健康检查。
- `postgres`：主事实源，保存配置、会话、审计、日志和后续业务表。
- `redis`：限流、锁定、短期会话索引、SSE 广播中转和短时协调。

Phase 2 默认不强制启动独立 `worker`，但应在代码结构预留任务入口。

## 3. 工程目录建议

`apps/api` 建议目录结构如下：

```text
apps/api/
  app/
    main.py
    api/
      deps.py
      routes/
        auth.py
        settings.py
        logs.py
        events.py
        health.py
    core/
      config.py
      security.py
      rate_limit.py
      session.py
      idempotency.py
      logging.py
      errors.py
    db/
      base.py
      models/
      repositories/
      migrations/          # Alembic
    services/
      auth_service.py
      settings_service.py
      logs_service.py
      events_service.py
    schemas/
      common.py
      auth.py
      settings.py
      logs.py
    realtime/
      sse_hub.py
  tests/
    unit/
    integration/
```

目录约束：

- 路由层只做协议转换，不承载业务决策。
- 业务规则放在 `services/`，数据读写收口到 `repositories/`。
- 共享错误码、包络、审计、幂等统一由 `core/` 提供。

## 4. 请求处理链路

标准请求处理链路建议固定为：

1. `middleware` 注入 `request_id`、`correlation_id`、开始时间。
2. 认证中间件解析会话（允许匿名接口跳过）。
3. 路由层完成参数校验和 schema 解析。
4. 服务层执行业务逻辑与事务编排。
5. 仓储层执行 SQL 读写。
6. 统一响应包络输出 `data/meta/error`。
7. 写操作统一写入审计记录与结构化日志。

SSE 链路建议：

1. 建立连接时校验会话。
2. 完成一次初始心跳回包（确认连接成功）。
3. 订阅日志与系统状态事件。
4. 断线后由客户端按退避策略重连。

## 5. 依赖注入与资源生命周期

资源注入建议：

- `DB Session`：按请求注入，响应后释放。
- `Redis Client`：应用级单例，启动时建立连接，关闭时释放。
- `Settings Cache`：可选短缓存，变更后主动失效。
- `SSE Hub`：应用级单例，支持多订阅者广播。

启动与关闭事件建议：

- 启动阶段检查配置完整性，初始化 DB/Redis 连接池。
- 关闭阶段优雅停机，关闭 SSE hub 并释放连接池。

## 6. 健康检查设计

Phase 2 必须提供：

- `GET /health/live`：仅表示进程是否活着，不依赖外部服务。
- `GET /health/ready`：至少探测 PostgreSQL、Redis 连通性。
- `GET /health/deps`：返回依赖摘要，供调试和排障。

判定建议：

- `live` 只要进程响应即返回 `200`。
- `ready` 任一核心依赖不可用返回 `503`。
- `deps` 可返回结构化依赖状态，不作为负载均衡硬探针。

## 7. 错误处理与降级边界

统一错误策略：

- 所有业务错误转成标准错误码。
- 不向前端回传堆栈和敏感配置。
- 对未知异常返回 `INTERNAL_ERROR` 并记录 `request_id`。

降级策略建议：

- Redis 故障时：读接口可降级，登录限流和锁定功能应返回显式受限提示。
- PostgreSQL 故障时：`ready` 必须失败，写接口禁止“假成功”。
- SSE 故障时：返回标准错误并允许前端回退轮询。

## 8. 本地启动基线

最小本地联调基线：

- `postgres`、`redis` 可本机或容器启动。
- `api` 进程可加载 `.env` 并启动成功。
- 访问 `/health/live` 与 `/health/ready` 可得到可区分结果。
- 认证、设置、日志、SSE 路由可完成最小冒烟验证。

达到该基线后，才进入 Phase 2 的前后端联调和细化测试。
