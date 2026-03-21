# 04. Web 控制台 API 契约草案

## 1. 目标

本文件用于支撑“前端优先”实施顺序。其作用不是把后端实现细节写死，而是先冻结前端首批需要依赖的对象结构、字段语义和实时事件类型，保证：

- 原型阶段与开发阶段字段一致
- 前端 mock 数据与后端真实数据形状一致
- 关键状态枚举尽早稳定

## 2. 通用约定

### 2.1 路径前缀

建议统一使用：

- REST：`/api/v1/...`
- SSE：`/api/v1/events/stream`

### 2.2 认证方式

V1 为单用户模式，建议采用服务端会话：

- 登录成功后写入 `HttpOnly` session cookie
- 前端通过 `/api/v1/auth/session` 获取当前会话信息
- 前端不在本地存储敏感 token

### 2.3 响应包络

建议统一采用以下响应结构：

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

出错时：

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

- 时间统一返回 ISO 8601 UTC 字符串
- 金额、价格、数量统一返回字符串，避免精度丢失
- 所有列表对象都应带稳定主键
- 所有关联对象优先暴露 `correlation_id`

### 2.5 首批枚举

建议尽早冻结以下枚举：

- `environment`: `paper` | `live`
- `health_status`: `healthy` | `degraded` | `down`
- `channel_status`: `enabled` | `disabled`
- `manual_confirmation_status`: `pending` | `approved` | `rejected` | `expired` | `invalidated`
- `order_status`: `pending` | `partially_filled` | `filled` | `canceled` | `rejected`
- `position_side`: `long` | `short`

## 3. 首批页面与接口映射

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
      "last_error_summary": null
    }
  ]
}
```

### 4.3 Channel List Item

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

详情对象需额外包含：

- 原始消息
- 上下文摘要
- AI 决策详情
- 关键价格参数
- 失效原因
- 当前可执行性校验结果

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

## 5. 首批 REST 接口草案

### 5.1 认证

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`

`POST /api/v1/auth/login` 请求体建议为：

```json
{
  "password": "123456"
}
```

### 5.2 总览

- `GET /api/v1/overview/summary`

该接口应一次性返回总览页首屏所需的高优先级摘要，避免首页首屏分散请求过多。

### 5.3 频道

- `GET /api/v1/channels`
- `POST /api/v1/channels`
- `PATCH /api/v1/channels/{channel_id}`

若首轮暂不做硬删除，则不提供物理删除接口，改为状态切换或逻辑删除字段。

### 5.4 日志

- `GET /api/v1/logs`

建议支持以下查询参数：

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

批准与拒绝动作建议幂等。若确认项已失效，应返回明确错误码，而不是静默成功。

### 5.6 订单与持仓

- `GET /api/v1/orders`
- `GET /api/v1/fills`
- `GET /api/v1/real-positions`
- `GET /api/v1/virtual-positions`

### 5.7 设置

- `GET /api/v1/settings/runtime`
- `PUT /api/v1/settings/runtime`

运行设置对象建议至少包含：

- 当前环境
- 全局交易开关
- 模型
- 思考等级
- 默认杠杆
- 人工确认阈值
- 上下文窗口长度
- 新开仓资金比例范围

## 6. SSE 事件草案

建议 V1 使用统一事件流：

- `GET /api/v1/events/stream`

首批事件类型建议包括：

- `system.snapshot_updated`
- `log.appended`
- `channel.health_changed`
- `manual_confirmation.changed`
- `order.changed`
- `virtual_position.changed`

事件格式建议如下：

```json
{
  "event_type": "log.appended",
  "occurred_at": "2026-03-21T08:00:00Z",
  "payload": {
    "log_id": "log_1",
    "correlation_id": "corr_123"
  }
}
```

前端应根据 `event_type` 做局部刷新，而不是每次事件都全页重拉。

## 7. 前端优先阶段的 mock 规则

在后端未完成前，前端 mock 数据必须遵守以下规则：

- 字段名与枚举值严格复用本文件
- 假数据也保留 `correlation_id`
- 假数据中也区分 `paper` 与 `live`
- 假数据中也区分真实对象与虚拟对象

这样后续从 mock 切换到真实接口时，只需要替换数据源，不需要重写页面语义。
