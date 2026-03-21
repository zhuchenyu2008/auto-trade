import type {
  ActivityRecord,
  AlertRecord,
  AppSnapshot,
  ChannelRecord,
  FillRecord,
  LogRecord,
  ManualConfirmationRecord,
  OrderRecord,
  RealPositionRecord,
  RuntimeSettings,
  VirtualPositionRecord
} from "./types";

export const appSnapshot: AppSnapshot = {
  environment: "paper",
  globalTradingEnabled: true,
  healthStatus: "degraded",
  pendingManualConfirmationCount: 2,
  connectedFeeds: "Telegram poller / OKX private sync / mock SSE",
  updatedAt: "2026-03-21 22:18"
};

export const alerts: AlertRecord[] = [
  {
    id: "alert_01",
    level: "warning",
    message: "频道 Alpha 最近一次抓取超时，已在下一轮恢复。",
    occurredAt: "22:10",
    correlationId: "corr_alpha_2208"
  },
  {
    id: "alert_02",
    level: "error",
    message: "人工确认项 mc_002 已因上下文变更失效，需要重新判断。",
    occurredAt: "21:57",
    correlationId: "corr_beta_2155"
  }
];

export const activityFeed: ActivityRecord[] = [
  {
    id: "act_01",
    title: "新开仓进入确认队列",
    summary: "Alpha 对 BTC-USDT-SWAP 给出新多单，置信度 0.62，已转入人工确认。",
    time: "22:12",
    channelName: "Alpha",
    correlationId: "corr_alpha_2212",
    emphasis: "warning"
  },
  {
    id: "act_02",
    title: "跟进消息直接执行",
    summary: "Gamma 上移止损到保本，执行规划已映射为 reduce-only 保护动作。",
    time: "21:49",
    channelName: "Gamma",
    correlationId: "corr_gamma_2149",
    emphasis: "normal"
  },
  {
    id: "act_03",
    title: "抓取链路降级",
    summary: "Beta 页面结构出现轻微波动，但当前提取字段仍然可用。",
    time: "21:36",
    channelName: "Beta",
    correlationId: "corr_beta_2136",
    emphasis: "danger"
  }
];

export const channels: ChannelRecord[] = [
  {
    id: "ch_alpha",
    name: "Alpha",
    sourceRef: "t.me/s/alpha_room",
    status: "enabled",
    healthStatus: "degraded",
    openSignals: 2,
    lastFetchAt: "22:18",
    lastSuccessAt: "22:18",
    lastErrorSummary: "上一轮超时 1 次，已恢复",
    lastMessageResult: "新开仓信号转人工确认",
    activeNarrative: "BTC 多头叙事仍在继续，频道强调区间挂单 + 分批止盈。",
    operatorNote: "保留观察，但需要注意该频道最近编辑消息偏多。",
    recentTrace: [
      "22:12 新信号识别为 open_position，confidence=0.62",
      "22:12 创建 manual confirmation 项 mc_001",
      "22:18 抓取恢复，未发现新编辑"
    ]
  },
  {
    id: "ch_beta",
    name: "Beta",
    sourceRef: "t.me/s/beta_flow",
    status: "enabled",
    healthStatus: "healthy",
    openSignals: 1,
    lastFetchAt: "22:17",
    lastSuccessAt: "22:17",
    lastErrorSummary: null,
    lastMessageResult: "编辑消息已重算决策",
    activeNarrative: "ETH 短空叙事已进入减仓阶段，频道消息偏短句。",
    operatorNote: "适合继续做解析压力测试。",
    recentTrace: [
      "21:55 编辑消息触发版本重算",
      "21:56 原确认项失效，等待新判断",
      "22:17 频道状态稳定"
    ]
  },
  {
    id: "ch_gamma",
    name: "Gamma",
    sourceRef: "t.me/s/gamma_desk",
    status: "paused",
    healthStatus: "healthy",
    openSignals: 0,
    lastFetchAt: "22:05",
    lastSuccessAt: "22:05",
    lastErrorSummary: null,
    lastMessageResult: "频道已暂停自动执行，仅保留观察",
    activeNarrative: "SOL 多头已经进入保护仓阶段。",
    operatorNote: "人为暂停，原因是该频道周末风格漂移。",
    recentTrace: [
      "20:42 最后一次跟进消息：move_stop_to_break_even",
      "20:50 操作者暂停频道自动执行",
      "22:05 抓取仍保持开启"
    ]
  }
];

