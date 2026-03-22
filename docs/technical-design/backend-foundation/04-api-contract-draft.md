# 04. Phase 2 API 与 SSE 契约草案

## 1. 目标

本文件用于冻结 Phase 2 的后端最小契约，覆盖：

- 认证与会话
- 运行时设置
- 日志查询
- 实时事件流（SSE）
- 健康检查

说明：

- 本文件是后端落地视角的契约草案。
- 与前端文档 [web-console/04-api-contract-draft.md](../web-console/04-api-contract-draft.md) 存在重叠时，以本文件 Phase 2 落地口径为准并同步回写前端文档。

## 2. 通用约定

### 2.1 路径前缀

- REST：`/api/v1/...`
- SSE：`/api/v1/events/stream`
- 健康检查：`/health/...`

### 2.2 认证方式

- 单用户会话认证。
- 登录成功后下发 `HttpOnly` cookie。
- 受保护接口在无效会话时返回 `UNAUTHORIZED`。

### 2.3 响应包络

统一结构：

```json
{
  "data": {},
  "meta": {
    "request_id": "req_123",
    "server_time": "2026-03-22T12:00:00Z"
  },
  "error": null
}
```

业务错误：

```json
{
  "data": null,
  "meta": {
    "request_id": "req_123",
    "server_time": "2026-03-22T12:00:00Z"
  },
  "error": {
    "code": "UNAUTHORIZED",
    "message": "会话已失效"
  }
}
```

### 2.4 字段约定

- 时间：ISO 8601 UTC 字符串。
- 价格、数量、金额：字符串。
- 布尔字段显式命名，不使用数字枚举替代。
- 关键写操作建议支持 `X-Idempotency-Key`。

### 2.5 审计与关联请求头

建议支持以下透传头：

- `X-Operator-Source`：如 `web-console`
- `X-Correlation-Id`
- `X-Idempotency-Key`
- `X-Audit-Action`
- `X-Audit-Target`

后端对未知头字段应忽略而非报错。

## 3. 接口清单（Phase 2）

| 类别 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 健康 | `GET` | `/health/live` | 进程存活检查 |
| 健康 | `GET` | `/health/ready` | 依赖就绪检查 |
| 健康 | `GET` | `/health/deps` | 依赖明细状态 |
| 认证 | `POST` | `/api/v1/auth/login` | 登录 |
| 认证 | `POST` | `/api/v1/auth/logout` | 登出 |
| 认证 | `GET` | `/api/v1/auth/session` | 会话事实 |
| 设置 | `GET` | `/api/v1/settings/runtime` | 读取运行时设置 |
| 设置 | `PUT` | `/api/v1/settings/runtime` | 更新运行时设置 |
| 日志 | `GET` | `/api/v1/logs` | 日志筛选查询 |
| 事件 | `GET` | `/api/v1/events/stream` | SSE 事件流 |

## 4. 关键对象定义

### 4.1 Login Request

```json
{
  "password": "123456"
}
```

### 4.2 Login Response

```json
{
  "authenticated": true,
  "lock_remaining_seconds": 0
}
```

### 4.3 Session Object

```json
{
  "user_label": "owner",
  "authenticated": true,
  "environment": "paper",
  "global_trading_enabled": true,
  "health_status": "healthy",
  "pending_manual_confirmation_count": 0,
  "session_expires_at": "2026-03-22T14:00:00Z"
}
```

### 4.4 Runtime Settings Object

```json
{
  "environment": "paper",
  "global_trading_enabled": true,
  "model_name": "gpt-5",
  "reasoning_level": "medium",
  "default_leverage": "25",
  "new_position_size_min_pct": "0.40",
  "new_position_size_max_pct": "0.80",
  "context_window_size": 8,
  "updated_at": "2026-03-22T12:00:00Z"
}
```

### 4.5 Log Item Object

