import type {
  AlertItem,
  ChannelItem,
  FillItem,
  LogItem,
  ManualConfirmationDetail,
  ManualConfirmationItem,
  OrderItem,
  RealPositionItem,
  RuntimeSettings,
  SessionState,
  VirtualPositionItem
} from "./types";

export const initialSessionState: SessionState = {
  userLabel: "owner",
  authenticated: false,
  environment: "paper",
  globalTradingEnabled: true,
  healthStatus: "degraded",
  pendingManualConfirmationCount: 2
};

export const initialAlerts: AlertItem[] = [
  {
    id: "alert_01",
    level: "warning",
    message: "频道甲在最近10分钟内出现过一次抓取超时。",
    occurredAt: "2026-03-22T07:59:30Z",
    correlationId: "corr_1001"
  },
  {
    id: "alert_02",
    level: "error",
    message: "人工确认 mc_902 已达到过期边界。",
    occurredAt: "2026-03-22T07:57:05Z",
    correlationId: "corr_1002"
  }
];

export const initialChannels: ChannelItem[] = [
  {
    channelId: "ch_1",
    channelName: "频道甲",
    sourceType: "电报网页源",
    sourceRef: "t.me/s/alpha",
    status: "enabled",
    lastFetchAt: "2026-03-22T07:59:30Z",
    lastSuccessAt: "2026-03-22T07:59:25Z",
    lastErrorSummary: "上一轮轮询窗口出现一次超时",
    lastMessageResult: "new_message_processed"
  },
  {
    channelId: "ch_2",
    channelName: "频道乙",
    sourceType: "电报网页源",
    sourceRef: "t.me/s/beta",
    status: "enabled",
    lastFetchAt: "2026-03-22T07:59:12Z",
    lastSuccessAt: "2026-03-22T07:59:12Z",
    lastErrorSummary: null,
    lastMessageResult: "no_new_message"
  },
  {
    channelId: "ch_3",
    channelName: "频道丙",
    sourceType: "电报网页源",
    sourceRef: "t.me/s/gamma",
    status: "disabled",
    lastFetchAt: "2026-03-22T06:49:12Z",
    lastSuccessAt: "2026-03-22T06:49:12Z",
    lastErrorSummary: null,
    lastMessageResult: "paused"
  }
];

export const initialLogs: LogItem[] = [
  {
    logId: "log_1",
    timestamp: "2026-03-22T07:58:59Z",
    level: "info",
    module: "telegram-intake",
    environment: "paper",
    channelId: "ch_1",
    channelName: "频道甲",
    message: "已从来源解析到新消息。",
    correlationId: "corr_1001"
  },
  {
    logId: "log_2",
    timestamp: "2026-03-22T07:59:01Z",
    level: "warning",
    module: "ai-decision",
    environment: "paper",
    channelId: "ch_1",
    channelName: "频道甲",
    message: "置信度低于阈值，已进入人工确认队列。",
    correlationId: "corr_1001"
  },
  {
    logId: "log_3",
    timestamp: "2026-03-22T07:59:18Z",
    level: "error",
    module: "telegram-intake",
    environment: "paper",
    channelId: "ch_1",
    channelName: "频道甲",
    message: "电报来源抓取超时。",
    correlationId: "corr_1002"
  },
  {
    logId: "log_4",
    timestamp: "2026-03-22T07:59:26Z",
    level: "info",
    module: "okx-execution",
    environment: "paper",
    channelId: "ch_2",
    channelName: "频道乙",
    message: "订单 ord_44 已部分成交。",
    correlationId: "corr_2001"
  }
];

export const initialManualConfirmations: ManualConfirmationItem[] = [
  {
    confirmationId: "mc_901",
    status: "pending",
    channelId: "ch_1",
    channelName: "频道甲",
    symbol: "BTC-USDT-SWAP",
    actionType: "open_position",
    confidence: "0.62",
    environment: "paper",
    createdAt: "2026-03-22T07:59:02Z",
    correlationId: "corr_1001"
  },
  {
    confirmationId: "mc_902",
    status: "pending",
    channelId: "ch_2",
    channelName: "频道乙",
    symbol: "ETH-USDT-SWAP",
    actionType: "open_position",
    confidence: "0.58",
    environment: "paper",
    createdAt: "2026-03-22T07:57:01Z",
    correlationId: "corr_2002"
  },
  {
    confirmationId: "mc_820",
    status: "approved",
    channelId: "ch_3",
    channelName: "频道丙",
    symbol: "SOL-USDT-SWAP",
    actionType: "open_position",
    confidence: "0.64",
    environment: "paper",
    createdAt: "2026-03-22T05:10:01Z",
    correlationId: "corr_3001"
  }
];