export const logs: LogRecord[] = [
  {
    id: "log_01",
    timestamp: "22:18:11",
    level: "info",
    module: "telegram-intake",
    environment: "paper",
    channelName: "Alpha",
    message: "完成本轮抓取，未发现新增编辑。",
    correlationId: "corr_alpha_2218",
    detail: [
      "source_ref=t.me/s/alpha_room",
      "fetch_duration_ms=721",
      "messages_seen=3"
    ]
  },
  {
    id: "log_02",
    timestamp: "22:12:09",
    level: "warning",
    module: "manual-confirmation",
    environment: "paper",
    channelName: "Alpha",
    message: "新开仓低置信度，已生成待确认项 mc_001。",
    correlationId: "corr_alpha_2212",
    detail: [
      "action=open_position",
      "confidence=0.62",
      "symbol=BTC-USDT-SWAP"
    ]
  },
  {
    id: "log_03",
    timestamp: "21:57:42",
    level: "error",
    module: "manual-confirmation",
    environment: "paper",
    channelName: "Beta",
    message: "确认项 mc_002 因消息编辑后失效。",
    correlationId: "corr_beta_2155",
    detail: [
      "old_version=v3",
      "new_version=v4",
      "status=invalidated"
    ]
  },
  {
    id: "log_04",
    timestamp: "21:49:03",
    level: "info",
    module: "okx-execution",
    environment: "paper",
    channelName: "Gamma",
    message: "保护性止损已更新为 break even。",
    correlationId: "corr_gamma_2149",
    detail: [
      "order_type=conditional",
      "new_stop=151.25",
      "reduce_only=true"
    ]
  },
  {
    id: "log_05",
    timestamp: "21:36:58",
    level: "warning",
    module: "telegram-intake",
    environment: "paper",
    channelName: "Beta",
    message: "页面结构出现轻微波动，已走备用提取路径。",
    correlationId: "corr_beta_2136",
    detail: [
      "fallback_parser=enabled",
      "field_loss=none",
      "monitor=watch"
    ]
  }
];

export const initialManualConfirmations: ManualConfirmationRecord[] = [
  {
    id: "mc_001",
    status: "pending",
    channelName: "Alpha",
    symbol: "BTC-USDT-SWAP",
    actionType: "open_position",
    confidence: "0.62",
    environment: "paper",
    createdAt: "22:12",
    correlationId: "corr_alpha_2212",
    originalMessage:
      "BTC long now. Entries 84200-84600, SL 83480, TP1 85120 TP2 85800.",
    contextSummary: [
      "同频道最近 8 条消息里有 2 条提到 BTC 区间吸筹。",
      "当前 Alpha 在 BTC 上没有活跃虚拟仓位。",
      "频道最近 24h 有较高编辑频率。"
    ],
    reasoning: [
      "模型确认这是新开仓，不是对旧仓位的跟进。",
      "入场区间和止损清晰，但语气含糊，没有明确强调市价或限价。",
      "置信度不足，按规则进入人工确认。"
    ],
    entryPlan: "分 2 笔限价挂入 84200 / 84560。",
    stopLoss: "83480",
    takeProfit: ["85120", "85800"]
  },
  {
    id: "mc_002",
    status: "expired",
    channelName: "Beta",
    symbol: "ETH-USDT-SWAP",
    actionType: "open_position",
    confidence: "0.58",
    environment: "paper",
    createdAt: "21:55",
    correlationId: "corr_beta_2155",
    originalMessage:
      "ETH short, scalp only, tight stop. Wait for 3040 area.",
    contextSummary: [
      "旧版本消息曾提示 3032-3040 入场。",
      "新版本删掉了具体区间。",
      "原确认项已不再可信。"
    ],
    reasoning: [
      "消息在待确认期间被编辑。",
      "关键价格字段消失，系统将旧确认项作废。"
    ],
    entryPlan: "原计划在 3036 和 3040 两档试空。",
    stopLoss: "3068",
    takeProfit: ["3005"],
    invalidReason: "消息编辑后关键入场价格不再成立。"
  }
];

