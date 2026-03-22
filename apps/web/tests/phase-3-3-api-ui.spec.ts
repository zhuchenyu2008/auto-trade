import { test, expect } from "@playwright/test";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const pump = promisify(pipeline);
const HOST = "127.0.0.1";
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const DIST_DIR = join(__dirname, "..", "dist");

type JsonRecord = Record<string, unknown>;

interface Envelope<T> {
  data: T;
  meta: {
    request_id: string;
    server_time: string;
  };
  error: null;
}

interface ChannelDto {
  channel_id: string;
  channel_name: string;
  source_type: string;
  source_ref: string;
  status: "enabled" | "disabled";
  last_fetch_at: string;
  last_success_at: string | null;
  last_error_summary: string | null;
  last_message_result: string;
}

interface RuntimeSettingsDto {
  environment: "paper" | "live";
  global_trading_enabled: boolean;
  model: string;
  reasoning_level: "low" | "medium" | "high";
  default_leverage: string;
  manual_confirmation_threshold: string;
  context_window_size: number;
  new_position_capital_range: {
    min: string;
    max: string;
  };
}

interface State {
  authenticated: boolean;
  channels: ChannelDto[];
  runtimeSettings: RuntimeSettingsDto;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getRequestBody(request: IncomingMessage): Promise<JsonRecord> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const content = Buffer.concat(chunks).toString("utf8").trim();
      if (!content) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(content) as JsonRecord);
      } catch {
        resolve({});
      }
    });
  });
}

function writeJson<T>(response: ServerResponse, payload: T, status = 200): void {
  const envelope: Envelope<T> = {
    data: payload,
    meta: {
      request_id: `req_${Date.now()}`,
      server_time: nowIso()
    },
    error: null
  };
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(envelope));
}