export const initialManualConfirmationDetails: Record<string, ManualConfirmationDetail> = {
  mc_901: {
    confirmationId: "mc_901",
    rawMessage: "若15分钟收线站上局部阻力位，考虑BTC做多。",
    contextSummary: "频道甲成交量抬升，但同类形态在上一轮延续性较弱。",
    aiDecision: "建议小仓位做多，并设置严格止损。",
    keyPriceParams: {
      entry: "84510",
      stopLoss: "83880",
      takeProfit: "85260"
    },
    invalidReason: null,
    executable: true
  },
  mc_902: {
    confirmationId: "mc_902",
    rawMessage: "ETH反弹尝试做多，建议降低杠杆。",
    contextSummary: "资金费率趋势冲突，导致信号置信度偏低。",
    aiDecision: "等待人工确认后再执行开仓。",
    keyPriceParams: {
      entry: "4580",
      stopLoss: "4495",
      takeProfit: "4685"
    },
    invalidReason: null,
    executable: true
  },
  mc_820: {
    confirmationId: "mc_820",
    rawMessage: "SOL 动量延续信号。",
    contextSummary: "该项已在模拟盘中完成审批并执行。",
    aiDecision: "已开仓并同步到虚拟台账。",
    keyPriceParams: {
      entry: "182.4",
      stopLoss: "177.0",
      takeProfit: "190.0"
    },
    invalidReason: null,
    executable: false
  }
};

export const initialOrders: OrderItem[] = [
  {
    orderId: "ord_44",
    symbol: "ETH-USDT-SWAP",
    side: "long",
    status: "partially_filled",
    price: "4578",
    quantity: "1.2",
    environment: "paper",
    decisionId: "dec_44",
    correlationId: "corr_2001"
  },
  {
    orderId: "ord_45",
    symbol: "BTC-USDT-SWAP",
    side: "long",
    status: "pending",
    price: "84510",
    quantity: "0.05",
    environment: "paper",
    decisionId: "dec_45",
    correlationId: "corr_1001"
  }
];

export const initialFills: FillItem[] = [
  {
    fillId: "fill_001",
    orderId: "ord_44",
    symbol: "ETH-USDT-SWAP",
    side: "long",
    fillPrice: "4577",
    fillQuantity: "0.7",
    filledAt: "2026-03-22T07:59:24Z",
    environment: "paper",
    correlationId: "corr_2001"
  }
];

export const initialRealPositions: RealPositionItem[] = [
  {
    positionId: "rp_10",
    symbol: "ETH-USDT-SWAP",
    side: "long",
    quantity: "0.7",
    avgPrice: "4577",
    markPrice: "4591",
    unrealizedPnl: "9.8",
    environment: "paper"
  }
];

export const initialVirtualPositions: VirtualPositionItem[] = [
  {
    virtualPositionId: "vp_1",
    channelId: "ch_1",
    channelName: "频道甲",
    symbol: "BTC-USDT-SWAP",
    side: "long",
    status: "open",
    virtualQuantity: "0.05",
    virtualAvgPrice: "84480",
    realizedPnl: "120.5",
    unrealizedPnl: "32.1",
    correlationId: "corr_1001"
  },
  {
    virtualPositionId: "vp_2",
    channelId: "ch_2",
    channelName: "频道乙",
    symbol: "ETH-USDT-SWAP",
    side: "long",
    status: "open",
    virtualQuantity: "1.2",
    virtualAvgPrice: "4568",
    realizedPnl: "45.2",
    unrealizedPnl: "27.4",
    correlationId: "corr_2001"
  },
  {
    virtualPositionId: "vp_3",
    channelId: "ch_3",
    channelName: "频道丙",
    symbol: "SOL-USDT-SWAP",
    side: "short",
    status: "closed",
    virtualQuantity: "2.0",
    virtualAvgPrice: "185.2",
    realizedPnl: "88.3",
    unrealizedPnl: "0",
    correlationId: "corr_3001"
  }
];

export const initialRuntimeSettings: RuntimeSettings = {
  environment: "paper",
  globalTradingEnabled: true,
  model: "模型5.4",
  reasoningLevel: "medium",
  defaultLeverage: "3",
  manualConfirmationThreshold: "0.66",
  contextWindowSize: 30,
  newPositionCapitalRange: {
    min: "0.02",
    max: "0.08"
  }
};
