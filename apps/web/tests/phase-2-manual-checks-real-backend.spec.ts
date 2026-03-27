import { expect, test } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";

test("Phase 2 手工未测项代测：设置持久化、日志可见、连续使用与退出保护", async ({ page }) => {
  const uniqueModel = `phase2-model-${Date.now()}`;
  const loginRequests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("auth/login")) {
      loginRequests.push(url);
    }
  });

  await page.goto(`${BASE_URL}/login`);
  await page.fill("#password", "123456");
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(600);
  if (!/\/overview$/.test(page.url())) {
    const formError = await page.locator(".form-error").first().textContent().catch(() => null);
    throw new Error(
      `登录后未跳转。当前 URL=${page.url()}，登录请求=${loginRequests.join(" | ") || "无"}，错误提示=${formError ?? "无"}`
    );
  }

  await page.goto(`${BASE_URL}/settings`);
  const modelInput = page.locator("label", { hasText: "模型" }).locator("input").first();
  await expect(modelInput).toHaveValue(/.+/);
  await modelInput.fill(uniqueModel);
  const saveRequest = page.waitForResponse(
    (response) => response.request().method() === "PUT" && response.url().includes("/settings/runtime")
  );
  await page.getByRole("button", { name: "保存运行设置" }).click({ force: true });
  const saveResponse = await saveRequest;
  expect(saveResponse.ok()).toBeTruthy();
  await expect(page.locator(".page-header")).toContainText("已保存并生效");

  await page.reload();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(modelInput).toHaveValue(uniqueModel);

  await page.goto(`${BASE_URL}/logs`);
  await page.reload();
  await expect(page.locator("tbody")).toContainText("运行时设置已更新");

  await page.goto(`${BASE_URL}/overview`);
  await expect(page.locator(".brand-block")).toContainText("系统总览");
  await page.goto(`${BASE_URL}/channels`);
  await expect(page.locator(".brand-block")).toContainText("频道管理");
  await page.goto(`${BASE_URL}/manual-confirmations`);
  await expect(page.locator(".brand-block")).toContainText("人工确认");

  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto(`${BASE_URL}/overview`);
  await expect(page).toHaveURL(/\/login$/);
});
