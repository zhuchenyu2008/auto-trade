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
} from "../types";

export interface CursorPage {
  next_cursor: string | null;
  has_more: boolean;
}

export interface CursorListResponse<T> {
  items: T[];
  page?: CursorPage;
}

export type ListResponse<T> = CursorListResponse<T> | T[];

export interface SessionDto {
  user_label: string;
  authenticated: boolean;
  environment: SessionState["environment"];
  global_trading_enabled: boolean;
  health_status?: SessionState["healthStatus"];
  pending_manual_confirmation_count: number;
}

export interface AlertDto {
  id: string;
  level: AlertItem["level"];
  message: string;
  occurred_at: string;
  correlation_id: string;
}

export interface ChannelDto {
  channel_id: string;
  channel_name: string;
  source_type: string;
  source_ref: string;
  status: ChannelItem["status"];
  last_fetch_at: string;
  last_success_at: string | null;
  last_error_summary: string | null;
  last_message_result: string;
}

export interface OverviewSummaryDto {
  environment: SessionState["environment"];
  global_trading_enabled: boolean;
  health_status: SessionState["healthStatus"];
  pending_manual_confirmation_count: number;
  recent_alerts: AlertDto[];
  channel_summaries: ChannelDto[];
}

export interface LogDto {
  log_id: string;
  timestamp: string;
  level: LogItem["level"];
  module: string;
  environment: LogItem["environment"];
  channel_id: string;
  channel_name: string;
  message: string;
  correlation_id: string;
}

export interface ManualConfirmationDto {
  confirmation_id: string;
  status: ManualConfirmationItem["status"];
  channel_id: string;
  channel_name: string;
  symbol: string;
  action_type: ManualConfirmationItem["actionType"];
  confidence: string;
  environment: ManualConfirmationItem["environment"];
  created_at: string;
  correlation_id: string;
}

export interface ManualConfirmationDetailDto {
  confirmation_id: string;
  raw_message: string;
  context_summary: string;
  ai_decision: string;
  key_price_params: {
    entry: string;
    stop_loss: string;
    take_profit: string;
  };
  invalid_reason: string | null;
  executable: boolean;
}

export interface OrderDto {
  order_id: string;
  symbol: string;
  side: OrderItem["side"];
  status: OrderItem["status"];
  price: string;
  quantity: string;
  environment: OrderItem["environment"];
  decision_id: string;
  correlation_id: string;
}

export interface FillDto {
  fill_id: string;
  order_id: string;
  symbol: string;
  side: FillItem["side"];
  fill_price: string;
  fill_quantity: string;
  filled_at: string;
  environment: FillItem["environment"];
  correlation_id: string;
}

export interface RealPositionDto {
  position_id: string;
  symbol: string;
  side: RealPositionItem["side"];
  quantity: string;
  avg_price: string;
  mark_price: string;
  unrealized_pnl: string;
  environment: RealPositionItem["environment"];
}

export interface VirtualPositionDto {
  virtual_position_id: string;
  channel_id: string;
  channel_name: string;
  symbol: string;
  side: VirtualPositionItem["side"];
  status: VirtualPositionItem["status"];
  virtual_quantity: string;
  virtual_avg_price: string;
  realized_pnl: string;
  unrealized_pnl: string;
  correlation_id: string;
}

export interface RuntimeSettingsDto {
  environment: RuntimeSettings["environment"];
  global_trading_enabled: boolean;
  model: string;
  reasoning_level: RuntimeSettings["reasoningLevel"];
  default_leverage: string;
  manual_confirmation_threshold: string;
  context_window_size: number;
  new_position_capital_range: {
    min: string;
    max: string;
  };
}

export function normalizeList<T>(value: ListResponse<T>): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value.items ?? [];
}

export function mapSession(dto: SessionDto): SessionState {
  return {
    userLabel: dto.user_label,
    authenticated: dto.authenticated,
    environment: dto.environment,
    globalTradingEnabled: dto.global_trading_enabled,
    healthStatus: dto.health_status ?? "healthy",
    pendingManualConfirmationCount: dto.pending_manual_confirmation_count
  };
}

