# 10. 后端基础骨架设计（Phase 2）

## 1. 文档定位

本章是 Phase 2（后端基础骨架与控制台接线）的父文档，负责说明后端在 V1 第二阶段的定位、交付边界、实施顺序和子文档地图。

本章不直接展开所有实现细节，而是把 Phase 2 需要先冻结的内容收口为六类：

- 服务架构与工程骨架
- 后端能力分块与主流程
- 认证与安全基线
- API 与 SSE 契约草案
- 实现现状记录
- 实施级工程规范

具体字段、状态机、错误码和验收口径在 `backend-foundation/` 子目录维护。

## 2. 设计目标

Phase 2 的目标不是打通完整交易闭环，而是把“可联调的后端最小底座”稳定下来，使前端从 `mock` 过渡到首批真实接口时不需要推翻页面结构。

本阶段必须同时满足以下目标：

- 建立可持续扩展的 FastAPI 工程骨架。
- 落地 PostgreSQL、Redis 与配置分层能力。
- 落地单用户登录、会话、限流和失败锁定基线。
- 提供前端首批可接入的设置、日志和实时流通道。
- 提供可直接接 CI 和人工联调的健康检查与可观测基线。

## 3. 当前已确认范围（Phase 2）

根据 `requirements-v1.md` 第 `11.3` 节，本阶段建议交付清单为：

- 后端项目初始化
- 数据库与基础配置系统
- 单用户登录认证
- 会话管理、限流、失败锁定
- 基础设置接口
- 基础日志接口或实时推送通道
- 前后端基础联调

本阶段默认包含的关键接口能力：

- `GET /health/live`
- `GET /health/ready`
- `GET /health/deps`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/settings/runtime`
- `PUT /api/v1/settings/runtime`
- `GET /api/v1/logs`
- `GET /api/v1/events/stream`

## 4. 总体技术路线

Phase 2 推荐沿用总设计中的模块化单体路线：

- 框架：`FastAPI`
- 主存储：`PostgreSQL`
- 临时协调：`Redis`
- 实时推送：优先 `SSE`
- 数据迁移：`Alembic`
- 密码哈希：`Argon2id`（或同等级强哈希）

核心策略是“契约先行 + 最小可运行 + 可追溯”，即先稳定契约和边界，再扩展业务模块。

## 5. 跨子文档通用原则

### 5.1 前后端契约先冻结，再并行开发

- 字段、枚举和错误码先在契约文档冻结。
- 接口上线前必须有 mock 对齐和联调回归证据。

### 5.2 配置分层必须从第一天生效

- 机密配置不落前端、不写普通业务表。
- 业务配置通过设置接口管理并保留审计。
- 系统状态由运行时与快照维护，不和业务配置混存。

### 5.3 单用户不等于低安全

- 必须执行强哈希存储、登录限流、失败锁定、会话过期。
- 高风险写操作默认要求审计字段和幂等键。

### 5.4 观察性先于功能堆叠

- 未打通健康检查、结构化日志、关联 ID 前，不进入下一阶段核心链路开发。

### 5.5 可恢复优先于“看起来能跑”

- 所有状态变更都应可追溯。
- 关键状态应可在重启后恢复，不依赖内存临时态。

## 6. 子文档地图

- [backend-foundation/01-service-architecture.md](./backend-foundation/01-service-architecture.md)：服务拓扑、工程结构、依赖注入、健康检查和降级边界
- [backend-foundation/02-capability-and-flow-specs.md](./backend-foundation/02-capability-and-flow-specs.md)：Phase 2 能力分块、主流程、状态转换和异常路径
- [backend-foundation/03-auth-and-security-baseline.md](./backend-foundation/03-auth-and-security-baseline.md)：登录认证、会话、限流、锁定、审计与安全基线
- [backend-foundation/04-api-contract-draft.md](./backend-foundation/04-api-contract-draft.md)：Phase 2 REST 与 SSE 契约、对象模型和错误码草案
- [backend-foundation/05-backend-implementation-notes.md](./backend-foundation/05-backend-implementation-notes.md)：后端实现现状、差距和落地文件建议
- [backend-foundation/06-backend-engineering-spec.md](./backend-foundation/06-backend-engineering-spec.md)：实施级后端规范（工程、配置、事务、安全、测试、验收）

## 7. 实施顺序

Phase 2 建议按以下顺序推进：

1. 先建后端工程骨架、配置系统、数据库迁移和健康检查。
2. 再落地认证、会话、限流、锁定与审计基线。
3. 然后实现设置接口、日志查询和 SSE 实时通道。
4. 最后执行前后端最小联调并补齐测试证据。

## 8. 与前端的主要边界

Phase 2 对前端的边界承诺如下：

- 返回包络、错误码和枚举语义稳定。
- `settings/runtime` 可读可写且具备基本校验。
- `logs` 与 `events/stream` 字段口径一致，可用于日志页与顶栏状态联动。
- 会话接口可明确反映登录、过期和锁定状态。
- 健康状态可直接投喂前端壳层（`healthy`、`degraded`、`down`）。

## 9. 非目标

以下内容不属于 Phase 2 交付范围：

- Telegram 抓取与消息标准化落地
- AI 决策和人工确认闭环实现
- OKX 订单执行与状态同步落地
- 虚拟子仓位账本与 PnL 实现
- OpenClaw 能力交付

Phase 2 的成功标准是“后端底座稳定且可联调”，不是“全链路可交易”。
