# 02. 数据与状态设计

## 1. 设计目标

数据设计需要同时满足四件事：

- 能支撑实时交易链路
- 能支撑重启恢复
- 能支撑问题追查
- 能支撑频道级虚拟账本解释

因此 V1 的数据设计必须同时具备“事件流”和“快照”两层。

## 2. 存储分层

### 2.1 PostgreSQL

PostgreSQL 是主事实源，负责保存：

- 配置和频道信息
- 原始消息、标准化消息和版本
- AI 决策和人工确认
- 真实订单和真实成交
- 虚拟子仓位和账本事件
- 审计日志和系统日志
- 账户 / 持仓 / PnL 快照

### 2.2 Redis

Redis 只负责临时协调，不保存最终业务事实。建议用途包括：

- 频道抓取互斥锁
- 幂等去重短键
- 临时任务队列
- 实时日志 / 状态广播
- 短时缓存，例如 OKX instruments

## 3. 表分组

### 3.1 配置组

- `channels`
- `channel_sources`
- `source_cursors`
- `settings`

### 3.2 消息组

- `raw_messages`
- `normalized_messages`
- `message_versions`

### 3.3 决策组

- `ai_decisions`
- `manual_reviews`

### 3.4 执行组

- `exchange_orders`
- `exchange_fills`
- `exchange_position_snapshots`
- `account_snapshots`

### 3.5 账本组

- `virtual_positions`
- `virtual_position_events`
- `pnl_snapshots`

### 3.6 日志与审计组

- `system_logs`
- `operator_actions`

## 4. 关键状态设计原则

### 4.1 原始数据不可覆盖

- 原始消息默认只新增不覆盖。
- 消息版本默认只新增不覆盖。
- 成交记录默认只新增不覆盖。

### 4.2 快照不替代事件

- `account_snapshots` 和 `exchange_position_snapshots` 只用于恢复和展示。
- 最终账本解释仍应依赖订单 / 成交 / 事件流。

### 4.3 虚拟状态与真实状态分离

- `exchange_*` 表表达交易所事实。
- `virtual_*` 表表达频道视角。
- 两者必须能映射，但不能混写成一层。

## 5. 唯一键与幂等约束建议

### 5.1 消息侧

- `channel_id + source_message_id`：锁定同一来源消息
- `channel_id + source_message_id + source_edit_version`：锁定消息版本

### 5.2 决策侧

- `decision_id` 全局唯一
- 待确认项应对“当前有效确认记录”设置唯一约束或等效限制

### 5.3 订单侧

- `cl_ord_id + environment`：唯一
- `okx_ord_id + environment`：唯一

### 5.4 链路侧

- `correlation_id` 用于串联全链路，不必须全局唯一到极致，但建议按链路唯一生成

## 6. 索引建议

V1 至少应考虑以下常用查询索引：

- `raw_messages(channel_id, fetched_at desc)`
- `normalized_messages(channel_id, source_message_id)`
- `message_versions(normalized_message_id, version_no desc)`
- `ai_decisions(channel_id, created_at desc)`
- `manual_reviews(status, created_at asc)`
- `exchange_orders(environment, status, updated_at desc)`
- `exchange_fills(exchange_order_id, fill_time asc)`
- `virtual_positions(channel_id, status, updated_at desc)`
- `virtual_position_events(virtual_position_id, event_time asc)`
- `system_logs(correlation_id, created_at asc)`

## 7. 事务边界建议

### 7.1 同步事务

适合在一个事务内完成的动作：

- 原始消息入库 + 标准化消息入库 + 版本入库
- 人工确认结果写入 + 决策状态更新
- 成交回报入库 + 订单状态更新 + 虚拟事件写入

### 7.2 异步解耦

不建议强绑在一个事务里的动作：

- 外部 API 调用与日志推送
- OpenClaw topic 发送
- 控制台实时广播

## 8. 数据保留策略建议

V1 建议默认长期保留以下对象：

- 原始消息
- 消息版本
- AI 决策
- 人工确认
- 真实订单和成交
- 虚拟账本事件
- 审计日志

如果未来担心体量，可以对普通系统日志做归档，但不应先删核心交易证据。

## 9. 迁移策略

- 使用 `Alembic` 管理数据库迁移。
- 每个新模块引入表结构时都应附带迁移脚本。
- 高风险表变更应先做兼容迁移，再做字段切换，避免一次性破坏老数据。
