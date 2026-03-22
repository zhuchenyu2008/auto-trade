import {
  mapAlert,
  mapChannel,
  mapFill,
  mapLog,
  mapManualConfirmation,
  mapManualConfirmationDetail,
  mapOrder,
  mapRealPosition,
  mapRuntimeSettings,
  mapSession,
  mapVirtualPosition,
  normalizeList,
  type ChannelDto,
  type FillDto,
  type LogDto,
  type ManualConfirmationDetailDto,
  type ManualConfirmationDto,
  type OrderDto,
  type OverviewSummaryDto,
  type RealPositionDto,
  type RuntimeSettingsDto,
  type SessionDto,
  type VirtualPositionDto
} from "./contracts";
import { apiRequest, createCorrelationId, createIdempotencyKey } from "./client";
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

export interface ConsoleBootstrapData {
  session: SessionState;
  alerts: AlertItem[];
  channels: ChannelItem[];
  logs: LogItem[];
  manualConfirmations: ManualConfirmationItem[];
  orders: OrderItem[];
  fills: FillItem[];
  realPositions: RealPositionItem[];
  virtualPositions: VirtualPositionItem[];
  runtimeSettings: RuntimeSettings;
}

export interface ChannelWriteInput {
  channelName: string;
  sourceType: string;
  sourceRef: string;
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export async function fetchSession(): Promise<SessionState> {
  const dto = await apiRequest<SessionDto>("/auth/session");
  return mapSession(dto);
}

export async function login(password: string): Promise<SessionState> {
  const dto = await apiRequest<SessionDto>("/auth/login", {
    method: "POST",
    body: { password },
    idempotencyKey: createIdempotencyKey("login")
  });
  return mapSession(dto);
}

export async function logout(): Promise<void> {
  await apiRequest<null>("/auth/logout", {
    method: "POST",
    idempotencyKey: createIdempotencyKey("logout")
  });
}

export async function fetchOverviewSummary(): Promise<{
  alerts: AlertItem[];
  channels: ChannelItem[];
  healthStatus: SessionState["healthStatus"];
  pendingManualConfirmationCount: number;
}> {
  const dto = await apiRequest<OverviewSummaryDto>("/overview/summary");
  return {
    alerts: dto.recent_alerts.map(mapAlert),
    channels: dto.channel_summaries.map(mapChannel),
    healthStatus: dto.health_status,
    pendingManualConfirmationCount: dto.pending_manual_confirmation_count
  };
}

export async function fetchChannels(limit = 100): Promise<ChannelItem[]> {
  const dto = await apiRequest<ChannelDto[] | { items: ChannelDto[] }>(`/channels${buildQuery({ limit })}`);
  return normalizeList(dto).map(mapChannel);
}

export async function createChannel(input: ChannelWriteInput): Promise<ChannelItem> {
  const correlationId = createCorrelationId("channel_create");
  const dto = await apiRequest<ChannelDto>("/channels", {
    method: "POST",
    idempotencyKey: createIdempotencyKey("create_channel"),
    correlationId,
    audit: {
      action: "channel.create",
      target: input.channelName
    },
    body: {
      channel_name: input.channelName,
      source_type: input.sourceType,
      source_ref: input.sourceRef
    }
  });
  return mapChannel(dto);
}

export async function updateChannel(
  channelId: string,
  input: Partial<ChannelWriteInput>
): Promise<ChannelItem> {
  const correlationId = createCorrelationId("channel_update");
  const dto = await apiRequest<ChannelDto>(`/channels/${encodeURIComponent(channelId)}`, {
    method: "PATCH",
    idempotencyKey: createIdempotencyKey("update_channel"),
    correlationId,
    audit: {
      action: "channel.update",
      target: channelId
    },
    body: {
      channel_name: input.channelName,
      source_type: input.sourceType,
      source_ref: input.sourceRef
    }
  });
  return mapChannel(dto);
}

export async function setChannelStatus(
  channelId: string,
  status: ChannelItem["status"]
): Promise<ChannelItem> {
  const correlationId = createCorrelationId("channel_status");
  const dto = await apiRequest<ChannelDto>(`/channels/${encodeURIComponent(channelId)}`, {
    method: "PATCH",
    idempotencyKey: createIdempotencyKey("toggle_channel"),
    correlationId,
    audit: {
      action: "channel.toggle_status",
      target: channelId
    },
    body: {
      status
    }
  });
  return mapChannel(dto);
}

export async function fetchLogs(limit = 120): Promise<LogItem[]> {
  const dto = await apiRequest<LogDto[] | { items: LogDto[] }>(`/logs${buildQuery({ limit })}`);
  return normalizeList(dto).map(mapLog);
}

export async function fetchManualConfirmations(limit = 100): Promise<ManualConfirmationItem[]> {
  const dto = await apiRequest<ManualConfirmationDto[] | { items: ManualConfirmationDto[] }>(
    `/manual-confirmations${buildQuery({ limit })}`
  );
  return normalizeList(dto).map(mapManualConfirmation);
}

export async function fetchManualConfirmationDetail(
  confirmationId: string
): Promise<ManualConfirmationDetail> {
  const dto = await apiRequest<ManualConfirmationDetailDto>(
    `/manual-confirmations/${encodeURIComponent(confirmationId)}`
  );
  return mapManualConfirmationDetail(dto);
}

export async function approveManualConfirmation(confirmationId: string): Promise<void> {
  const correlationId = createCorrelationId("manual_approve");
  await apiRequest<null>(`/manual-confirmations/${encodeURIComponent(confirmationId)}/approve`, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("approve_confirmation"),
    correlationId,
    audit: {
      action: "manual_confirmation.approve",
      target: confirmationId
    }
  });
}

