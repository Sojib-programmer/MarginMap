import { expect, test } from "@playwright/test";

/**
 * Public-surface contract: every marketing route renders, carries its own
 * metadata, and unknown paths return a real HTTP 404 rather than a soft 200.
 */

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/about",
  "/faq",
  "/contact",
  "/methodology",
  "/blog",
  "/privacy",
  "/terms",
  "/landed-cost",
  "/marketplace-fees",
  "/fee-calculator",
  "/sold-comps-vs-asking-price",
  "/reseller-margin-and-roi",
  "/condition-grading",
  "/canonical-product-identity",
  "/evidence-and-data-confidence",
  "/sourcing-workflow",
];

test.describe("public routes", () => {
  for (const path of PUBLIC_ROUTES) {
    test(`${path} renders with unique metadata`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should return 200`).toBe(200);

      const title = await page.title();
      expect(title.length).toBeGreaterThan(10);
      expect(title).not.toMatch(/Lovable/i);

      const description = await page
        .locator('meta[name="description"]')
        .first()
        .getAttribute("content");
      expect(description, `${path} needs a meta description`).toBeTruthy();

      await expect(page.locator("h1")).toHaveCount(1);
    });
  }

  test("unknown paths return HTTP 404, not a soft 404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/find that page/i)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(/.*/, /noindex/);
  });

  test("robots and sitemap are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
  });

  test("private surfaces are excluded from indexing", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/app/");
    expect(sitemap).not.toContain("/auth");
  });
});

test.describe("auth gate", () => {
  test("the workspace redirects signed-out visitors to sign in", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("pricing", () => {
  test("advertises the four current tiers and no retired ones", async ({ page }) => {
    await page.goto("/pricing");
    const body = (await page.textContent("body")) ?? "";
    for (const tier of ["Free", "Pro", "Business", "Enterprise"]) {
      expect(body).toContain(tier);
    }
    expect(body).not.toMatch(/\bResearch plan\b/);
    expect(body).toContain("9.99");
  });
});

test.describe("contact form", () => {
  test("rejects an incomplete submission client-side", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: /send/i }).click();
    await expect(page.getByText(/Tell us who you are|highlighted fields/i).first()).toBeVisible();
  });

  test("hides a honeypot field from real users", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("#company")).toBeHidden();
  });
});
