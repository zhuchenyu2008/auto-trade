export type Environment = "paper" | "live";
export type HealthStatus = "healthy" | "degraded" | "down";
export type BadgeTone =
  | "neutral"
  | "paper"
  | "live"
  | "success"
  | "warning"
  | "danger"
  | "info";
export type LogLevel = "info" | "warning" | "error";
export type ChannelStatus = "enabled" | "paused";
export type ManualConfirmationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";
export type OrderStatus =
  | "pending"
  | "partially_filled"
  | "filled"
  | "canceled"
  | "rejected";
export type PositionSide = "long" | "short";

export interface AppSnapshot {
  environment: Environment;
  globalTradingEnabled: boolean;
  healthStatus: HealthStatus;
  pendingManualConfirmationCount: number;
  connectedFeeds: string;
  updatedAt: string;
}

export interface AlertRecord {
  id: string;
  level: LogLevel;
  message: string;
  occurredAt: string;
  correlationId: string;
}

export interface ActivityRecord {
  id: string;
  title: string;
  summary: string;
  time: string;
  channelName: string;
  correlationId: string;
  emphasis: "normal" | "warning" | "danger";
}

export interface ChannelRecord {
  id: string;
  name: string;
  sourceRef: string;
  status: ChannelStatus;
  healthStatus: HealthStatus;
  openSignals: number;
  lastFetchAt: string;
  lastSuccessAt: string;
  lastErrorSummary: string | null;
  lastMessageResult: string;
  activeNarrative: string;
  operatorNote: string;
  recentTrace: string[];
}

export interface LogRecord {
  id: string;
  timestamp: string;
  level: LogLevel;
  module: string;
  environment: Environment;
  channelName: string;
  message: string;
  correlationId: string;
  detail: string[];
}

export interface ManualConfirmationRecord {
  id: string;
  status: ManualConfirmationStatus;
  channelName: string;
  symbol: string;
  actionType: string;
  confidence: string;
  environment: Environment;
  createdAt: string;
  correlationId: string;
  originalMessage: string;
  contextSummary: string[];
  reasoning: string[];
  entryPlan: string;
  stopLoss: string;
  takeProfit: string[];
  invalidReason?: string;
}

export interface OrderRecord {
  id: string;
  symbol: string;
  side: PositionSide;
  status: OrderStatus;
  orderType: string;
  price: string;
  quantity: string;
  channelName: string;
  correlationId: string;
  updatedAt: string;
}

export interface FillRecord {
  id: string;
  symbol: string;
  side: PositionSide;
  price: string;
  quantity: string;
  fee: string;
  occurredAt: string;
  correlationId: string;
}

export interface RealPositionRecord {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: string;
  averagePrice: string;
  markPrice: string;
  unrealizedPnl: string;
  environment: Environment;
}

export interface VirtualPositionRecord {
  id: string;
  channelName: string;
  symbol: string;
  side: PositionSide;
  status: "opening" | "open" | "adjusting";
  virtualQuantity: string;
  virtualAveragePrice: string;
  realizedPnl: string;
  unrealizedPnl: string;
  reservedMargin: string;
  latestEvent: string;
  lifecycle: string[];
  correlationId: string;
}

export interface RuntimeSettings {
  environment: Environment;
  globalTradingEnabled: boolean;
  model: string;
  reasoningEffort: string;
  defaultLeverage: number;
  confirmationThreshold: number;
  contextWindowLength: number;
  allocationMin: number;
  allocationMax: number;
}

