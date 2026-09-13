/**
 * Bounded Playwright config for the Rolodex repair acceptance harness (S04).
 * ========================================================================
 * Deliberately standalone: it does NOT extend playwright.config.ts, so none of
 * the production-auth fixtures, storageState or global setup used by the app
 * suites can leak into this run.
 *
 * The webServer is a loopback-only Vite dev server on a dedicated port. It is
 * started and stopped by Playwright and serves the dev entry, which is what
 * makes the real Vite module Worker (exerciseSearch.worker.ts) load for real.
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.ROLODEX_HARNESS_PORT || 5317);

export default defineConfig({
  testDir: './tests/audit',
  testMatch: 'rolodex-repair.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: '../../.mega-blueprints/artifacts/b214f060bbec9038/playwright-rolodex-repair',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // No storageState: a fresh, unauthenticated context is the point.
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/tests/audit/rolodex-repair.html`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
