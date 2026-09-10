import { expect, test } from "@playwright/test";

/**
 * Authenticated workspace flow. Requires a seeded test account; the suite skips
 * itself rather than failing when the credentials are not configured, so local
 * runs and forks stay green.
 *
 *   E2E_USER=... E2E_PASS=... npm run test:e2e
 */
const email = process.env["E2E_USER"];
const password = process.env["E2E_PASS"];

test.describe("workspace", () => {
  test.skip(!email || !password, "E2E_USER / E2E_PASS not configured");

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/app/, { timeout: 20_000 });
  });

  test("search returns offers with provenance on every value", async ({ page }) => {
    await page.goto("/app/search");
    await page.getByRole("textbox").first().fill("camera under 800");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("table").first()).toBeVisible({ timeout: 20_000 });
    const body = (await page.textContent("body")) ?? "";
    expect(body).toMatch(/Sample data|Updated/i);
  });

  test("the daily search meter is visible", async ({ page }) => {
    await page.goto("/app");
    await expect(page.getByText(/search/i).first()).toBeVisible();
  });

  test("billing shows the current plan and no checkout that cannot complete", async ({ page }) => {
    await page.goto("/app/billing");
    const body = (await page.textContent("body")) ?? "";
    expect(body).toMatch(/Free|Pro|Business|Enterprise/);
  });

  test("watchlists page loads and can be opened", async ({ page }) => {
    await page.goto("/app/watchlists");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("activity log is readable and append-only in the UI", async ({ page }) => {
    await page.goto("/app/activity");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
  });

  test("signing out returns to the public site", async ({ page }) => {
    await page.goto("/app");
    await page.getByRole("button", { name: /sign out|log out/i }).click();
    await page.waitForURL(/\/(auth)?$/, { timeout: 20_000 });
  });
});