```json
{
  "log_id": "log_1",
  "timestamp": "2026-03-22T12:00:00Z",
  "level": "info",
  "module": "auth-core",
  "environment": "paper",
  "channel_id": null,
  "channel_name": null,
  "message": "登录成功",
  "correlation_id": "corr_123"
}
```

### 4.6 Logs Response Page

```json
{
  "items": [],
  "page": {
    "next_cursor": "cursor_abc",
    "has_more": true
  }
}
```

## 5. 端点细节

### 5.1 `POST /api/v1/auth/login`

行为：

- 校验密码格式（`6` 位数字）。
- 判断是否锁定。
- 成功则创建会话并写 cookie。
- 失败返回失败码并更新失败计数。

成功响应 `data`：

```json
{
  "authenticated": true,
  "lock_remaining_seconds": 0
}
```

### 5.2 `POST /api/v1/auth/logout`

行为：

- 失效当前会话。
- 清除 cookie。

成功响应 `data`：

```json
{
  "success": true
}
```

### 5.3 `GET /api/v1/auth/session`

行为：

- 返回当前会话与壳层摘要字段。

### 5.4 `GET /api/v1/settings/runtime`

行为：

- 返回当前运行时设置快照。

### 5.5 `PUT /api/v1/settings/runtime`

行为：

- 校验枚举和区间。
- 写入后返回最新快照。
- 写入审计。

### 5.6 `GET /api/v1/logs`

查询参数建议：

- `cursor`
- `limit`
- `level`
- `module`
- `environment`
- `channel_id`
- `correlation_id`
- `time_from`
- `time_to`

### 5.7 `GET /api/v1/events/stream`

返回：

- `Content-Type: text/event-stream`
- 支持心跳事件、日志新增事件、系统状态事件。

## 6. SSE 事件类型

推荐事件类型：

- `system.heartbeat`
- `log.created`
- `system.status.changed`
- `settings.runtime.updated`

推荐 `log.created` 数据体：

```json
{
  "type": "log.created",
  "event_id": "evt_1",
  "occurred_at": "2026-03-22T12:00:00Z",
  "payload": {
    "log_id": "log_1",
    "level": "info",
    "module": "auth-core",
    "environment": "paper",
    "message": "登录成功",
    "correlation_id": "corr_123"
  }
}
```

## 7. 错误码草案

认证与会话：

- `UNAUTHORIZED`
- `AUTH_INVALID_PASSWORD`
- `AUTH_ACCOUNT_LOCKED`
- `AUTH_RATE_LIMITED`
- `AUTH_SESSION_EXPIRED`

设置：

- `SETTINGS_VALIDATION_ERROR`
- `SETTINGS_CONFLICT`
- `SETTINGS_FORBIDDEN_FIELD`

日志与流：

- `LOGS_INVALID_QUERY`
- `SSE_NOT_AVAILABLE`
- `SSE_UNAUTHORIZED`

系统：

- `DEPENDENCY_UNAVAILABLE`
- `INTERNAL_ERROR`

## 8. 健康检查返回建议

`/health/live`：

```json
{
  "status": "live"
}
```

`/health/ready`：

```json
{
  "status": "ready",
  "checks": {
    "postgres": "ok",
    "redis": "ok"
  }
}
```

`/health/deps`：

```json
{
  "dependencies": [
    {
      "name": "postgres",
      "status": "ok",
      "checked_at": "2026-03-22T12:00:00Z"
    },
    {
      "name": "redis",
      "status": "ok",
      "checked_at": "2026-03-22T12:00:00Z"
    }
  ]
}
```

## 9. 兼容性与版本管理

版本管理建议：

- Phase 2 不强制引入 `v2` 路径，但必须维护变更记录。
- 删除字段前应先完成前端兼容窗口。
- 新增字段默认向后兼容，前端未识别字段应忽略。

变更流程建议：

1. 先更新本契约文档。
2. 再更新前端契约草案和类型定义。
3. 最后执行联调回归。
