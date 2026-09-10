import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["E2E_BASE_URL"] ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 2 : undefined,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Sandboxes that ship a preinstalled Chromium can point at it instead
        // of downloading a second copy; CI leaves this unset.
        launchOptions: process.env["PW_CHROMIUM_PATH"]
          ? { executablePath: process.env["PW_CHROMIUM_PATH"] }
          : {},
      },
    },
  ],
  webServer: process.env["E2E_BASE_URL"]
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
