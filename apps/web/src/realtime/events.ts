import type { Environment } from "../types";

export type StreamEventType =
  | "system.snapshot_updated"
  | "log.appended"
  | "channel.health_changed"
  | "manual_confirmation.changed"
  | "order.changed"
  | "virtual_position.changed";

export interface StreamEvent {
  event_id?: string;
  event_type: StreamEventType;
  occurred_at: string;
  environment?: Environment;
  payload: Record<string, unknown>;
}

export type StreamConnectionStatus = "connected" | "degraded" | "stopped";

