# 项目说明文档

## 1. 项目目标

本项目用于搭建一套从 Telegram 频道监控、AI 解析、OKX 自动下单与跟进、到 Web 控制台和 OpenClaw 协作运维的自动交易系统。

V1 目标如下：

1. 监控一个或多个 Telegram 频道，默认每 30 秒抓取一次。
2. 识别新消息与编辑后的消息。
3. 将同一频道内的多条上下文消息发送给 AI 做结构化理解。
4. 基于 AI 决策调用 OKX API 自动执行合约交易。
5. 通过 Web 控制台动态管理频道、模型、思考等级、模拟/实盘、日志、仓位、盈亏等。
6. 制作一个 OpenClaw 可用的项目 skill，并在 Telegram 群组 topic 中部署一个小 claw，用于实时日志、查询与有限控制操作。

## 2. 已确认需求

### 2.1 交易范围

- 交易所：仅 OKX
- 品类：仅合约 / 永续合约
- 账户：单账户
- 仓位模式：单向
- 保证金模式：逐仓
- 默认杠杆：用户可配置，初始默认 `25x`
- 若频道提到的标的不在 OKX 上线范围内：直接跳过

### 2.2 Telegram 来源

- 目标频道为第三方公开频道
- 已确认获得自动抓取、AI 解析和自动交易决策授权
- 默认实现方式：网页抓取 `t.me/s/<channel>`
- 架构允许后续扩展多种接入方式：
  - 网页抓取
  - Telegram Bot API
  - TDLib / 用户会话模式
- 如果未配置官方接入方式，则默认走网页抓取

### 2.3 下单与跟单规则

- 默认订单类型：限价单
- 如果频道明确要求市价，则允许市价单
- 如果频道给出进场区间，则由 AI 决定如何在区间内挂单
- 未成交订单 5 小时后自动撤销
- 若频道后续明确发出取消信号，则取消相关挂单
- 新开仓原则上自动执行
- 若 AI 对“新开仓”信号置信度不足，则进入人工审核队列
- 若 AI 面对的是“已存在仓位”的跟进动作，则允许在策略范围内继续自动管理
- 系统必须覆盖所有与频道合约信号直接相关的交易管理动作，包括但不限于开仓、补仓、减仓、全平、设置止损、移动止损、移动到保本、设置止盈、多个止盈点、分批止盈、撤销挂单、修改挂单、reduce-only 平仓等。
- 若频道给出的执行意图需要拆分为多笔订单、分批止盈单、条件单或附带止盈止损单，则执行层必须自动拆分并映射为 OKX 可执行动作。

### 2.4 资金分配规则

- 每次新开仓时，AI 可在钱包可用资金的 `40%-80%` 范围内决定本次投入比例
- 该规则风险极高，但 V1 按需求保留，并做成可配置项
- 系统需要同时跟踪：
  - 账户可用余额
  - 已被虚拟子仓位占用或预留的保证金

### 2.5 多频道隔离规则

- 不同频道的消息上下文必须严格隔离
- AI 不得把不同频道的消息混在一起分析
- 若两个频道对同一标的、同一方向都发出有效信号，则两个都允许逻辑成立
- 不存在跨频道优先级

由于 OKX 单账户 + 单向持仓模式下，交易所层面只能看到净仓位，无法原生按频道分仓，因此 V1 采用：

- `频道虚拟子仓位账本`

即：

- OKX 上仍然只有真实净仓位
- 系统内部按频道维护虚拟持仓、均价、已实现/未实现盈亏、挂单和生命周期
- AI 的判断基于频道自己的消息历史和频道自己的虚拟子仓位状态
- 执行层负责把频道动作映射为真实交易所动作，并保留可审计映射关系

## 3. 外部规范与官方约束

### 3.1 Telegram

