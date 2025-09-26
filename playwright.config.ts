// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer:
    process.env.PW_WEB_SERVER === "0"
      ? undefined
      : [
          {
            // Build + serve prod to keep behavior consistent
            command: "pnpm build && pnpm start -p 3000",
            url: "http://localhost:3000",
            timeout: 120_000,
            reuseExistingServer: !process.env.CI,
          },
        ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
