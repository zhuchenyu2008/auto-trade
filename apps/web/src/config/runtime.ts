export type DataSource = "mock" | "api";

export interface RuntimeConfig {
  dataSource: DataSource;
  apiBaseUrl: string;
  enableSse: boolean;
}

function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (!raw) {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}

function parseDataSource(raw: string | undefined): DataSource {
  if (!raw) {
    return "mock";
  }
  return raw.trim().toLowerCase() === "api" ? "api" : "mock";
}

export const runtimeConfig: RuntimeConfig = {
  dataSource: parseDataSource(import.meta.env.VITE_DATA_SOURCE),
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api/v1",
  enableSse: parseBoolean(import.meta.env.VITE_ENABLE_SSE as string | undefined, true)
};

