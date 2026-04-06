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

### 3.7 Telegram 接入关键字段（Phase 3 最小落地）

以下是 Phase 3 建议先明确的最小字段口径，便于与 `03-telegram-intake.md` 对齐。

`source_cursors`（每来源一条）：

- `channel_source_id`（唯一）
- `last_seen_source_message_id`
- `last_processed_source_message_id`
- `last_fetched_at`、`last_success_at`
- `last_error_at`、`last_error_code`、`last_error_message`
- `consecutive_failures`

`raw_messages`（抓取证据流）：

- `channel_id`、`channel_source_id`、`source_type`
- `source_message_id`
- `raw_content`
- `content_hash`
- `fetched_at`
- `detected_change_type`（`new`/`edited`/`unchanged`/`parse_error`）
- `raw_payload_ref`
- `parser_version`
- `correlation_id`

`normalized_messages`（来源消息主记录）：

- `channel_id`、`source_type`、`source_message_id`
- `current_version_no`
- `current_content`
- `visible_at`
- `message_status`
- `ready_for_decision`
- `latest_raw_message_id`
- `correlation_id`

`message_versions`（版本历史）：

- `normalized_message_id`
- `version_no`
- `content`
- `content_hash`
- `source_edit_token`
- `diff_summary`
- `created_at`

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

- `source_cursors(channel_source_id)`：唯一，保证来源级 cursor 唯一
- `normalized_messages(channel_id, source_type, source_message_id)`：唯一，锁定同一来源消息主记录
- `message_versions(normalized_message_id, version_no)`：唯一，保证版本号递增唯一
- `message_versions(normalized_message_id, content_hash)`：建议唯一（或等效逻辑），避免相同正文重复版本化
- `raw_messages` 默认不建议对 `source_message_id` 做硬唯一，以保留重复抓取证据；如需防重复写入，可引入独立 `idempotency_key`

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

- `source_cursors(channel_source_id)`（唯一索引）
- `raw_messages(channel_id, fetched_at desc)`
- `raw_messages(channel_source_id, source_message_id, fetched_at desc)`
- `raw_messages(correlation_id, created_at asc)`
- `normalized_messages(channel_id, source_type, source_message_id)`（唯一索引）
- `normalized_messages(channel_id, ready_for_decision, updated_at desc)`
- `message_versions(normalized_message_id, version_no desc)`
- `message_versions(normalized_message_id, content_hash)`
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

- 原始消息入库 + 标准化消息入库 + 版本入库 + cursor 推进
- 人工确认结果写入 + 决策状态更新
- 成交回报入库 + 订单状态更新 + 虚拟事件写入

补充建议：

- 对 `normalized_messages` 的 upsert 建议使用行级锁（或等效串行化策略），避免并发抓取导致版本号竞争。
- cursor 推进必须在消息主事务成功后进行，避免“cursor 前移但数据未落库”的不可恢复状态。

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