function mimeType(pathname: string): string {
  const ext = extname(pathname).toLowerCase();
  switch (ext) {
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json; charset=utf-8";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function getInitialState(): State {
  return {
    authenticated: false,
    channels: [
      {
        channel_id: "ch_api_1",
        channel_name: "API验证频道A",
        source_type: "telegram_web",
        source_ref: "https://api.example/channels/a",
        status: "enabled",
        last_fetch_at: "2026-03-22T08:00:10Z",
        last_success_at: "2026-03-22T08:00:08Z",
        last_error_summary: null,
        last_message_result: "new_message_processed"
      },
      {
        channel_id: "ch_api_2",
        channel_name: "API验证频道B",
        source_type: "telegram_web",
        source_ref: "https://api.example/channels/b",
        status: "disabled",
        last_fetch_at: "2026-03-22T08:00:00Z",
        last_success_at: "2026-03-22T07:59:58Z",
        last_error_summary: null,
        last_message_result: "paused"
      }
    ],
    runtimeSettings: {
      environment: "paper",
      global_trading_enabled: true,
      model: "模型5.4",
      reasoning_level: "medium",
      default_leverage: "3",
      manual_confirmation_threshold: "0.66",
      context_window_size: 30,
      new_position_capital_range: {
        min: "0.02",
        max: "0.08"
      }
    }
  };
}

function createServer(state: State): http.Server {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", BASE_URL);
    const pathname = url.pathname;
    const method = request.method ?? "GET";

    if (pathname.startsWith("/api/v1")) {
      if (pathname === "/api/v1/auth/login" && method === "POST") {
        const body = await getRequestBody(request);
        const password = typeof body.password === "string" ? body.password : "";
        if (!/^\d{6}$/.test(password)) {
          response.statusCode = 400;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              data: null,
              meta: { request_id: `req_${Date.now()}`, server_time: nowIso() },
              error: { code: "INVALID_PASSWORD", message: "密码格式错误", details: null }
            })
          );
          return;
        }
        state.authenticated = true;
        writeJson(response, {
          user_label: "owner",
          authenticated: true,
          environment: state.runtimeSettings.environment,
          global_trading_enabled: state.runtimeSettings.global_trading_enabled,
          health_status: "healthy",
          pending_manual_confirmation_count: 0
        });
        return;
      }

      if (pathname === "/api/v1/auth/logout" && method === "POST") {
        state.authenticated = false;
        writeJson(response, null);
        return;
      }

      if (pathname === "/api/v1/auth/session" && method === "GET") {
        writeJson(response, {
          user_label: "owner",
          authenticated: state.authenticated,
          environment: state.runtimeSettings.environment,
          global_trading_enabled: state.runtimeSettings.global_trading_enabled,
          health_status: "healthy",
          pending_manual_confirmation_count: 0
        });
        return;
      }

      if (pathname === "/api/v1/overview/summary" && method === "GET") {
        writeJson(response, {
          environment: state.runtimeSettings.environment,
          global_trading_enabled: state.runtimeSettings.global_trading_enabled,
          health_status: "healthy",
          pending_manual_confirmation_count: 0,
          recent_alerts: [],
          channel_summaries: state.channels
        });
        return;
      }

      if (pathname === "/api/v1/channels" && method === "GET") {
        writeJson(response, { items: state.channels });
        return;
      }

      if (pathname === "/api/v1/channels" && method === "POST") {
        const body = await getRequestBody(request);
        const created: ChannelDto = {
          channel_id: `ch_api_${Date.now()}`,
          channel_name: String(body.channel_name ?? "未命名频道"),
          source_type: String(body.source_type ?? "telegram_web"),
          source_ref: String(body.source_ref ?? ""),
          status: "enabled",
          last_fetch_at: nowIso(),
          last_success_at: nowIso(),
          last_error_summary: null,
          last_message_result: "created"
        };
        state.channels = [created, ...state.channels];
        writeJson(response, created, 201);
        return;
      }

      if (pathname.startsWith("/api/v1/channels/") && method === "PATCH") {
        const channelId = pathname.replace("/api/v1/channels/", "");
        const body = await getRequestBody(request);
        const target = state.channels.find((item) => item.channel_id === channelId);
        if (!target) {
          response.statusCode = 404;
          response.end();
          return;
        }
        if (typeof body.channel_name === "string") {
          target.channel_name = body.channel_name;
        }
        if (typeof body.source_type === "string") {
          target.source_type = body.source_type;
        }
        if (typeof body.source_ref === "string") {
          target.source_ref = body.source_ref;
        }
        if (body.status === "enabled" || body.status === "disabled") {
          target.status = body.status;
        }
        target.last_fetch_at = nowIso();
        target.last_success_at = nowIso();
        writeJson(response, target);
        return;
      }

      if (pathname === "/api/v1/logs" && method === "GET") {
        writeJson(response, {
          items: [
            {
              log_id: "log_api_1",
              timestamp: "2026-03-22T08:01:10Z",
              level: "info",
              module: "telegram-intake",
              environment: "paper",
              channel_id: "ch_api_1",
              channel_name: "API验证频道A",
              message: "接口模式数据加载成功。",
              correlation_id: "corr_api_1"
            }
          ]
        });
        return;
      }

      if (pathname === "/api/v1/manual-confirmations" && method === "GET") {
        writeJson(response, { items: [] });
        return;
      }

      if (pathname.startsWith("/api/v1/manual-confirmations/") && method === "GET") {
        const confirmationId = pathname.replace("/api/v1/manual-confirmations/", "");
        writeJson(response, {
          confirmation_id: confirmationId,
          raw_message: "N/A",
          context_summary: "N/A",
          ai_decision: "N/A",
          key_price_params: { entry: "-", stop_loss: "-", take_profit: "-" },
          invalid_reason: null,
          executable: false
        });
        return;
      }

      if (pathname.endsWith("/approve") && method === "POST") {
        writeJson(response, null);
        return;
      }

      if (pathname.endsWith("/reject") && method === "POST") {
        writeJson(response, null);
        return;
      }

      if (pathname === "/api/v1/orders" && method === "GET") {
        writeJson(response, { items: [] });
        return;
      }

      if (pathname === "/api/v1/fills" && method === "GET") {
        writeJson(response, { items: [] });
        return;
      }

      if (pathname === "/api/v1/real-positions" && method === "GET") {
        writeJson(response, { items: [] });
        return;
      }

      if (pathname === "/api/v1/virtual-positions" && method === "GET") {
        writeJson(response, { items: [] });
        return;
      }

      if (pathname === "/api/v1/settings/runtime" && method === "GET") {
        writeJson(response, state.runtimeSettings);
        return;
      }

      if (pathname === "/api/v1/settings/runtime" && method === "PUT") {
        const body = await getRequestBody(request);
        state.runtimeSettings = {
          environment: body.environment === "live" ? "live" : "paper",
          global_trading_enabled: Boolean(body.global_trading_enabled),
          model: String(body.model ?? state.runtimeSettings.model),
          reasoning_level:
            body.reasoning_level === "low" || body.reasoning_level === "high"
              ? body.reasoning_level
              : "medium",
          default_leverage: String(body.default_leverage ?? state.runtimeSettings.default_leverage),
          manual_confirmation_threshold: String(
            body.manual_confirmation_threshold ?? state.runtimeSettings.manual_confirmation_threshold
          ),
          context_window_size: Number(
            body.context_window_size ?? state.runtimeSettings.context_window_size
          ),
          new_position_capital_range: {
            min: String(
              (body.new_position_capital_range as JsonRecord | undefined)?.min ??
                state.runtimeSettings.new_position_capital_range.min
            ),
            max: String(
              (body.new_position_capital_range as JsonRecord | undefined)?.max ??
                state.runtimeSettings.new_position_capital_range.max
            )
          }
        };
        writeJson(response, state.runtimeSettings);
        return;
      }

      response.statusCode = 404;
      response.end();
      return;
    }

    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    const requestPath = (safePath === "/" ? "/index.html" : safePath).replace(/^[/\\]+/, "");
    const filePath = join(DIST_DIR, requestPath);

    if (existsSync(filePath)) {
      response.statusCode = 200;
      response.setHeader("Content-Type", mimeType(filePath));
      await pump(createReadStream(filePath), response);
      return;
    }

    const htmlPath = join(DIST_DIR, "index.html");
    if (existsSync(htmlPath)) {
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(readFileSync(htmlPath, "utf8"));
      return;
    }

    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end("dist not found. Please run build first.");
  });
}

