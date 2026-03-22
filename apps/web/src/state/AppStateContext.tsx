import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from "react";
import {
  initialAlerts,
  initialChannels,
  initialFills,
  initialLogs,
  initialManualConfirmationDetails,
  initialManualConfirmations,
  initialOrders,
  initialRealPositions,
  initialRuntimeSettings,
  initialSessionState,
  initialVirtualPositions
} from "../mock-data";
import type {
  AlertItem,
  ChannelItem,
  FillItem,
  HealthStatus,
  LogItem,
  ManualConfirmationDetail,
  ManualConfirmationItem,
  OrderItem,
  RealPositionItem,
  RuntimeSettings,
  SessionState,
  VirtualPositionItem
} from "../types";
import { runtimeConfig } from "../config/runtime";
import { toDisplayErrorMessage } from "../api/errors";
import {
  approveManualConfirmation,
  createChannel as createChannelByApi,
  fetchBootstrapData,
  fetchManualConfirmationDetail,
  login as loginByApi,
  logout as logoutByApi,
  rejectManualConfirmation,
  setChannelStatus,
  updateChannel as updateChannelByApi,
  updateRuntimeSettings as updateRuntimeSettingsByApi
} from "../api/services";
import { SseClient } from "../realtime/SseClient";
import type { StreamConnectionStatus } from "../realtime/events";

const SESSION_STORAGE_KEY = "auto_trade_session";
const POLLING_INTERVAL_MS = 10000;

type RealtimeStatus = StreamConnectionStatus | "idle";

