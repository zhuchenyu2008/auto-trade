export function labelEnvironment(value: "paper" | "live"): string {
  return value === "paper" ? "模拟盘" : "实盘";
}

export function labelHealthStatus(value: "healthy" | "degraded" | "down"): string {
  if (value === "healthy") {
    return "正常";
  }
  if (value === "degraded") {
    return "降级";
  }
  return "异常";
}

export function labelChannelStatus(value: "enabled" | "disabled"): string {
  return value === "enabled" ? "启用" : "停用";
}

export function labelLogLevel(value: "debug" | "info" | "warning" | "error"): string {
  if (value === "debug") {
    return "调试";
  }
  if (value === "info") {
    return "信息";
  }
  if (value === "warning") {
    return "警告";
  }
  return "错误";
}

export function labelManualStatus(
  value: "pending" | "approved" | "rejected" | "expired" | "invalidated"
): string {
  if (value === "pending") {
    return "待确认";
  }
  if (value === "approved") {
    return "已通过";
  }
  if (value === "rejected") {
    return "已拒绝";
  }
  if (value === "expired") {
    return "已过期";
  }
  return "已失效";
}

export function labelOrderStatus(
  value: "pending" | "partially_filled" | "filled" | "canceled" | "rejected"
): string {
  if (value === "pending") {
    return "待执行";
  }
  if (value === "partially_filled") {
    return "部分成交";
  }
  if (value === "filled") {
    return "已成交";
  }
  if (value === "canceled") {
    return "已取消";
  }
  return "已拒绝";
}

export function labelSide(value: "long" | "short"): string {
  return value === "long" ? "做多" : "做空";
}

export function labelActionType(value: "open_position"): string {
  return value === "open_position" ? "新开仓" : value;
}

export function labelLastMessageResult(value: string): string {
  const map: Record<string, string> = {
    new_message_processed: "新消息已处理",
    no_new_message: "暂无新消息",
    paused: "已暂停",
    created: "已创建",
    no_data: "暂无数据"
  };
  return map[value] ?? value;
}

export function labelModule(value: string): string {
  const map: Record<string, string> = {
    "telegram-intake": "频道抓取",
    "ai-decision": "模型决策",
    "okx-execution": "交易执行",
    "manual-confirmation": "人工确认"
  };
  return map[value] ?? value;
}

export function labelReasoning(value: "low" | "medium" | "high"): string {
  if (value === "low") {
    return "低";
  }
  if (value === "medium") {
    return "中";
  }
  return "高";
}
