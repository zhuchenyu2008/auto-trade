import { expect, test } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";

const routeChecks: Array<{ route: string; title: string }> = [
  { route: "/overview", title: "系统总览" },
  { route: "/channels", title: "频道管理" },
  { route: "/logs", title: "实时日志" },
  { route: "/manual-confirmations", title: "人工确认" },
  { route: "/orders", title: "交易所事实视图" },
  { route: "/virtual-positions", title: "解释层虚拟视图" },
  { route: "/settings", title: "运行参数设置" }
];

test("Phase 4.3：API 模式关键页面在真实后端下可加载", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await page.goto(`${BASE_URL}/login`);
  await page.fill("#password", "123456");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(new RegExp("/overview$"));
  await expect(page.locator(".brand-block")).toContainText("系统总览");

  for (const item of routeChecks) {
    await page.goto(`${BASE_URL}${item.route}`);
    await expect(page).toHaveURL(new RegExp(`${item.route}$`));
    await expect(page.locator(".brand-block")).toContainText(item.title);
  }

  await page.reload();
  await expect(page).toHaveURL(new RegExp("/settings$"));
  await expect(page.locator(".page-header h1")).toContainText("系统设置");

  expect(pageErrors, `页面运行时异常: ${pageErrors.join(" | ")}`).toEqual([]);
});
