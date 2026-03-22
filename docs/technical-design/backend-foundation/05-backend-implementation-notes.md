# 05. 后端实现记录

## 1. 文档目的

本文件记录 Phase 2 后端当前实现快照，作为“现实状态基线”。

实施规则、跨文档对齐和验收要求以 [06-backend-engineering-spec.md](./06-backend-engineering-spec.md) 为准。

本文件只回答三个问题：

1. 当前后端代码已经实现到哪一层。
2. 当前实现与 Phase 2 目标差距在哪里。
3. 下一阶段应优先修改哪些目录和文件。

## 2. 代码快照（2026-03-22）

### 2.1 工程现状

- 当前仓库仅有 `apps/web` 前端工程。
- 尚未落地 `apps/api` 后端工程目录。
- 尚未落地数据库迁移、认证模块、设置接口和日志/SSE 接口。

### 2.2 已完成的前置条件

- Phase 1 前端原型和 API 切换能力已准备。
- 前端文档与契约草案已可作为后端实现输入。
- 技术设计总览已明确 Phase 2 边界和实施顺序。

## 3. 与 Phase 2 目标差距

### 3.1 基础设施差距

- 未初始化 FastAPI 工程。
- 未接入 PostgreSQL 连接与迁移体系。
- 未接入 Redis 连接与可用性检测。
- 未提供健康检查接口。

### 3.2 认证安全差距

- 未落地密码哈希存储。
- 未落地会话签发与会话校验。
- 未落地登录限流与失败锁定。
- 未落地认证审计记录。

### 3.3 接口与联调差距

- 未实现 `settings/runtime` 读写。
- 未实现 `logs` 查询。
- 未实现 `events/stream` SSE。
- 未完成前后端 `api` 模式联调。

## 4. Phase 2 首批落地建议

### 4.1 建议新增目录

- `apps/api/app/api/routes`
- `apps/api/app/core`
- `apps/api/app/db`
- `apps/api/app/services`
- `apps/api/app/schemas`
- `apps/api/tests`

### 4.2 建议首批文件

- `apps/api/app/main.py`
- `apps/api/app/core/config.py`
- `apps/api/app/core/errors.py`
- `apps/api/app/api/routes/health.py`
- `apps/api/app/api/routes/auth.py`
- `apps/api/app/api/routes/settings.py`
- `apps/api/app/api/routes/logs.py`
- `apps/api/app/api/routes/events.py`

### 4.3 建议首批迁移对象

- `settings`
- `system_logs`
- `operator_actions`
- `auth_sessions`（或等效会话表）

说明：

- 用户只有一个账号时，密码哈希可先由部署脚本注入，不强制首版做“用户管理”页面。

## 5. 里程碑建议

M1（基础可运行）：

- API 能启动。
- `health/live`、`health/ready` 可用。
- DB/Redis 连通性检查通过。

M2（安全基线）：

- 登录/登出/会话接口可用。
- 限流与锁定生效。
- 审计日志落地。

M3（联调基线）：

- `settings/runtime` 读写可用。
- `logs` 查询可用。
- `events/stream` 可用。
- 前端 `VITE_DATA_SOURCE=api` 基础页面可跑通。

## 6. 风险与注意事项

当前主要风险：

- 若先写业务模块再补认证，会引入大量返工。
- 若未先冻结错误码，前后端联调会重复修改。
- 若缺少审计字段，后续高风险动作难以追溯。

建议：

- 先完成 Phase 2 契约与实施规范，再进入大规模编码。
- 每个里程碑结束后同步更新本文件，避免文档失真。