interface AppStateContextValue {
  session: SessionState;
  alerts: AlertItem[];
  channels: ChannelItem[];
  logs: LogItem[];
  manualConfirmations: ManualConfirmationItem[];
  manualConfirmationDetails: Record<string, ManualConfirmationDetail>;
  orders: OrderItem[];
  fills: FillItem[];
  realPositions: RealPositionItem[];
  virtualPositions: VirtualPositionItem[];
  runtimeSettings: RuntimeSettings;
  dataSource: "mock" | "api";
  realtimeStatus: RealtimeStatus;
  login: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refreshFromServer: () => Promise<void>;
  createChannel: (
    channel: Pick<ChannelItem, "channelName" | "sourceType" | "sourceRef">
  ) => Promise<{ ok: boolean; error?: string }>;
  updateChannel: (
    channelId: string,
    update: Partial<Pick<ChannelItem, "channelName" | "sourceType" | "sourceRef">>
  ) => Promise<{ ok: boolean; error?: string }>;
  toggleChannelStatus: (channelId: string) => Promise<{ ok: boolean; error?: string }>;
  approveConfirmation: (confirmationId: string) => void;
  rejectConfirmation: (confirmationId: string) => void;
  updateRuntimeSettings: (settings: RuntimeSettings) => void;
  setEnvironment: (environment: RuntimeSettings["environment"]) => void;
  setGlobalTradingEnabled: (enabled: boolean) => void;
  appendRealtimeLog: () => string;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function deriveHealthStatus(channels: ChannelItem[], alerts: AlertItem[]): HealthStatus {
  const hasErrorAlert = alerts.some((item) => item.level === "error");
  if (hasErrorAlert) {
    return "down";
  }
  const hasWarningAlert = alerts.some((item) => item.level === "warning");
  if (hasWarningAlert || channels.some((channel) => channel.lastErrorSummary)) {
    return "degraded";
  }
  return "healthy";
}

function buildLogId(): string {
  return `log_${Math.random().toString(36).slice(2, 9)}`;
}

function buildAlertId(): string {
  return `alert_${Math.random().toString(36).slice(2, 8)}`;
}

function pickRandomChannel(channels: ChannelItem[]): ChannelItem {
  if (channels.length === 0) {
    return {
      channelId: "ch_default",
      channelName: "未知频道",
      sourceType: "电报网页源",
      sourceRef: "-",
      status: "disabled",
      lastFetchAt: new Date().toISOString(),
      lastSuccessAt: null,
      lastErrorSummary: null,
      lastMessageResult: "no_data"
    };
  }
  const index = Math.floor(Math.random() * channels.length);
  return channels[index];
}

function buildPlaceholderConfirmationDetail(
  item: ManualConfirmationItem
): ManualConfirmationDetail {
  return {
    confirmationId: item.confirmationId,
    rawMessage: "详情加载中",
    contextSummary: "详情加载中",
    aiDecision: "详情加载中",
    keyPriceParams: {
      entry: "-",
      stopLoss: "-",
      takeProfit: "-"
    },
    invalidReason: null,
    executable: item.status === "pending"
  };
}

function buildSseUrl(base: string): string {
  if (!base) {
    return "/api/v1/events/stream";
  }
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${normalized}/events/stream`;
}

export function AppStateProvider({ children }: PropsWithChildren): JSX.Element {
  const [session, setSession] = useState<SessionState>(() => {
    const authenticated = window.localStorage.getItem(SESSION_STORAGE_KEY) === "1";
    return {
      ...initialSessionState,
      authenticated
    };
  });
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [channels, setChannels] = useState<ChannelItem[]>(initialChannels);
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);
  const [manualConfirmations, setManualConfirmations] =
    useState<ManualConfirmationItem[]>(initialManualConfirmations);
  const [manualConfirmationDetails, setManualConfirmationDetails] = useState<
    Record<string, ManualConfirmationDetail>
  >(initialManualConfirmationDetails);
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [fills, setFills] = useState<FillItem[]>(initialFills);
  const [realPositions, setRealPositions] = useState<RealPositionItem[]>(initialRealPositions);
  const [virtualPositions, setVirtualPositions] = useState<VirtualPositionItem[]>(initialVirtualPositions);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(initialRuntimeSettings);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>(
    runtimeConfig.dataSource === "api" ? "degraded" : "idle"
  );

  const refreshFromServer = useCallback(async () => {
    if (runtimeConfig.dataSource !== "api") {
      return;
    }
    const bootstrap = await fetchBootstrapData();
    setSession((previous) => ({
      ...previous,
      ...bootstrap.session,
      authenticated: true
    }));
    setAlerts(bootstrap.alerts);
    setChannels(bootstrap.channels);
    setLogs(bootstrap.logs);
    setManualConfirmations(bootstrap.manualConfirmations);
    setManualConfirmationDetails((previous) => {
      const nextDetails: Record<string, ManualConfirmationDetail> = { ...previous };
      for (const item of bootstrap.manualConfirmations) {
        if (!nextDetails[item.confirmationId]) {
          nextDetails[item.confirmationId] = buildPlaceholderConfirmationDetail(item);
        }
      }
      return nextDetails;
    });
    setOrders(bootstrap.orders);
    setFills(bootstrap.fills);
    setRealPositions(bootstrap.realPositions);
    setVirtualPositions(bootstrap.virtualPositions);
    setRuntimeSettings(bootstrap.runtimeSettings);
  }, []);

  useEffect(() => {
    const pendingCount = manualConfirmations.filter((item) => item.status === "pending").length;
    const healthStatus = deriveHealthStatus(channels, alerts);
    setSession((previous) => ({
      ...previous,
      healthStatus,
      pendingManualConfirmationCount: pendingCount
    }));
  }, [alerts, channels, manualConfirmations]);

  useEffect(() => {
    if (runtimeConfig.dataSource !== "api" || !session.authenticated) {
      return;
    }
    void refreshFromServer().catch(() => {
      setRealtimeStatus("degraded");
    });
  }, [refreshFromServer, session.authenticated]);

  useEffect(() => {
    if (runtimeConfig.dataSource !== "api") {
      setRealtimeStatus("idle");
      return;
    }
    if (!session.authenticated || !runtimeConfig.enableSse) {
      setRealtimeStatus("idle");
      return;
    }
    let pollingTimer: number | null = null;

    const stopPolling = () => {
      if (pollingTimer !== null) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
      }
    };

    const startPolling = () => {
      if (pollingTimer !== null) {
        return;
      }
      pollingTimer = window.setInterval(() => {
        void refreshFromServer().catch(() => {
          setRealtimeStatus("degraded");
        });
      }, POLLING_INTERVAL_MS);
    };

    const sseClient = new SseClient({
      url: buildSseUrl(runtimeConfig.apiBaseUrl),
      onEvent: () => {
        void refreshFromServer().catch(() => {
          setRealtimeStatus("degraded");
        });
      },
      onStatusChange: (status) => {
        setRealtimeStatus(status);
        if (status === "connected") {
          stopPolling();
          return;
        }
        if (status === "degraded") {
          startPolling();
        }
      }
    });

    sseClient.start();
    return () => {
      sseClient.stop();
      stopPolling();
    };
  }, [refreshFromServer, session.authenticated]);

  useEffect(() => {
    if (runtimeConfig.dataSource !== "api" || !session.authenticated) {
      return;
    }
    const missing = manualConfirmations
      .map((item) => item.confirmationId)
      .filter((id) => {
        const detail = manualConfirmationDetails[id];
        if (!detail) {
          return true;
        }
        return detail.rawMessage === "详情加载中";
      });
    if (missing.length === 0) {
      return;
    }
    let cancelled = false;
    void Promise.all(missing.map((id) => fetchManualConfirmationDetail(id).then((detail) => ({ id, detail }))))
      .then((details) => {
        if (cancelled) {
          return;
        }
        setManualConfirmationDetails((previous) => {
          const next = { ...previous };
          for (const item of details) {
            next[item.id] = item.detail;
          }
          return next;
        });
      })
      .catch(() => {
        // Ignore detail hydration failure, list rendering is still usable.
      });
    return () => {
      cancelled = true;
    };
  }, [manualConfirmationDetails, manualConfirmations, session.authenticated]);

  const value: AppStateContextValue = {
    session,
    alerts,
    channels,
    logs,
    manualConfirmations,
    manualConfirmationDetails,
    orders,
    fills,
    realPositions,
    virtualPositions,
    runtimeSettings,
    dataSource: runtimeConfig.dataSource,
    realtimeStatus,
    login: async (password) => {
      if (!/^\d{6}$/.test(password)) {
        return { ok: false, error: "密码必须为6位数字。" };
      }
      if (runtimeConfig.dataSource === "api") {
        try {
          const nextSession = await loginByApi(password);
          window.localStorage.setItem(SESSION_STORAGE_KEY, "1");
          setSession((previous) => ({
            ...previous,
            ...nextSession,
            authenticated: true
          }));
          await refreshFromServer();
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toDisplayErrorMessage(error) };
        }
      }
      window.localStorage.setItem(SESSION_STORAGE_KEY, "1");
      setSession((previous) => ({ ...previous, authenticated: true }));
      return { ok: true };
    },
    logout: () => {
      if (runtimeConfig.dataSource === "api") {
        void logoutByApi().catch(() => {
          // Ignore API logout failure and continue clearing local state.
        });
      }
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      setSession((previous) => ({ ...previous, authenticated: false }));
      setRealtimeStatus("idle");
    },
    refreshFromServer,
    createChannel: async (channel) => {
      if (runtimeConfig.dataSource === "api") {
        try {
          const created = await createChannelByApi(channel);
          setChannels((previous) => [created, ...previous]);
          await refreshFromServer().catch(() => {
            // Ignore refresh failure, optimistic update already applied.
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toDisplayErrorMessage(error) };
        }
      }
      const now = new Date().toISOString();
      const channelId = `ch_${Math.random().toString(36).slice(2, 6)}`;
      setChannels((previous) => [
        {
          channelId,
          channelName: channel.channelName,
          sourceType: channel.sourceType,
          sourceRef: channel.sourceRef,
          status: "enabled",
          lastFetchAt: now,
          lastSuccessAt: now,
          lastErrorSummary: null,
          lastMessageResult: "created"
        },
        ...previous
      ]);
      return { ok: true };
    },
    updateChannel: async (channelId, update) => {
      if (runtimeConfig.dataSource === "api") {
        try {
          const updated = await updateChannelByApi(channelId, update);
          setChannels((previous) =>
            previous.map((channel) => (channel.channelId === channelId ? updated : channel))
          );
          await refreshFromServer().catch(() => {
            // Ignore refresh failure, optimistic update already applied.
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toDisplayErrorMessage(error) };
        }
      }
      setChannels((previous) =>
        previous.map((channel) =>
          channel.channelId === channelId
            ? {
                ...channel,
                ...update
              }
            : channel
        )
      );
      return { ok: true };
    },
    toggleChannelStatus: async (channelId) => {
      if (runtimeConfig.dataSource === "api") {
        const target = channels.find((item) => item.channelId === channelId);
        if (!target) {
          return { ok: false, error: "频道不存在或已被删除。" };
        }
        const nextStatus = target.status === "enabled" ? "disabled" : "enabled";
        try {
          const updated = await setChannelStatus(channelId, nextStatus);
          setChannels((previous) =>
            previous.map((channel) => (channel.channelId === channelId ? updated : channel))
          );
          await refreshFromServer().catch(() => {
            // Ignore refresh failure, optimistic update already applied.
          });
          return { ok: true };
        } catch (error) {
          return { ok: false, error: toDisplayErrorMessage(error) };
        }
      }
      setChannels((previous) =>
        previous.map((channel) =>
          channel.channelId === channelId
            ? {
                ...channel,
                status: channel.status === "enabled" ? "disabled" : "enabled"
              }
            : channel
        )
      );
      return { ok: true };
    },
    approveConfirmation: (confirmationId) => {
      if (runtimeConfig.dataSource === "api") {
        void approveManualConfirmation(confirmationId)
          .then(() => refreshFromServer())
          .catch(() => refreshFromServer());
        return;
      }
      setManualConfirmations((previous) =>
        previous.map((item) =>
          item.confirmationId === confirmationId && item.status === "pending"
            ? { ...item, status: "approved" }
            : item
        )
      );
      setManualConfirmationDetails((previous) => ({
        ...previous,
        [confirmationId]: {
          ...previous[confirmationId],
          executable: false
        }
      }));
      const now = new Date().toISOString();
      setLogs((previous) => [
        {
          logId: buildLogId(),
          timestamp: now,
          level: "info",
          module: "manual-confirmation",
          environment: runtimeSettings.environment,
          channelId: "ch_1",
          channelName: "频道甲",
          message: `人工确认 ${confirmationId} 已通过。`,
          correlationId: confirmationId
        },
        ...previous
      ]);
    },
    rejectConfirmation: (confirmationId) => {
      if (runtimeConfig.dataSource === "api") {
        void rejectManualConfirmation(confirmationId)
          .then(() => refreshFromServer())
          .catch(() => refreshFromServer());
        return;
      }
      setManualConfirmations((previous) =>
        previous.map((item) =>
          item.confirmationId === confirmationId && item.status === "pending"
            ? { ...item, status: "rejected" }
            : item
        )
      );
      setManualConfirmationDetails((previous) => ({
        ...previous,
        [confirmationId]: {
          ...previous[confirmationId],
          executable: false
        }
      }));
      const now = new Date().toISOString();
      setLogs((previous) => [
        {
          logId: buildLogId(),
          timestamp: now,
          level: "warning",
          module: "manual-confirmation",
          environment: runtimeSettings.environment,
          channelId: "ch_1",
          channelName: "频道甲",
          message: `人工确认 ${confirmationId} 已拒绝。`,
          correlationId: confirmationId
        },
        ...previous
      ]);
    },
    updateRuntimeSettings: (settings) => {
      setRuntimeSettings(settings);
      setSession((previous) => ({
        ...previous,
        environment: settings.environment,
        globalTradingEnabled: settings.globalTradingEnabled
      }));
      if (runtimeConfig.dataSource === "api") {
        void updateRuntimeSettingsByApi(settings)
          .then((savedSettings) => {
            setRuntimeSettings(savedSettings);
            setSession((previous) => ({
              ...previous,
              environment: savedSettings.environment,
              globalTradingEnabled: savedSettings.globalTradingEnabled
            }));
          })
          .catch(() => {
            void refreshFromServer();
          });
      }
    },
    setEnvironment: (environment) => {
      const next = {
        ...runtimeSettings,
        environment
      };
      setRuntimeSettings(next);
      setSession((previous) => ({
        ...previous,
        environment
      }));
      if (runtimeConfig.dataSource === "api") {
        void updateRuntimeSettingsByApi(next)
          .then((savedSettings) => {
            setRuntimeSettings(savedSettings);
            setSession((previous) => ({
              ...previous,
              environment: savedSettings.environment
            }));
          })
          .catch(() => {
            void refreshFromServer();
          });
      }
    },
    setGlobalTradingEnabled: (enabled) => {
      const next = {
        ...runtimeSettings,
        globalTradingEnabled: enabled
      };
      setRuntimeSettings(next);
      setSession((previous) => ({
        ...previous,
        globalTradingEnabled: enabled
      }));
      if (runtimeConfig.dataSource === "api") {
        void updateRuntimeSettingsByApi(next)
          .then((savedSettings) => {
            setRuntimeSettings(savedSettings);
            setSession((previous) => ({
              ...previous,
              globalTradingEnabled: savedSettings.globalTradingEnabled
            }));
          })
          .catch(() => {
            void refreshFromServer();
          });
      }
    },
    appendRealtimeLog: () => {
      const now = new Date().toISOString();
      const channel = pickRandomChannel(channels);
      const isWarning = Math.random() > 0.65;
      const level = isWarning ? "warning" : "info";
      const logId = buildLogId();
      const correlationId = `corr_${Math.random().toString(36).slice(2, 8)}`;
      const nextLog: LogItem = {
        logId,
        timestamp: now,
        level,
        module: isWarning ? "telegram-intake" : "ai-decision",
        environment: runtimeSettings.environment,
        channelId: channel.channelId,
        channelName: channel.channelName,
        message: isWarning
          ? "检测到抓取延迟，已触发回退轮询。"
          : "信号评估完成，状态已同步。",
        correlationId
      };
      setLogs((previous) => [nextLog, ...previous]);
      if (isWarning) {
        setAlerts((previous) => [
          {
            id: buildAlertId(),
            level: "warning",
            message: `${channel.channelName} 报告抓取延迟。`,
            occurredAt: now,
            correlationId
          },
          ...previous
        ]);
      }
      return logId;
    }
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState 必须在 AppStateProvider 内部使用。");
  }
  return context;
}