export async function rejectManualConfirmation(confirmationId: string): Promise<void> {
  const correlationId = createCorrelationId("manual_reject");
  await apiRequest<null>(`/manual-confirmations/${encodeURIComponent(confirmationId)}/reject`, {
    method: "POST",
    idempotencyKey: createIdempotencyKey("reject_confirmation"),
    correlationId,
    audit: {
      action: "manual_confirmation.reject",
      target: confirmationId
    }
  });
}

export async function fetchOrders(limit = 100): Promise<OrderItem[]> {
  const dto = await apiRequest<OrderDto[] | { items: OrderDto[] }>(`/orders${buildQuery({ limit })}`);
  return normalizeList(dto).map(mapOrder);
}

export async function fetchFills(limit = 100): Promise<FillItem[]> {
  const dto = await apiRequest<FillDto[] | { items: FillDto[] }>(`/fills${buildQuery({ limit })}`);
  return normalizeList(dto).map(mapFill);
}

export async function fetchRealPositions(limit = 100): Promise<RealPositionItem[]> {
  const dto = await apiRequest<RealPositionDto[] | { items: RealPositionDto[] }>(
    `/real-positions${buildQuery({ limit })}`
  );
  return normalizeList(dto).map(mapRealPosition);
}

export async function fetchVirtualPositions(limit = 100): Promise<VirtualPositionItem[]> {
  const dto = await apiRequest<VirtualPositionDto[] | { items: VirtualPositionDto[] }>(
    `/virtual-positions${buildQuery({ limit })}`
  );
  return normalizeList(dto).map(mapVirtualPosition);
}

export async function fetchRuntimeSettings(): Promise<RuntimeSettings> {
  const dto = await apiRequest<RuntimeSettingsDto>("/settings/runtime");
  return mapRuntimeSettings(dto);
}

export async function updateRuntimeSettings(settings: RuntimeSettings): Promise<RuntimeSettings> {
  const correlationId = createCorrelationId("runtime_update");
  const dto = await apiRequest<RuntimeSettingsDto>("/settings/runtime", {
    method: "PUT",
    idempotencyKey: createIdempotencyKey("update_runtime_settings"),
    correlationId,
    audit: {
      action: "runtime_settings.update",
      target: settings.environment
    },
    body: {
      environment: settings.environment,
      global_trading_enabled: settings.globalTradingEnabled,
      model: settings.model,
      reasoning_level: settings.reasoningLevel,
      default_leverage: settings.defaultLeverage,
      manual_confirmation_threshold: settings.manualConfirmationThreshold,
      context_window_size: settings.contextWindowSize,
      new_position_capital_range: {
        min: settings.newPositionCapitalRange.min,
        max: settings.newPositionCapitalRange.max
      }
    }
  });
  return mapRuntimeSettings(dto);
}

export async function fetchBootstrapData(): Promise<ConsoleBootstrapData> {
  const [
    session,
    overview,
    channels,
    logs,
    manualConfirmations,
    orders,
    fills,
    realPositions,
    virtualPositions,
    runtimeSettings
  ] = await Promise.all([
    fetchSession(),
    fetchOverviewSummary(),
    fetchChannels(),
    fetchLogs(),
    fetchManualConfirmations(),
    fetchOrders(),
    fetchFills(),
    fetchRealPositions(),
    fetchVirtualPositions(),
    fetchRuntimeSettings()
  ]);

  return {
    session: {
      ...session,
      healthStatus: overview.healthStatus,
      pendingManualConfirmationCount: overview.pendingManualConfirmationCount
    },
    alerts: overview.alerts,
    channels: channels.length > 0 ? channels : overview.channels,
    logs,
    manualConfirmations,
    orders,
    fills,
    realPositions,
    virtualPositions,
    runtimeSettings
  };
}
