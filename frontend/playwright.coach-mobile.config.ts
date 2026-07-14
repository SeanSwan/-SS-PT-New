/**
 * ============================================================================
 * FILE: playwright.coach-mobile.config.ts
 * PURPOSE: Run the targeted cross-engine Coach mobile layout gate.
 * AUTHOR: Codex | LAST MODIFIED: 2026-07-13
 * AI VILLAGE VALIDATED: Not requested
 * ============================================================================
 *
 * Explicit geometry avoids Playwright's inconsistent named phone descriptors.
 * XR runs in Chromium and WebKit; the full responsive matrix runs in Chromium.
 */
import { defineConfig } from '@playwright/test';

const xrScreen = { width: 414, height: 896 };

export default defineConfig({
  testDir: './e2e',
  testMatch: 'coach-command-center-mobile.spec.ts',
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
      name: 'XR Chromium',
      grep: /@xr/,
      use: {
        browserName: 'chromium',
        viewport: xrScreen,
        screen: xrScreen,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'iPhone XR WebKit',
      grep: /@xr/,
      use: {
        browserName: 'webkit',
        viewport: { width: 414, height: 715 },
        screen: xrScreen,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'Responsive matrix Chromium',
      grep: /@matrix/,
      use: {
        browserName: 'chromium',
        viewport: xrScreen,
        screen: xrScreen,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