export const orders: OrderRecord[] = [
  {
    id: "ord_001",
    symbol: "SOL-USDT-SWAP",
    side: "long",
    status: "partially_filled",
    orderType: "limit",
    price: "149.80",
    quantity: "38",
    channelName: "Gamma",
    correlationId: "corr_gamma_2104",
    updatedAt: "21:45"
  },
  {
    id: "ord_002",
    symbol: "BTC-USDT-SWAP",
    side: "long",
    status: "pending",
    orderType: "limit",
    price: "84200",
    quantity: "0.03",
    channelName: "Alpha",
    correlationId: "corr_alpha_2212",
    updatedAt: "待确认"
  },
  {
    id: "ord_003",
    symbol: "ETH-USDT-SWAP",
    side: "short",
    status: "canceled",
    orderType: "limit",
    price: "3036",
    quantity: "1.2",
    channelName: "Beta",
    correlationId: "corr_beta_2141",
    updatedAt: "21:57"
  }
];

export const fills: FillRecord[] = [
  {
    id: "fill_001",
    symbol: "SOL-USDT-SWAP",
    side: "long",
    price: "149.65",
    quantity: "18",
    fee: "0.94",
    occurredAt: "21:43",
    correlationId: "corr_gamma_2104"
  },
  {
    id: "fill_002",
    symbol: "ETH-USDT-SWAP",
    side: "short",
    price: "3028.4",
    quantity: "0.5",
    fee: "0.68",
    occurredAt: "21:18",
    correlationId: "corr_beta_2108"
  }
];

export const realPositions: RealPositionRecord[] = [
  {
    id: "rp_001",
    symbol: "SOL-USDT-SWAP",
    side: "long",
    quantity: "18",
    averagePrice: "149.65",
    markPrice: "152.10",
    unrealizedPnl: "+44.10",
    environment: "paper"
  },
  {
    id: "rp_002",
    symbol: "ETH-USDT-SWAP",
    side: "short",
    quantity: "0.5",
    averagePrice: "3028.40",
    markPrice: "3019.30",
    unrealizedPnl: "+4.55",
    environment: "paper"
  }
];

export const virtualPositions: VirtualPositionRecord[] = [
  {
    id: "vp_001",
    channelName: "Gamma",
    symbol: "SOL-USDT-SWAP",
    side: "long",
    status: "adjusting",
    virtualQuantity: "38",
    virtualAveragePrice: "149.80",
    realizedPnl: "+0.00",
    unrealizedPnl: "+87.40",
    reservedMargin: "228.00",
    latestEvent: "move_stop_to_break_even",
    lifecycle: [
      "21:04 initiated",
      "21:12 opening",
      "21:43 partial fill applied",
      "21:49 break even move created"
    ],
    correlationId: "corr_gamma_2104"
  },
  {
    id: "vp_002",
    channelName: "Beta",
    symbol: "ETH-USDT-SWAP",
    side: "short",
    status: "open",
    virtualQuantity: "0.5",
    virtualAveragePrice: "3028.40",
    realizedPnl: "+12.80",
    unrealizedPnl: "+4.55",
    reservedMargin: "96.00",
    latestEvent: "partial_take_profit",
    lifecycle: [
      "20:58 initiated",
      "21:08 order_submitted",
      "21:18 fill_applied",
      "21:29 partial_take_profit"
    ],
    correlationId: "corr_beta_2108"
  },
  {
    id: "vp_003",
    channelName: "Alpha",
    symbol: "BTC-USDT-SWAP",
    side: "long",
    status: "opening",
    virtualQuantity: "0.05",
    virtualAveragePrice: "84480.00",
    realizedPnl: "0.00",
    unrealizedPnl: "0.00",
    reservedMargin: "410.00",
    latestEvent: "manual_confirmation_pending",
    lifecycle: [
      "22:12 decision_created",
      "22:12 manual_confirmation_pending"
    ],
    correlationId: "corr_alpha_2212"
  }
];

export const runtimeSettings: RuntimeSettings = {
  environment: "paper",
  globalTradingEnabled: true,
  model: "gpt-5.4",
  reasoningEffort: "high",
  defaultLeverage: 25,
  confirmationThreshold: 0.68,
  contextWindowLength: 8,
  allocationMin: 40,
  allocationMax: 80
};

