export type ApiErrorCode =
  | "SESSION_INVALID"
  | "SESSION_LOCKED"
  | "RATE_LIMITED"
  | "MANUAL_CONFIRMATION_EXPIRED"
  | "MANUAL_CONFIRMATION_INVALIDATED"
  | "MANUAL_CONFIRMATION_ALREADY_RESOLVED"
  | "ENVIRONMENT_MISMATCH"
  | "ACTION_NOT_ALLOWED"
  | "RISK_CONFIRMATION_REQUIRED"
  | "VALIDATION_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "UNKNOWN_ERROR";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly requestId: string | null;
  readonly details?: unknown;

  constructor(args: {
    message: string;
    code?: string;
    status: number;
    requestId?: string | null;
    details?: unknown;
  }) {
    super(args.message);
    this.name = "ApiRequestError";
    this.code = (args.code as ApiErrorCode | undefined) ?? "UNKNOWN_ERROR";
    this.status = args.status;
    this.requestId = args.requestId ?? null;
    this.details = args.details;
  }
}

const humanMessages: Record<ApiErrorCode, string> = {
  SESSION_INVALID: "会话已失效，请重新登录。",
  SESSION_LOCKED: "登录已被暂时锁定，请稍后重试。",
  RATE_LIMITED: "请求过于频繁，请稍后再试。",
  MANUAL_CONFIRMATION_EXPIRED: "该确认项已过期。",
  MANUAL_CONFIRMATION_INVALIDATED: "该确认项已失效。",
  MANUAL_CONFIRMATION_ALREADY_RESOLVED: "该确认项已被处理。",
  ENVIRONMENT_MISMATCH: "当前环境与目标对象环境不一致。",
  ACTION_NOT_ALLOWED: "当前状态下不允许执行该操作。",
  RISK_CONFIRMATION_REQUIRED: "该动作需要更高等级确认。",
  VALIDATION_ERROR: "提交参数不符合要求。",
  RESOURCE_NOT_FOUND: "目标对象不存在或已删除。",
  CONFLICT: "状态冲突，请刷新后重试。",
  INTERNAL_ERROR: "服务暂时不可用，请稍后重试。",
  UNKNOWN_ERROR: "请求失败，请稍后重试。"
};

export function toDisplayErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.message && error.message.trim()) {
      return error.message;
    }
    return humanMessages[error.code] ?? humanMessages.UNKNOWN_ERROR;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return humanMessages.UNKNOWN_ERROR;
}