export function mapAlert(dto: AlertDto): AlertItem {
  return {
    id: dto.id,
    level: dto.level,
    message: dto.message,
    occurredAt: dto.occurred_at,
    correlationId: dto.correlation_id
  };
}

export function mapChannel(dto: ChannelDto): ChannelItem {
  return {
    channelId: dto.channel_id,
    channelName: dto.channel_name,
    sourceType: dto.source_type,
    sourceRef: dto.source_ref,
    status: dto.status,
    lastFetchAt: dto.last_fetch_at,
    lastSuccessAt: dto.last_success_at,
    lastErrorSummary: dto.last_error_summary,
    lastMessageResult: dto.last_message_result
  };
}

export function mapLog(dto: LogDto): LogItem {
  return {
    logId: dto.log_id,
    timestamp: dto.timestamp,
    level: dto.level,
    module: dto.module,
    environment: dto.environment,
    channelId: dto.channel_id,
    channelName: dto.channel_name,
    message: dto.message,
    correlationId: dto.correlation_id
  };
}

export function mapManualConfirmation(dto: ManualConfirmationDto): ManualConfirmationItem {
  return {
    confirmationId: dto.confirmation_id,
    status: dto.status,
    channelId: dto.channel_id,
    channelName: dto.channel_name,
    symbol: dto.symbol,
    actionType: dto.action_type,
    confidence: dto.confidence,
    environment: dto.environment,
    createdAt: dto.created_at,
    correlationId: dto.correlation_id
  };
}

export function mapManualConfirmationDetail(dto: ManualConfirmationDetailDto): ManualConfirmationDetail {
  return {
    confirmationId: dto.confirmation_id,
    rawMessage: dto.raw_message,
    contextSummary: dto.context_summary,
    aiDecision: dto.ai_decision,
    keyPriceParams: {
      entry: dto.key_price_params.entry,
      stopLoss: dto.key_price_params.stop_loss,
      takeProfit: dto.key_price_params.take_profit
    },
    invalidReason: dto.invalid_reason,
    executable: dto.executable
  };
}

export function mapOrder(dto: OrderDto): OrderItem {
  return {
    orderId: dto.order_id,
    symbol: dto.symbol,
    side: dto.side,
    status: dto.status,
    price: dto.price,
    quantity: dto.quantity,
    environment: dto.environment,
    decisionId: dto.decision_id,
    correlationId: dto.correlation_id
  };
}

export function mapFill(dto: FillDto): FillItem {
  return {
    fillId: dto.fill_id,
    orderId: dto.order_id,
    symbol: dto.symbol,
    side: dto.side,
    fillPrice: dto.fill_price,
    fillQuantity: dto.fill_quantity,
    filledAt: dto.filled_at,
    environment: dto.environment,
    correlationId: dto.correlation_id
  };
}

export function mapRealPosition(dto: RealPositionDto): RealPositionItem {
  return {
    positionId: dto.position_id,
    symbol: dto.symbol,
    side: dto.side,
    quantity: dto.quantity,
    avgPrice: dto.avg_price,
    markPrice: dto.mark_price,
    unrealizedPnl: dto.unrealized_pnl,
    environment: dto.environment
  };
}

export function mapVirtualPosition(dto: VirtualPositionDto): VirtualPositionItem {
  return {
    virtualPositionId: dto.virtual_position_id,
    channelId: dto.channel_id,
    channelName: dto.channel_name,
    symbol: dto.symbol,
    side: dto.side,
    status: dto.status,
    virtualQuantity: dto.virtual_quantity,
    virtualAvgPrice: dto.virtual_avg_price,
    realizedPnl: dto.realized_pnl,
    unrealizedPnl: dto.unrealized_pnl,
    correlationId: dto.correlation_id
  };
}

export function mapRuntimeSettings(dto: RuntimeSettingsDto): RuntimeSettings {
  return {
    environment: dto.environment,
    globalTradingEnabled: dto.global_trading_enabled,
    model: dto.model,
    reasoningLevel: dto.reasoning_level,
    defaultLeverage: dto.default_leverage,
    manualConfirmationThreshold: dto.manual_confirmation_threshold,
    contextWindowSize: dto.context_window_size,
    newPositionCapitalRange: {
      min: dto.new_position_capital_range.min,
      max: dto.new_position_capital_range.max
    }
  };
}

