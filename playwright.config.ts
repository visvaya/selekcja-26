import { defineConfig, devices } from "@playwright/test";

const PORT = 5179;
const PHONE_VIEWPORT = { width: 360, height: 740 };

export default defineConfig({
  testDir: "e2e",
  // Each spec walks a complete two-stage game, so allow more than the 30 s default.
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "pl-PL",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "phone",
      testMatch: /phone|storage/,
      use: { ...devices["Pixel 7"], viewport: PHONE_VIEWPORT },
    },
    {
      name: "desktop-keyboard",
      testMatch: /keyboard/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
