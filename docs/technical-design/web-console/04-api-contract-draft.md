# 04. Web 控制台 API 契约草案

## 1. 目标

本文件用于支撑“前端优先”实施顺序，冻结前端首批依赖的对象结构、字段语义、实时事件类型和错误处理口径，保证：

- 原型阶段与开发阶段字段一致。
- 前端 mock 数据与后端真实数据形状一致。
- 首批枚举、分页、幂等、错误码和 SSE 语义尽早稳定。

> 说明：本文件是 V1 契约草案。若与需求文档冲突，以需求边界为准并回写本文件。

## 2. 通用约定

### 2.1 路径前缀

- REST：`/api/v1/...`
- SSE：`/api/v1/events/stream`

### 2.2 认证方式

V1 为单用户模式，采用服务端会话：

- 登录成功后写入 `HttpOnly` session cookie。
- 前端通过 `GET /api/v1/auth/session` 获取当前会话事实。
- 前端不在本地存储敏感 token。

### 2.3 响应包络

统一响应结构：

```json
{
  "data": {},
  "meta": {
    "request_id": "req_123",
    "server_time": "2026-03-21T08:00:00Z"
  },
  "error": null
}
```

业务错误时：

```json
{
  "data": null,
  "meta": {
    "request_id": "req_123",
    "server_time": "2026-03-21T08:00:00Z"
  },
  "error": {
    "code": "MANUAL_CONFIRMATION_EXPIRED",
    "message": "该确认项已失效"
  }
}
```

### 2.4 字段约定

- 时间：ISO 8601 UTC 字符串。
- 金额、价格、数量：字符串，避免精度丢失。
- 所有列表对象：稳定主键（`*_id`）。
- 链路对象优先暴露 `correlation_id`。
- 涉及交易事实和风险边界的对象必须有 `environment`。

### 2.5 列表分页约定

列表接口统一采用 cursor 分页：

- 请求参数：`cursor`、`limit`（建议默认 50，上限 200）。
- 响应结构：

```json
{
  "items": [],
  "page": {
    "next_cursor": "cursor_abc",
    "has_more": true
  }
}
```

### 2.6 幂等约定

以下写操作建议支持幂等键（建议请求头 `X-Idempotency-Key`）：

- 人工确认通过/拒绝
- 高风险动作（环境切换、全局交易开关）
- 频道新增与编辑

重复请求应返回同一业务结果或明确冲突错误码，不可产生重复副作用。

### 2.7 首批枚举冻结

- `environment`: `paper` | `live`
- `health_status`: `healthy` | `degraded` | `down`
- `channel_status`: `enabled` | `disabled`
- `manual_confirmation_status`: `pending` | `approved` | `rejected` | `expired` | `invalidated`
- `order_status`: `pending` | `partially_filled` | `filled` | `canceled` | `rejected`
- `position_side`: `long` | `short`

### 2.8 审计透传头约定

前端发起关键写操作时，建议透传以下请求头：

- `X-Operator-Source`: 固定 `web-console`
- `X-Idempotency-Key`: 幂等键
- `X-Correlation-Id`: 本次动作链路号
- `X-Audit-Action`: 动作名（如 `channel.create`）
- `X-Audit-Target`: 目标对象（如 `channel_id` / `confirmation_id`）

说明：

- 审计头用于增强后端 `operator_actions` 记录，不替代业务请求体字段。
- 后端若不识别额外头字段，应忽略而不是报错。

## 3. 页面与接口映射

| 页面 | 首批接口 |
| --- | --- |
| 登录页 | `POST /api/v1/auth/login` |
| 全局壳层 | `GET /api/v1/auth/session` |
| 总览页 | `GET /api/v1/overview/summary` |
| 频道页 | `GET /api/v1/channels`、`POST /api/v1/channels`、`PATCH /api/v1/channels/{channel_id}` |
| 日志页 | `GET /api/v1/logs`、`GET /api/v1/events/stream` |
| 人工确认页 | `GET /api/v1/manual-confirmations`、`GET /api/v1/manual-confirmations/{confirmation_id}`、`POST /api/v1/manual-confirmations/{confirmation_id}/approve`、`POST /api/v1/manual-confirmations/{confirmation_id}/reject` |
| 真实订单页 | `GET /api/v1/orders`、`GET /api/v1/fills`、`GET /api/v1/real-positions` |
| 虚拟持仓页 | `GET /api/v1/virtual-positions` |
| 设置页 | `GET /api/v1/settings/runtime`、`PUT /api/v1/settings/runtime` |

