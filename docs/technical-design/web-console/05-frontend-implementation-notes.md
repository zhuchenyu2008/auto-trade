# 05. Web 前端实现记录

## 1. 文档目的

本文件记录当前 `apps/web` 已落地实现，作为“现状快照”。  
实施规则、跨文档对齐和验收基线请以 [06-frontend-engineering-spec.md](./06-frontend-engineering-spec.md) 为准。

本文件只回答三个问题：

1. 当前代码已经实现到哪一层。
2. 当前实现与设计目标有哪些差距。
3. 下一阶段改造应在哪些文件落地。

## 2. 代码快照（2026-03-22）

### 2.1 工程位置

- 前端工作区：`apps/web`
- 入口：`apps/web/src/main.tsx`
- 路由：`apps/web/src/App.tsx`
- 全局状态：`apps/web/src/state/AppStateContext.tsx`
- mock 数据：`apps/web/src/mock-data.ts`
- 类型定义：`apps/web/src/types.ts`
- 全局样式：`apps/web/src/styles.css`

### 2.2 已落地技术栈

- `React`
- `Vite`
- `TypeScript`
- `react-router`

尚未落地（计划下一阶段接入）：

- `TanStack Query`
- `react-hook-form`
- 服务器状态层系统化拆分（当前仍在 `AppStateContext`）

### 2.3 运行时开关（新增）

当前前端已支持以下运行时环境变量：

- `VITE_DATA_SOURCE`：`mock` 或 `api`（默认 `mock`）。
- `VITE_API_BASE_URL`：API 前缀，默认 `/api/v1`。
- `VITE_ENABLE_SSE`：是否启用 SSE（默认 `true`）。

## 3. 已落地功能清单

### 3.1 路由与鉴权

已实现：

- 登录页与受保护路由分离。
- `ProtectedLayout` 对未登录状态重定向 `/login`。
- 路由覆盖：
  - `/login`
  - `/overview`
  - `/channels`
  - `/logs`
  - `/manual-confirmations`
  - `/orders`
  - `/virtual-positions`
  - `/settings`

当前限制：

- 登录规则为原型规则（任意 6 位数字）。
- 会话由 `localStorage` 模拟，不是服务端会话事实。

### 3.2 全局壳层与风险入口

已实现：

- 固定顶栏 + 固定侧栏 + 工作区骨架。
- 顶栏显示环境、交易开关、健康状态、待确认数量、最新告警。
- 顶栏提供环境切换与交易开关确认模态。

### 3.3 页面能力

已实现页面：

- 总览页：风险条、摘要指标、频道健康、待确认摘要、最近异常、最近动作。
- 频道页：搜索、表格、新增/编辑抽屉、启停切换、详情抽屉。
- 日志页：多维筛选、实时追加模拟、详情抽屉。
- 人工确认页：队列筛选、左队列右详情、通过/拒绝二次确认、环境不一致阻断。
- 真实订单页：订单、成交、真实持仓、订单详情抽屉。
- 虚拟持仓页：虚拟持仓、聚合 PnL、映射说明、生命周期抽屉。
- 设置页：参数编辑、保存反馈、危险操作区二次确认；运行状态组改为只读展示。

补充（本轮新增）：

- 频道页新增/编辑/启停已接入 `api` 模式写操作。
- 频道页已支持写操作失败提示与进行中状态。
- 顶栏已显示实时流状态（连接/降级）。
- 设置页普通保存路径不再允许改写“环境 / 全局交易开关”（避免绕过二次确认）。
- 设置页新增机密说明：AI API Key / Base URL 为部署级配置，不在页面明文填写。

### 3.4 共用组件

已实现组件：

- `AppShell`
- `StatusTag`
- `Drawer`
- `ConfirmModal`
- `StatePanel`

## 4. 当前数据与状态实现

### 4.1 数据来源

当前页面数据统一来自 `mock-data.ts`，由 `AppStateContext` 管理。

价值：

- 页面可先围绕稳定字段形状开发。
- 替换真实 API 时改动边界明确。

### 4.2 状态推导

已实现推导：

- `healthStatus`：由告警级别和频道错误摘要推导。
- `pendingManualConfirmationCount`：由确认项状态推导。

### 4.3 实时行为

当前行为：

- `mock` 模式：日志页使用本地模拟追加。
- `api` 模式：优先使用 SSE 客户端，断线时自动回退定时轮询。

## 5. 与设计文档对齐情况

### 5.1 与 `01/02/03` 对齐

已对齐项：

- 控制台骨架稳定。
- 页面路由与职责边界基本成立。
- 视觉 token 与状态标签体系已统一收口到 `styles.css`。

### 5.2 与 `04-api-contract-draft` 对齐

已对齐项：

- 主要对象字段与枚举在前端类型中已存在（环境、健康、确认状态、订单状态、方向等）。
- `correlation_id` 在日志、确认、订单、虚拟持仓均已可见。

未对齐项：

- `api` 模式已接入 REST 包络解析、错误码映射、SSE 客户端与降级轮询。
- 分页/cursor 尚未落地。

### 5.3 与需求文档边界对齐

已体现：

- 单用户工作台。
- 高风险动作二次确认。
- 真实层与虚拟层页面分离。
- 人工确认页面聚焦新开仓确认语义。

待补：

- 与后端限流、锁定、会话失效策略联动。
- 审计字段与错误码的后端联调闭环验证。

## 6. 关键差距与改造任务

### 6.1 高优先级（联调前必须完成）

1. 将服务器状态从 `AppStateContext` 迁移到 `TanStack Query`。
2. 完成列表分页或 cursor 语义接入。
3. 打通后端错误码与前端提示的联调回归。
4. 补齐写操作审计字段落库与回查验证。

### 6.2 中优先级（联调后尽快补齐）

1. 增加页面空态/错态统一模板落地覆盖率。
2. 增加前端可观测性字段（`request_id`、`correlation_id`）透传。
3. 补齐日志/列表在大量数据下的性能策略。

### 6.3 口径偏差（需在接真实配置前修正）

以下为“当前 mock 值”与“需求默认值”偏差：

- 新开仓资金比例范围：
  - 需求默认：`40%-80%`
  - 当前 mock：`0.02-0.08`
- 默认杠杆：
  - 需求默认：`25x`
  - 当前 mock：`3`
- 上下文窗口：
  - 技术设计推荐默认：同频道最近 `8` 条
  - 当前 mock：`30`

## 7. 文件级改造建议

### 7.1 首批改造文件

- `apps/web/src/state/AppStateContext.tsx`
- `apps/web/src/mock-data.ts`
- `apps/web/src/pages/*.tsx`
- `apps/web/src/components/AppShell.tsx`
- `apps/web/src/lib/*`

### 7.2 新增建议目录

接入真实后端时建议新增：

- `apps/web/src/api/`：请求客户端、契约解包、错误映射
- `apps/web/src/features/`：按领域拆分 query/mutation hooks
- `apps/web/src/realtime/`：SSE 客户端、事件分发、降级轮询

## 8. 维护规则

- 结构性改动前先更新文档（至少更新 `04`、`05`、`06` 中受影响部分）。
- 涉及字段或枚举调整时，必须同步修改：
  - `types.ts`
  - mock 数据
  - 页面映射文案
  - 相关测试（接入后）
- 涉及高风险动作流程变更时，必须同时校验与 OpenClaw 规则一致性。