参考官方资料：

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram TDLib](https://core.telegram.org/tdlib/docs/)
- [Telegram API Terms](https://core.telegram.org/api/terms)

设计结论：

- Bot API 可以在 bot 具备频道访问条件时提供 `channel_post` 与 `edited_channel_post`。
- 对第三方公开频道，若 bot 不方便加入，TDLib / 用户会话通常更适合作为官方通道。
- 网页抓取可作为默认与兜底方案，但稳定性、字段完整性和编辑事件能力一般不如官方接口。

### 3.2 OKX

参考官方资料：

- [OKX API v5](https://www.okx.com/docs-v5/en)
- [OKX API FAQ](https://www.okx.com/en-us/help/api-faq)
- [OKX OnchainOS](https://www.okx.com/learn/onchainos-our-ai-toolkit-for-developers)

设计结论：

- OKX API v5 已覆盖本项目所需的核心能力：合约下单、撤单、设置杠杆、账户、持仓、订单、成交、私有 WebSocket 推送等。
- 模拟盘需要单独的 demo API key，并使用 `x-simulated-trading: 1`。
- 实盘和模拟盘必须做环境隔离，密钥、基础配置和审计日志都要区分。
- 私有 WebSocket 应作为订单状态、持仓状态、账户状态的主同步通道。
- 你提到的 OnchainOS 更偏钱包 / DEX / 链上 AI agent 场景，不应作为 V1 的 OKX 合约交易主执行链路。V1 应直接对接 OKX API v5，并为后续 skill / MCP 扩展预留接口。

### 3.3 OpenClaw

参考官方资料：

- [OpenClaw Telegram](https://docs.openclaw.ai/channels/telegram)
- [OpenClaw Skills](https://docs.openclaw.ai/skills)

设计结论：

- OpenClaw 的 Telegram topic 隔离机制与本项目“日志 topic / 运维 topic”设计天然兼容。
- OpenClaw 支持 workspace skill，适合交付一个本项目专用 skill。
- 该 skill 需要明确区分“可直接执行”和“必须确认后执行”的动作边界。

### 3.4 OpenAI 模型与思考等级

参考官方资料：

- [OpenAI Models](https://platform.openai.com/docs/models)
- [Reasoning Best Practices](https://platform.openai.com/docs/guides/reasoning-best-practices)

设计结论：

- 系统应支持运行时切换模型。
- 思考等级应尽量沿用官方 provider-native 语义，不在本项目内重新发明一套非官方等级体系。
- AI 输出应优先使用结构化 JSON / schema 约束格式，减少交易决策歧义。

## 4. 推荐技术架构

### 4.1 推荐栈

默认推荐：

- 后端：`Python 3.12+`
- API 框架：`FastAPI`
- 数据库：`PostgreSQL`
- 缓存 / 锁 / 事件分发：`Redis`
- ORM：`SQLAlchemy + Alembic`
- 前端：`React + Vite` 或 `Next.js`
- 实时推送：`WebSocket` 或 `SSE`
- 抓取：`httpx + HTML 解析`，必要时回退 `Playwright`
- Telegram 官方接入：`TDLib` 或 `Bot API`
- OKX：自建 `REST + WebSocket` 适配层

推荐理由：

- Python 更适合异步集成、交易逻辑、AI 编排和抓取。
- FastAPI 适合管理后台接口和实时事件流。
- PostgreSQL 适合保存消息版本、决策快照、订单映射、审计日志。
- Redis 可用于调度锁、去重、重试与广播。

### 4.2 模块划分

1. `channel-intake`
   - 网页抓取器
   - Bot API 适配器
   - TDLib 适配器

2. `message-normalizer`
   - 原始消息标准化
   - 去重
   - 编辑版本识别
   - 统一消息模型

3. `context-builder`
   - 频道内多条消息上下文拼装
   - 当前未完成信号和虚拟子仓位注入

4. `ai-decision-engine`
   - 结构化解析
   - 置信度评估
   - 动作生成
   - 人工审核判定

5. `execution-planner`
   - 将 AI 动作转换为 OKX 可执行计划
   - 把频道虚拟动作映射到真实净仓位动作

6. `okx-gateway`
   - REST 下单 / 撤单 / 查询
   - WebSocket 订单 / 持仓 / 账户同步

7. `risk-policy`
   - 模拟/实盘隔离
   - 开仓权限
   - 人审阈值
   - 动作白名单

8. `ledger-audit`
   - 虚拟子仓位账本
   - 订单映射
   - 日志与审计
   - PnL 快照

9. `web-console`
   - 配置中心
   - 日志面板
   - 仓位 / 盈亏 / 挂单面板
   - 人工审核队列

10. `openclaw-integration`
   - topic 日志 claw
   - 项目 skill
   - 查询 / 控制动作

## 5. 核心功能需求

### 5.1 Telegram 监控

系统必须支持：

- 运行时增加、修改、禁用、删除频道
- 对每个频道配置接入方式
- 保存每个来源的 last-seen cursor
- 识别新消息、编辑消息，以及可识别范围内的删除 / 不可用状态
- 保存原始消息与标准化消息
- 记录消息版本

默认来源优先级：

1. 已配置的官方 Telegram 接入
2. 已配置的网页抓取
3. 若未配置其他方式，则默认网页抓取

### 5.2 AI 解析

AI 输入必须包含：

- 当前消息
- 同频道最近若干条相关消息
- 当前频道未完成信号
- 当前频道虚拟子仓位状态

AI 输出至少包含：

- 频道标识
- 消息标识
- 标的
- 方向
- 动作类型
- 入场方式
- 入场价 / 入场区间
- 止损或止损调整方案
- 单个或多个止盈点
- 取消 / 修改意图
- 是否需要分批止盈、部分减仓或保本移动
- 置信度
- 简短理由
- 是否需要人工审核

V1 支持的动作类型：

- `open_position`
- `add_position`
- `reduce_position`
- `close_position`
- `partial_take_profit`
- `set_stop_loss`
- `move_stop_loss`
- `move_stop_to_break_even`
- `set_take_profit`
- `set_multi_take_profit`
- `cancel_orders`
- `replace_orders`
- `force_reduce_only_close`
- `hold`
- `ignore`
- `manual_review`

### 5.3 虚拟子仓位

系统必须同时维护两套状态：

1. 真实交易所状态
   - 真实订单
   - 真实净仓位
   - 真实账户余额
   - 真实成交

2. 频道虚拟状态
   - 每频道持仓生命周期
   - 每频道虚拟均价
   - 每频道挂单和成交映射
   - 每频道已实现 / 未实现盈亏估算

### 5.4 OKX 执行

系统必须支持：

- 设置杠杆
- 查询交易标的
- 查询余额
- 查询持仓
- 下单
- 撤单
- 改单或撤单重挂
- 设置或更新止损
- 设置或更新止盈
- 设置多个止盈点
- 执行部分止盈或分批减仓
- 执行保本止损移动
- 在需要时创建条件单、算法单或附带止盈止损单
- 订阅订单推送
- 订阅持仓推送
- 订阅账户或 balance and position 推送
- 模拟 / 实盘切换

默认执行策略：

- `tdMode = isolated`
- 默认限价
- 明确信号要求时可用市价
- 止损、止盈、多个止盈点、分批止盈与保本移动，按 OKX 实际支持的订单模型映射实现
- 未成交 5 小时自动撤销

### 5.5 Web 控制台

控制台必须提供：

- 6 位密码登录
- 会话管理
- 登录限流
- 多次失败临时锁定
- 模拟 / 实盘切换
- 全局交易开关
- 频道级启停开关
- 频道来源配置
- 模型切换
- 思考等级切换
- 默认杠杆设置
- 日志实时查看
- 仓位查看
- 挂单查看
- 盈亏查看
- 人工审核队列
- 系统健康状态

### 5.6 OpenClaw 集成

V1 包含两部分：

1. Telegram 群组 topic 中的日志 claw
   - 实时发送系统日志
   - 支持自然语言查询状态

2. 项目 skill
   - 让小 claw 能查日志、查持仓、查订单、查 PnL、查最近消息解释
   - 支持暂停频道、恢复频道等低风险动作
   - 支持发起或协助发起与交易管理相关的全部主要动作，包括设置止损、设置止盈、设置多个止盈点、部分止盈、撤单、改单、平仓等
   - 对切换实盘、强平、手动开仓、修改核心风控及任何真实资金交易变更动作强制二次确认

## 6. 数据模型建议

核心表建议包括：

- `channels`
- `channel_sources`
- `source_cursors`
- `raw_messages`
- `normalized_messages`
- `message_versions`
- `ai_decisions`
- `manual_reviews`
- `virtual_positions`
- `virtual_position_events`
- `exchange_orders`
- `exchange_fills`
- `exchange_position_snapshots`
- `account_snapshots`
- `pnl_snapshots`
- `system_logs`
- `operator_actions`
- `settings`

关键标识建议包括：

- `channel_id`
- `source_message_id`
- `source_edit_version`
- `decision_id`
- `virtual_position_id`
- `cl_ord_id`
- `okx_ord_id`
- `correlation_id`

## 7. 主流程设计

### 7.1 新信号流程

1. 采集层发现新消息。
2. 标准化层保存原始与标准化记录。
3. 上下文构建器收集同频道近期消息与未完成状态。
4. AI 返回结构化理解和动作。
5. 策略层检查：
   - 当前环境是否允许交易
   - 频道是否启用
   - 置信度是否达标
   - 标的是否存在于 OKX
6. 若需要人工审核，则进入审核队列。
7. 若可自动执行，则执行规划器生成订单计划。
8. OKX 网关提交真实订单。
9. 私有 WebSocket 回传订单 / 成交 / 持仓状态。
10. 虚拟子仓位与前端面板同步更新。
11. OpenClaw topic 输出摘要日志。

### 7.2 编辑消息流程

1. 采集层发现消息被编辑。
2. 系统保存旧版本与新版本。
3. AI 接收新版本和相关上下文。
4. 决策引擎判断这是：
   - 修改原意
   - 取消挂单
   - 调整止盈止损
   - 仅文本润色无需动作
5. 执行层按差异更新挂单和虚拟状态。

### 7.3 跟进消息流程

1. 同频道出现后续说明消息。
2. 系统把最近几条相关消息和当前虚拟子仓位一起发给 AI。
3. AI 判断其关联的交易对象。
4. 结果可能是：
   - 继续持有
   - 部分止盈
   - 移动止损
   - 平仓
   - 撤销挂单
5. 审计层记录“哪条消息触发了哪次状态变更”。

## 8. 安全与运维要求

### 8.1 安全要求

- 登录密码必须强哈希存储，不得明文存储
- API Key、Telegram 凭据、模型密钥必须放入环境变量或密钥管理中
- 日志必须脱敏
- 实盘模式必须单独确认
- OpenClaw 与 Web 的高风险动作必须可审计

### 8.2 可观测性要求

- 所有关键事件都必须带时间戳和关联 ID
- Web 可实时查看日志
- OpenClaw topic 可收到日志摘要
- 人工操作必须可追溯

### 8.3 可靠性要求

- 重启后可恢复 cursor、挂单状态和虚拟子仓位状态
- 消息处理必须支持去重和幂等
- 下单请求必须带客户端关联 ID

## 9. 交付阶段建议

### Phase 1：基础骨架

- 初始化后端、前端、数据库、配置系统、登录模块

### Phase 2：Telegram 接入

- 完成网页抓取版监控、标准化、编辑检测、频道管理

### Phase 3：AI 决策

- 完成结构化输出 schema、置信度阈值、人审流程、上下文拼装

### Phase 4：OKX 接入

- 完成模拟盘下单、撤单、杠杆设置、订单同步、仓位同步

### Phase 5：虚拟子仓位账本

- 完成频道级虚拟持仓、真实仓位映射、PnL 估算

### Phase 6：OpenClaw

- 完成日志 topic claw 与项目 skill

### Phase 7：强化与上线准备

- 完成重试、幂等、审计、安全确认、告警和实盘切换保护

## 10. V1 验收标准

当满足以下条件时，V1 可视为达标：

1. 可通过 Web 界面登录并管理频道。
2. 可在不重启服务的情况下增删改监控频道。
3. 可识别 Telegram 新消息和编辑消息。
4. 可向 AI 发送频道内上下文并获得结构化决策。
5. 可自动下 OKX 模拟盘合约单并同步状态。
6. 可执行并跟踪止损、止盈、多个止盈点、部分止盈、撤单、改单与保本移动等管理动作。
7. 可无代码改动切换模拟 / 实盘配置。
8. 可在 Web 中查看日志、仓位、挂单和盈亏。
9. 可在单账户单向持仓前提下维护频道级虚拟子仓位。
10. OpenClaw 可在 topic 中发日志并响应自然语言查询与受控操作。
11. 敏感密钥不会泄露到日志和前端展示中。

## 11. 初始参考频道

以下频道仅作为需求理解与样式参考，不应硬编码进系统默认配置：

- [https://t.me/feiyangkanbi](https://t.me/feiyangkanbi)
- [https://t.me/cryptoninjas_trading_ann](https://t.me/cryptoninjas_trading_ann)

## 12. V1 默认决策汇总

除非后续明确修改，V1 默认值如下：

- Telegram 默认来源：网页抓取
- 抓取频率：`30s`
- 交易所：`OKX`
- 品类：`合约/永续`
- 保证金模式：`逐仓`
- 持仓模式：`单向`
- 默认杠杆：`25x`
- 默认订单类型：`限价`
- 订单超时：`5h`
- 不支持标的处理：`跳过`
- 频道隔离实现：`虚拟子仓位账本`
- 新开仓低置信度处理：`人工审核`
- 已有仓位跟进低置信度处理：`允许 AI 在策略范围内继续管理`
- 登录安全：`6位密码 + 限流 + 会话超时 + 操作审计`