## 4. 关键对象草案

### 4.1 Session

```json
{
  "user_label": "owner",
  "authenticated": true,
  "environment": "paper",
  "global_trading_enabled": true,
  "health_status": "healthy",
  "pending_manual_confirmation_count": 2
}
```

### 4.2 Overview Summary

```json
{
  "environment": "paper",
  "global_trading_enabled": true,
  "health_status": "healthy",
  "pending_manual_confirmation_count": 2,
  "recent_alerts": [
    {
      "id": "alert_1",
      "level": "warning",
      "message": "频道 Alpha 最近一次抓取失败",
      "occurred_at": "2026-03-21T07:58:00Z",
      "correlation_id": "corr_123"
    }
  ],
  "channel_summaries": [
    {
      "channel_id": "ch_1",
      "channel_name": "Alpha",
      "status": "enabled",
      "last_fetch_at": "2026-03-21T07:59:30Z",
      "last_success_at": "2026-03-21T07:59:30Z",
      "last_error_summary": null,
      "last_message_result": "new_message_processed"
    }
  ]
}
```

### 4.3 Channel Item

```json
{
  "channel_id": "ch_1",
  "channel_name": "Alpha",
  "source_type": "telegram_web",
  "source_ref": "t.me/s/alpha",
  "status": "enabled",
  "last_fetch_at": "2026-03-21T07:59:30Z",
  "last_success_at": "2026-03-21T07:59:30Z",
  "last_error_summary": null,
  "last_message_result": "new_message_processed"
}
```

### 4.4 Log Item

```json
{
  "log_id": "log_1",
  "timestamp": "2026-03-21T08:00:00Z",
  "level": "info",
  "module": "ai-decision",
  "environment": "paper",
  "channel_id": "ch_1",
  "channel_name": "Alpha",
  "message": "生成结构化决策",
  "correlation_id": "corr_123"
}
```

### 4.5 Manual Confirmation Item

```json
{
  "confirmation_id": "mc_1",
  "status": "pending",
  "channel_id": "ch_1",
  "channel_name": "Alpha",
  "symbol": "BTC-USDT-SWAP",
  "action_type": "open_position",
  "confidence": "0.62",
  "environment": "paper",
  "created_at": "2026-03-21T08:00:00Z",
  "correlation_id": "corr_123"
}
```

详情对象至少补充：

- `raw_message`
- `context_summary`
- `ai_decision`
- `key_price_params`
- `invalid_reason`
- `executable`

### 4.6 Order Item

```json
{
  "order_id": "ord_1",
  "symbol": "BTC-USDT-SWAP",
  "side": "long",
  "status": "pending",
  "price": "84500",
  "quantity": "0.05",
  "environment": "paper",
  "decision_id": "dec_1",
  "correlation_id": "corr_123"
}
```

### 4.7 Virtual Position Item

```json
{
  "virtual_position_id": "vp_1",
  "channel_id": "ch_1",
  "channel_name": "Alpha",
  "symbol": "BTC-USDT-SWAP",
  "side": "long",
  "status": "open",
  "virtual_quantity": "0.05",
  "virtual_avg_price": "84480",
  "realized_pnl": "120.5",
  "unrealized_pnl": "32.1",
  "correlation_id": "corr_123"
}
```

### 4.8 Runtime Settings

```json
{
  "environment": "paper",
  "global_trading_enabled": true,
  "model": "gpt-5.4",
  "reasoning_level": "medium",
  "default_leverage": "25",
  "manual_confirmation_threshold": "0.66",
  "context_window_size": 8,
  "new_position_capital_range": {
    "min": "0.40",
    "max": "0.80"
  }
}
```

说明：该对象仅包含非机密运行参数；`ai_api_key`、`base_url` 等供应商凭据属于部署级机密配置，不通过此对象下发。

## 5. REST 接口草案

