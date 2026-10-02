import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const PORT = 5179;
const PHONE_VIEWPORT = { width: 360, height: 740 };

// Screenshot baselines are committed only for Linux (CI). Locally the project is skipped unless
// VISUAL=1 is set: the {platform} part of snapshotPathTemplate then points at separate local
// files (e.g. *-win32.png), which the first run writes and later runs compare against. They are
// useful only to look at the captured states, and .gitignore keeps them out of the repository.
const visualProject = {
  name: "visual",
  testMatch: /visual/,
  use: { ...devices["Desktop Chrome"] },
};
const runVisual = Boolean(process.env.CI || process.env.VISUAL);

// On Linux (the CI image) the browsers get e2e/fonts.conf, so generic sans-serif text renders in
// a face with bold and Polish letters. Other systems keep their own font setup.
const linuxFontLaunchOptions =
  process.platform === "linux"
    ? {
        env: {
          ...process.env,
          FONTCONFIG_FILE: fileURLToPath(
            new URL("./e2e/fonts.conf", import.meta.url),
          ),
        },
      }
    : {};

export default defineConfig({
  testDir: "e2e",
  // Each spec walks a complete two-stage game, so allow more than the 30 s default.
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  snapshotPathTemplate: "{testDir}/screenshots/{arg}-{platform}{ext}",
  updateSnapshots:
    process.env.CI && !process.env.UPDATE_SCREENSHOTS ? "none" : "missing",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "pl-PL",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Animations add timing noise; the reduced-motion path is the one under test.
    contextOptions: { reducedMotion: "reduce" },
    launchOptions: linuxFontLaunchOptions,
  },
  projects: [
    {
      // The axe scan runs here only: the game is mobile-first, and the layout-dependent rules
      // (contrast of overlapping elements, WCAG 2.2 target size) are most exposed on a narrow
      // screen. The DOM is the same at every width, so a second project repeated the same scan.
      name: "phone",
      testMatch: /phone|storage|side-board|a11y|fonts/,
      use: { ...devices["Pixel 7"], viewport: PHONE_VIEWPORT },
    },
    {
      // Mobile Safari handles focus, scrolling and sticky elements differently from Chromium.
      name: "phone-webkit",
      testMatch: /phone|storage|side-board|fonts/,
      use: { ...devices["iPhone 13"], viewport: PHONE_VIEWPORT },
    },
    {
      name: "desktop-keyboard",
      testMatch: /keyboard/,
      use: { ...devices["Desktop Chrome"] },
    },
    ...(runVisual ? [visualProject] : []),
  ],
  // Tests run against the production build, not the dev server, so they cover what ships
  // and are free of dev-only behavior such as hot-module reloads.
  webServer: {
    command: `pnpm build && pnpm exec vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
