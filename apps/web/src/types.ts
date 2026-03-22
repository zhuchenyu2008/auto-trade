export type Environment = "paper" | "live";

export type HealthStatus = "healthy" | "degraded" | "down";

export type ChannelStatus = "enabled" | "disabled";

export type ManualConfirmationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "invalidated";

export type OrderStatus =
  | "pending"
  | "partially_filled"
  | "filled"
  | "canceled"
  | "rejected";

export type PositionSide = "long" | "short";

export type LogLevel = "debug" | "info" | "warning" | "error";

export interface SessionState {
  userLabel: string;
  authenticated: boolean;
  environment: Environment;
  globalTradingEnabled: boolean;
  healthStatus: HealthStatus;
  pendingManualConfirmationCount: number;
}

export interface AlertItem {
  id: string;
  level: "warning" | "error";
  message: string;
  occurredAt: string;
  correlationId: string;
}

export interface ChannelItem {
  channelId: string;
  channelName: string;
  sourceType: string;
  sourceRef: string;
  status: ChannelStatus;
  lastFetchAt: string;
  lastSuccessAt: string | null;
  lastErrorSummary: string | null;
  lastMessageResult: string;
}

export interface LogItem {
  logId: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  environment: Environment;
  channelId: string;
  channelName: string;
  message: string;
  correlationId: string;
}

export interface ManualConfirmationItem {
  confirmationId: string;
  status: ManualConfirmationStatus;
  channelId: string;
  channelName: string;
  symbol: string;
  actionType: "open_position";
  confidence: string;
  environment: Environment;
  createdAt: string;
  correlationId: string;
}

export interface ManualConfirmationDetail {
  confirmationId: string;
  rawMessage: string;
  contextSummary: string;
  aiDecision: string;
  keyPriceParams: {
    entry: string;
    stopLoss: string;
    takeProfit: string;
  };
  invalidReason: string | null;
  executable: boolean;
}

export interface OrderItem {
  orderId: string;
  symbol: string;
  side: PositionSide;
  status: OrderStatus;
  price: string;
  quantity: string;
  environment: Environment;
  decisionId: string;
  correlationId: string;
}

export interface FillItem {
  fillId: string;
  orderId: string;
  symbol: string;
  side: PositionSide;
  fillPrice: string;
  fillQuantity: string;
  filledAt: string;
  environment: Environment;
  correlationId: string;
}

export interface RealPositionItem {
  positionId: string;
  symbol: string;
  side: PositionSide;
  quantity: string;
  avgPrice: string;
  markPrice: string;
  unrealizedPnl: string;
  environment: Environment;
}

export interface VirtualPositionItem {
  virtualPositionId: string;
  channelId: string;
  channelName: string;
  symbol: string;
  side: PositionSide;
  status: "open" | "closed";
  virtualQuantity: string;
  virtualAvgPrice: string;
  realizedPnl: string;
  unrealizedPnl: string;
  correlationId: string;
}

export interface RuntimeSettings {
  environment: Environment;
  globalTradingEnabled: boolean;
  model: string;
  reasoningLevel: "low" | "medium" | "high";
  defaultLeverage: string;
  manualConfirmationThreshold: string;
  contextWindowSize: number;
  newPositionCapitalRange: {
    min: string;
    max: string;
  };
}
