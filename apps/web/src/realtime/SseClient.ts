import type { StreamConnectionStatus, StreamEvent } from "./events";

const RETRY_SCHEDULE_MS = [1000, 2000, 5000, 10000, 20000, 30000];

export interface SseClientOptions {
  url: string;
  onEvent: (event: StreamEvent) => void;
  onStatusChange?: (status: StreamConnectionStatus) => void;
}

function parseStreamEvent(raw: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StreamEvent>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (typeof parsed.event_type !== "string" || typeof parsed.occurred_at !== "string") {
      return null;
    }
    return {
      event_id: parsed.event_id,
      event_type: parsed.event_type,
      occurred_at: parsed.occurred_at,
      environment: parsed.environment,
      payload: (parsed.payload as Record<string, unknown> | undefined) ?? {}
    };
  } catch {
    return null;
  }
}

export class SseClient {
  private readonly options: SseClientOptions;
  private source: EventSource | null = null;
  private retryIndex = 0;
  private reconnectTimer: number | null = null;
  private stopped = true;

  constructor(options: SseClientOptions) {
    this.options = options;
  }

  start(): void {
    if (!this.stopped) {
      return;
    }
    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearReconnectTimer();
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    this.emitStatus("stopped");
  }

  private connect(): void {
    if (this.stopped) {
      return;
    }
    if (this.source) {
      this.source.close();
    }
    this.source = new EventSource(this.options.url, { withCredentials: true });
    this.source.onopen = () => {
      this.retryIndex = 0;
      this.emitStatus("connected");
    };
    this.source.onmessage = (event: MessageEvent<string>) => {
      const parsed = parseStreamEvent(event.data);
      if (!parsed) {
        return;
      }
      this.options.onEvent(parsed);
    };
    this.source.onerror = () => {
      this.emitStatus("degraded");
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped) {
      return;
    }
    this.clearReconnectTimer();
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    const retryDelay =
      RETRY_SCHEDULE_MS[Math.min(this.retryIndex, RETRY_SCHEDULE_MS.length - 1)];
    this.retryIndex += 1;
    this.reconnectTimer = window.setTimeout(() => this.connect(), retryDelay);
  }

  private emitStatus(status: StreamConnectionStatus): void {
    if (!this.options.onStatusChange) {
      return;
    }
    this.options.onStatusChange(status);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) {
      return;
    }
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