### 5.1 认证

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`

`POST /api/v1/auth/login` 请求体：

```json
{
  "password": "123456"
}
```

### 5.2 总览

- `GET /api/v1/overview/summary`

说明：总览接口应一次性返回首屏高优先级摘要，避免页面首屏多请求拼装。

### 5.3 频道

- `GET /api/v1/channels`
- `POST /api/v1/channels`
- `PATCH /api/v1/channels/{channel_id}`

`GET /api/v1/channels` 查询参数建议：

- `status`
- `q`
- `cursor`
- `limit`

`PATCH /api/v1/channels/{channel_id}` 请求体建议支持：

- `channel_name`
- `source_type`
- `source_ref`
- `status`（`enabled` / `disabled`）

### 5.4 日志

- `GET /api/v1/logs`

查询参数建议：

- `from`
- `to`
- `level`
- `module`
- `channel_id`
- `environment`
- `correlation_id`
- `cursor`
- `limit`

### 5.5 人工确认

- `GET /api/v1/manual-confirmations`
- `GET /api/v1/manual-confirmations/{confirmation_id}`
- `POST /api/v1/manual-confirmations/{confirmation_id}/approve`
- `POST /api/v1/manual-confirmations/{confirmation_id}/reject`

约束：

- approve/reject 必须幂等。
- 确认前服务端必须再次校验环境和可执行性。
- 已失效确认项返回明确错误码，不得静默成功。

### 5.6 订单与持仓

- `GET /api/v1/orders`
- `GET /api/v1/fills`
- `GET /api/v1/real-positions`
- `GET /api/v1/virtual-positions`

建议支持通用查询参数：

- `environment`
- `channel_id`（适用时）
- `symbol`（适用时）
- `correlation_id`（适用时）
- `cursor`
- `limit`

### 5.7 设置

- `GET /api/v1/settings/runtime`
- `PUT /api/v1/settings/runtime`

约束：

- 高影响配置修改需要写审计记录。
- 修改结果应返回“已生效”或“生效方式说明”。
- `GET/PUT /settings/runtime` 不返回也不接收 AI API Key / Base URL 等机密字段。

## 6. SSE 事件草案

### 6.1 事件流入口

- `GET /api/v1/events/stream`

### 6.2 首批事件类型

- `system.snapshot_updated`
- `log.appended`
- `channel.health_changed`
- `manual_confirmation.changed`
- `order.changed`
- `virtual_position.changed`

### 6.3 事件结构

```json
{
  "event_id": "evt_1",
  "event_type": "log.appended",
  "occurred_at": "2026-03-21T08:00:00Z",
  "environment": "paper",
  "payload": {
    "log_id": "log_1",
    "correlation_id": "corr_123"
  }
}
```

### 6.4 事件处理约束

- 前端按 `event_type` 局部刷新，不做全页重拉。
- 事件顺序以最终状态一致为准，必要时回读对应 REST。
- SSE 断线后前端可携带 `Last-Event-ID` 重连（若服务端支持）。

## 7. 错误码草案

以下错误码建议在前后端先冻结首批处理语义：

- `SESSION_INVALID`
- `SESSION_LOCKED`
- `RATE_LIMITED`
- `MANUAL_CONFIRMATION_EXPIRED`
- `MANUAL_CONFIRMATION_INVALIDATED`
- `MANUAL_CONFIRMATION_ALREADY_RESOLVED`
- `ENVIRONMENT_MISMATCH`
- `ACTION_NOT_ALLOWED`
- `RISK_CONFIRMATION_REQUIRED`
- `VALIDATION_ERROR`
- `RESOURCE_NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

错误码处理原则：

- 同一错误码在 Web 与 OpenClaw 的用户可见语义应一致。
- 错误对象至少包含 `code`、`message`，可选 `details`。

## 8. 并发与一致性约束

### 8.1 人工确认并发

- 同一确认项只允许一次成功处理。
- 竞争场景返回 `MANUAL_CONFIRMATION_ALREADY_RESOLVED` 或 `CONFLICT`。

### 8.2 环境切换并发

- 切环境属于高风险动作，重复提交不得触发多次状态切换。
- 当前端确认后状态已变化，返回 `CONFLICT` 并附带最新状态。

### 8.3 全局交易开关并发

- 允许幂等操作（重复开启/关闭返回当前状态）。
- 所有变更需写审计。

## 9. 前端优先阶段 mock 规则

后端未完成前，前端 mock 必须遵守：

- 字段名和枚举严格复用本文件。
- mock 也保留 `correlation_id`。
- mock 中明确区分 `paper` 与 `live`。
- mock 中明确区分真实对象与虚拟对象。
- mock 默认值应尽量贴近需求默认值（如默认杠杆、资金比例范围、上下文窗口）。

## 10. 变更控制

- 若新增字段：保持向后兼容并补充默认值语义。
- 若修改枚举：必须同步更新前端类型、页面文案和测试。
- 若删除字段：先标记弃用并经历一个兼容周期。
