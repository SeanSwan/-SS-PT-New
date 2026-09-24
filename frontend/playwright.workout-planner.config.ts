/**
 * ============================================================================
 * FILE: playwright.workout-planner.config.ts
 * PURPOSE: Task-local runner for the P58 planner async-retirement browser gate.
 * AUTHOR: Astra slice | LAST MODIFIED: 2026-09-06
 * AI VILLAGE VALIDATED: Not requested
 * ============================================================================
 *
 * Modelled on playwright.coach-thread-hydration.config.ts: testMatch pins this
 * one spec so the shared planner e2e gates (planner-sequence-smoke,
 * planner-regression-fence, coach-command-center-mobile) are not disturbed.
 * Two projects so the plan-58 requirement is checked at the desktop and phone
 * viewports required by the packet (1440x900 and 390x844).
 *
 * SERVER: if BASE_URL is supplied the gate uses that server (e.g. the shared
 * dev server on 4990). Otherwise it uses the repository's own e2e convention
 * from playwright.config.ts and lets Playwright start a task-local Vite server
 * on PW_PLANNER_PORT, because a long-running shared dev server can hold a stale
 * optimizer cache and answer `node_modules/.vite/deps/*` with
 * "504 Outdated Optimize Dep", which the Planner tab renders as its error
 * boundary. A Playwright-managed server is always freshly optimized.
 */
import { defineConfig } from '@playwright/test';

const desktopScreen = { width: 1440, height: 900 };
const phoneScreen = { width: 390, height: 844 };
const externalBaseUrl = process.env.BASE_URL;
const localPort = Number(process.env.PW_PLANNER_PORT || '5231');

export default defineConfig({
  testDir: './e2e',
  testMatch: 'workout-planner-async-retirement.spec.ts',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: externalBaseUrl || `http://127.0.0.1:${localPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  ...(externalBaseUrl ? {} : {
    webServer: {
      command: `npm run dev -- --host 127.0.0.1 --port ${localPort} --strictPort`,
      port: localPort,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  }),
  projects: [
    {
      name: 'Desktop Chromium 1440x900',
      use: { browserName: 'chromium', viewport: desktopScreen, screen: desktopScreen },
    },
    {
      name: 'Phone Chromium 390x844',
      use: {
        browserName: 'chromium',
        viewport: phoneScreen,
        screen: phoneScreen,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
