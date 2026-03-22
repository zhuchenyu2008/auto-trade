# 06. 后端实施级技术规范（Phase 2）

## 1. 文档定位

本文件是 Phase 2 的“实施级”后端规范，目标是把架构、流程、安全、契约与验收拉通，形成可直接指导实现与联调的统一基线。

本文件重点回答：

- 后端工程应如何组织，才能在后续 Phase 3+ 持续扩展且避免返工。
- 认证、会话、限流、设置、日志和 SSE 在实现层面应如何统一落地。
- 测试与验收应如何与清单对应，确保完成定义可判定。

### 1.1 输入文档

本规范以以下文档为输入并保持一致：

- [V1 需求文档](../../requirements-v1.md)
- [项目说明文档](../../project-spec.md)
- [技术设计总览](../README.md)
- [01-system-architecture.md](../01-system-architecture.md)
- [02-data-and-state.md](../02-data-and-state.md)
- [09-deployment-and-observability.md](../09-deployment-and-observability.md)
- [10-backend-foundation.md](../10-backend-foundation.md)
- [01-service-architecture.md](./01-service-architecture.md)
- [02-capability-and-flow-specs.md](./02-capability-and-flow-specs.md)
- [03-auth-and-security-baseline.md](./03-auth-and-security-baseline.md)
- [04-api-contract-draft.md](./04-api-contract-draft.md)
- [05-backend-implementation-notes.md](./05-backend-implementation-notes.md)
- [web-console/06-frontend-engineering-spec.md](../web-console/06-frontend-engineering-spec.md)

### 1.2 生效范围

- 生效阶段：Phase 2（后端基础骨架与控制台接线）。
- 生效对象：`apps/api` 后端工程、后端接口契约、联调基线测试。
- 非目标：不在本阶段实现 Telegram 抓取、AI 决策、OKX 执行和账本主链路。

### 1.3 版本约束

- 本文档发布日期基线：`2026-03-22`。
- 若变更字段、错误码、认证策略或健康检查语义，必须先更新本文档再改代码。

## 2. 全局约束与术语

### 2.1 已确认业务边界（后端必须显式体现）

- 单用户系统。
- 登录认证为 `6` 位密码。
- 登录安全包含限流、失败锁定、会话管理。
- 设置接口与日志接口是 Phase 2 首批真实联调入口。
- 健康检查至少覆盖 `live`、`ready`、`deps`。

### 2.2 术语口径

- `request_id`：每个请求唯一追踪号。
- `correlation_id`：业务链路关联号，可跨请求复用。
- `runtime_settings`：运行参数配置集合。
- `operator_actions`：人工或系统触发的可审计动作记录。

## 3. 工程架构规范

### 3.1 工程位置

- 后端工程根目录：`apps/api`
- 启动入口：`apps/api/app/main.py`
- 路由入口：`apps/api/app/api/routes`
- 配置入口：`apps/api/app/core/config.py`

### 3.2 分层约束

- 路由层：参数校验、协议映射、响应包络，不写业务规则。
- 服务层：业务规则和事务编排。
- 仓储层：数据库读写与查询封装。
- 基础层：安全、日志、错误码、限流、幂等、实时通道。

### 3.3 中间件约束

必须具备以下中间件能力：

- `request_id` 注入。
- `correlation_id` 注入与透传。
- 统一异常处理。
- 结构化访问日志。

## 4. 配置分层规范

### 4.1 配置分层

- 机密配置：会话签名密钥、数据库密码、Redis 密码。
- 业务配置：模型、思考等级、默认杠杆、上下文窗口、交易开关。
- 系统状态：健康摘要、队列状态、最后错误摘要。

### 4.2 加载优先级

推荐优先级：

1. 运行环境变量。
2. `.env`（开发环境）。
3. 默认值（仅允许安全无风险字段）。

### 4.3 严格校验

- 缺少关键机密配置时应在启动阶段失败。
- 配置类型错误时禁止降级为隐式默认值。

## 5. 数据访问与事务规范

### 5.1 存储职责

- PostgreSQL：主事实与审计记录。
- Redis：限流、锁定、SSE 广播与短时状态。

