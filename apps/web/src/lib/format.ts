export function formatUtcDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

export function formatDeltaMinutes(value: string): string {
  const inputDate = new Date(value);
  if (Number.isNaN(inputDate.getTime())) {
    return "-";
  }
  const now = Date.now();
  const deltaMs = Math.max(now - inputDate.getTime(), 0);
  const minutes = Math.floor(deltaMs / 60000);
  if (minutes < 1) {
    return "刚刚";
  }
  if (minutes === 1) {
    return "1分钟前";
  }
  return `${minutes}分钟前`;
}

export function formatSigned(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value;
  }
  if (numeric > 0) {
    return `+${numeric.toFixed(2)}`;
  }
  if (numeric < 0) {
    return numeric.toFixed(2);
  }
  return "0.00";
}
