import { runtimeConfig } from "../config/runtime";
import { ApiRequestError, type ApiErrorPayload } from "./errors";

export interface ApiMeta {
  request_id: string;
  server_time: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ApiMeta;
  error: ApiErrorPayload | null;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  idempotencyKey?: string;
  correlationId?: string;
  audit?: {
    action: string;
    target?: string;
  };
}

function normalizeBase(base: string): string {
  if (!base) {
    return "";
  }
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBase(runtimeConfig.apiBaseUrl)}${normalizedPath}`;
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload;
}

async function toRequestError(response: Response): Promise<ApiRequestError> {
  const envelope = await parseEnvelope<unknown>(response);
  const requestId = envelope?.meta?.request_id ?? null;
  const payloadError = envelope?.error;
  if (payloadError) {
    return new ApiRequestError({
      message: payloadError.message || "请求失败",
      code: payloadError.code,
      status: response.status,
      requestId,
      details: payloadError.details
    });
  }
  return new ApiRequestError({
    message: `请求失败（HTTP ${response.status}）`,
    status: response.status,
    requestId
  });
}

function buildHeaders(options?: RequestOptions): Headers {
  const headers = new Headers(options?.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("X-Operator-Source")) {
    headers.set("X-Operator-Source", "web-console");
  }
  if (options?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options?.idempotencyKey) {
    headers.set("X-Idempotency-Key", options.idempotencyKey);
  }
  if (options?.correlationId) {
    headers.set("X-Correlation-Id", options.correlationId);
  }
  if (options?.audit?.action) {
    headers.set("X-Audit-Action", options.audit.action);
  }
  if (options?.audit?.target) {
    headers.set("X-Audit-Target", options.audit.target);
  }
  return headers;
}

export async function apiRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  const body = options?.body;
  const requestInit: RequestInit = {
    method: options?.method ?? "GET",
    credentials: "include",
    headers: buildHeaders(options),
    cache: options?.cache,
    integrity: options?.integrity,
    keepalive: options?.keepalive,
    mode: options?.mode,
    redirect: options?.redirect,
    referrer: options?.referrer,
    referrerPolicy: options?.referrerPolicy,
    signal: options?.signal
  };
  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), requestInit);
  if (!response.ok) {
    throw await toRequestError(response);
  }

  const envelope = await parseEnvelope<T>(response);
  if (!envelope) {
    throw new ApiRequestError({
      message: "响应格式错误：缺少标准包络。",
      status: response.status
    });
  }

  if (envelope.error) {
    throw new ApiRequestError({
      message: envelope.error.message || "请求失败",
      code: envelope.error.code,
      status: response.status,
      requestId: envelope.meta?.request_id,
      details: envelope.error.details
    });
  }
  return envelope.data;
}

export function createIdempotencyKey(prefix: string): string {
  const safePrefix = prefix.trim() || "action";
  const random = Math.random().toString(36).slice(2, 10);
  return `${safePrefix}_${Date.now()}_${random}`;
}

export function createCorrelationId(prefix: string): string {
  const safePrefix = prefix.trim() || "corr";
  const random = Math.random().toString(36).slice(2, 10);
  return `${safePrefix}_${Date.now()}_${random}`;
}