let state: State;
let server: http.Server;

test.beforeAll(async () => {
  if (!existsSync(DIST_DIR)) {
    throw new Error(`dist 目录不存在：${DIST_DIR}`);
  }
  state = getInitialState();
  server = createServer(state);
  await new Promise<void>((resolve) => {
    server.listen(PORT, HOST, () => resolve());
  });
});

test.afterAll(async () => {
  if (!server) {
    return;
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("Phase 3.3 剩余两项：真实 API 数据来源 + 操作后前后端状态一致", async ({ page, request }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#password", "123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/overview$/);

  await page.locator(".sidebar").getByRole("link", { name: "频道", exact: true }).click();
  await expect(page).toHaveURL(/\/channels$/);

  const apiRow = page.locator("tr", { hasText: "API验证频道A" });
  await expect(apiRow).toBeVisible();
  await expect(apiRow).toContainText("https://api.example/channels/a");

  await expect(page.getByText("频道甲")).toHaveCount(0);

  await expect(apiRow).toContainText("启用");
  await apiRow.getByRole("button", { name: "停用" }).click();
  await expect(apiRow).toContainText("停用");
  await expect(apiRow.getByRole("button", { name: "启用" })).toBeVisible();

  const response = await request.get(`${BASE_URL}/api/v1/channels`);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as Envelope<{ items: ChannelDto[] }>;
  const target = payload.data.items.find((item) => item.channel_id === "ch_api_1");
  expect(target).toBeTruthy();
  expect(target?.status).toBe("disabled");
});
