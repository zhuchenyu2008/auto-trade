# 01. 系统架构设计

## 1. 目标与非目标

### 1.1 目标

- 在 V1 内形成可运行的自动交易闭环。
- 保持模块边界清晰，便于后续扩展官方 Telegram 接入或更多执行策略。
- 在单用户场景下控制部署复杂度。

### 1.2 非目标

- 不为 V1 设计微服务集群。
- 不为 V1 设计多租户或多账户架构。
- 不在架构层支持多交易所抽象到极致，只保留必要接口位。

## 2. 架构形态

V1 推荐采用“模块化单体 + 后台任务”的架构：

- 一个主后端进程负责 API、鉴权、配置、查询和控制接口。
- 一组后台任务负责 Telegram 抓取、超时撤单、补偿同步和其他定时工作。
- 一个 OKX 同步任务负责维护私有 WebSocket 连接并处理订单 / 成交 / 持仓回报。
- PostgreSQL 作为主状态存储。
- Redis 用于分布式锁、去重键、任务协调和实时广播。

这种形态比微服务更适合 V1，原因是：

- 交易链路强依赖一致性和跨模块审计。
- 当前部署规模小，复杂服务拆分收益不高。
- 前端优先阶段需要快速调整后端接口，模块化单体更灵活。

## 3. 运行时拓扑

建议的最小运行时拓扑如下：

- `web`：Web 控制台静态资源或前端开发服务器
- `api`：FastAPI 主服务
- `worker`：后台任务执行器
- `okx-sync`：OKX 私有状态同步任务
- `postgres`：主数据库
- `redis`：缓存 / 锁 / 广播 / 任务协调

开发环境可以把 `api + worker + okx-sync` 放在同一代码仓中，以不同启动入口运行；生产环境可按进程拆开，但仍保持同一后端代码基。

## 4. 模块边界

### 4.1 channel-intake

负责轮询频道、抓取页面、更新 cursor、产出原始消息。

### 4.2 message-normalizer

负责原始消息标准化、去重、版本识别和统一消息模型。

### 4.3 context-builder

负责单频道上下文构造，注入最近消息、未完成信号和虚拟子仓位状态。

### 4.4 ai-decision-engine

负责调用模型、验证结构化输出、评估置信度并给出决策结果。

### 4.5 manual-confirmation

负责承接新开仓低置信度决策，形成待确认项并回写确认结果。

### 4.6 execution-planner

负责把 AI 动作转换成 OKX 可执行计划，必要时拆分订单、生成附带止盈止损计划。

### 4.7 okx-gateway

负责 REST 下单 / 撤单 / 查询，以及 WebSocket 状态同步适配。

### 4.8 ledger-audit

负责虚拟子仓位账本、事件流、PnL 快照、操作审计和链路日志。

### 4.9 web-console

负责配置、展示、确认和运维。

### 4.10 openclaw-integration

负责 topic 日志、状态查询和受控动作。

## 5. 关键设计决策

### 5.1 API 服务不直接承担所有异步流程

- 抓取、超时撤单、补偿同步、OpenClaw 推送不应全部在请求线程内执行。
- API 更适合做读写入口和状态控制面。

### 5.2 数据库是主事实源

- Redis 只做临时协调，不做最终账本存储。
- 订单状态、决策结果、账本事件必须落 PostgreSQL。

### 5.3 外部系统按适配层隔离

- Telegram 网页抓取、OKX、模型服务都通过适配层接入。
- 上层领域逻辑不直接依赖第三方 SDK 细节。

### 5.4 前端优先但接口先约定

- 虽然实施顺序前端优先，但 API 契约必须尽早定义。
- 页面原型定稿后，应尽快产出接口草案，避免后端按自己理解写偏。

## 6. 建议目录结构

```text
backend/
  app/
    api/
    modules/
      channel_intake/
      message_normalizer/
      context_builder/
      ai_decision/
      manual_confirmation/
      execution_planner/
      okx_gateway/
      ledger_audit/
      risk_policy/
      openclaw/
    db/
    core/
    tasks/
web/
  src/
    app/
    pages/
    features/
    components/
    lib/
docs/
  technical-design/
```

## 7. 跨模块调用原则

- 模块之间优先通过 service / application layer 协作，不直接跨模块随意写表。
- 交易所真实状态更新应统一经过同步模块入库。
- 账本更新应统一经过账本服务，避免多个模块各自计算一份虚拟状态。
- 高风险动作入口统一收口到风险策略层和审计层。

## 8. 后续细化建议

本文件先定总体边界。后续若要进一步落地，应优先补以下技术设计：

- API 契约文档
- 后端模块包结构
- 任务调度模型
- 实时推送选型（SSE / WebSocket）