### 5.2 事务边界

以下操作必须单事务：

- 设置写入 + 审计写入。
- 登录失败计数变更 + 锁定状态更新。
- 登出 + 会话失效。

### 5.3 一致性约束

- 写失败必须返回明确错误，不得“假成功”。
- 审计失败时写操作应按策略回滚或显式标记为不完整。

## 6. 认证与安全实现规范

### 6.1 密码校验

- 输入必须为 `6` 位数字。
- 哈希校验必须使用强哈希算法（推荐 `Argon2id`）。

### 6.2 会话策略

- 使用 `HttpOnly` cookie。
- 支持会话过期和主动失效。
- `/api/v1/auth/session` 必须返回前端壳层所需摘要。

### 6.3 限流与锁定

- 登录接口必须启用限流。
- 连续失败达到阈值触发锁定。
- 锁定剩余时间应可返回给前端展示。

### 6.4 审计与日志

以下行为必须记审计：

- 登录成功/失败
- 锁定触发/解除
- 登出
- 设置变更

## 7. API 与 SSE 实现规范

### 7.1 包络规范

所有业务接口统一返回 `data/meta/error` 包络。

`meta` 至少包含：

- `request_id`
- `server_time`

### 7.2 接口实现范围

Phase 2 必须落地：

- `/health/live`
- `/health/ready`
- `/health/deps`
- `/api/v1/auth/login`
- `/api/v1/auth/logout`
- `/api/v1/auth/session`
- `/api/v1/settings/runtime`（GET/PUT）
- `/api/v1/logs`
- `/api/v1/events/stream`

### 7.3 SSE 规范

- 使用 `text/event-stream`。
- 至少推送 `system.heartbeat` 与 `log.created`。
- SSE 鉴权失败返回标准错误码。
- 连接中断时服务端应支持安全重连语义。

### 7.4 错误码规范

- 错误码必须稳定且可文档化。
- 不同错误场景不得共用含义冲突的错误码。
- 错误码变更必须同步更新契约文档和前端映射。

## 8. 可观测性与审计规范

### 8.1 日志结构

关键日志字段：

- `timestamp`
- `level`
- `module`
- `request_id`
- `correlation_id`
- `environment`
- `message`

### 8.2 健康检查行为

- `live` 不依赖外部资源。
- `ready` 失败时应返回 `503`。
- `deps` 输出依赖细项用于排障。

### 8.3 审计可追溯

- 审计记录必须可按 `request_id` 或 `correlation_id` 回查。
- 审计表禁止写入敏感明文内容。

## 9. 测试与验收规范

### 9.1 AI 自动化测试（Phase 2）

必须覆盖：

- 服务可启动与健康检查。
- DB/Redis 不可用时 `ready` 失败。
- 密码哈希校验和会话过期。
- 限流与失败锁定。
- 设置接口读写与校验失败路径。
- 日志查询与 SSE 连接路径。

### 9.2 人工测试（Phase 2）

必须覆盖：

- 正确登录、错误登录、锁定和解锁流程。
- 会话过期后受保护接口被拒绝。
- 前端可读取并更新设置，刷新后值保持。
- 日志页可看到最新日志，SSE 断线后可恢复。

### 9.3 证据要求

每个测试步骤至少保留一类证据：

- 命令输出
- 接口响应样例
- 页面截图
- 关联 `request_id` 或 `correlation_id`

## 10. 交付顺序与完成定义

### 10.1 实施顺序

1. 建立工程骨架、配置和健康检查。
2. 落地认证、会话、限流和锁定。
3. 落地设置接口和审计。
4. 落地日志查询和 SSE。
5. 执行前后端联调和 Phase 2 双测。

### 10.2 完成定义（DoD）

满足以下条件可判定 Phase 2 后端达标：

- `apps/api` 可稳定启动，健康检查语义正确。
- 认证与安全基线完整可用。
- 设置、日志、SSE 能支撑前端首批联调。
- 文档、实现、测试记录保持一致。

未满足以上任一条，不应进入 Phase 3 主链路开发。
