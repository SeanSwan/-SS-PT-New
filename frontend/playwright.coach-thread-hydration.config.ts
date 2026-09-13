/**
 * ============================================================================
 * FILE: playwright.coach-thread-hydration.config.ts
 * PURPOSE: Task-local runner for the routed Coach thread hydration gate.
 * AUTHOR: Astra | LAST MODIFIED: 2026-09-13
 * AI VILLAGE VALIDATED: Not requested
 * ============================================================================
 *
 * Modelled on playwright.coach-mobile.config.ts, but scoped to
 * `coach-thread-hydration.spec.ts` so the shared mobile layout gate
 * (coach-command-center-mobile.spec.ts) is not disturbed. One Chromium phone
 * project at the defect viewport; no grep tags are used by this spec.
 */
import { defineConfig } from '@playwright/test';

const phoneScreen = { width: 390, height: 844 };

export default defineConfig({
  testDir: './e2e',
  testMatch: 'coach-thread-hydration.spec.ts',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5197',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'Phone Chromium',
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
