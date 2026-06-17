import { defineConfig, devices } from '@playwright/test';

const skipWebServer = process.env.SWAN_PLAYWRIGHT_SKIP_WEBSERVER === '1';
const frontendPort = Number(process.env.SWAN_PLAYWRIGHT_FRONTEND_PORT || '5173');
const backendPort = Number(process.env.SWAN_PLAYWRIGHT_BACKEND_PORT || '10000');
const reuseExistingFrontend = process.env.SWAN_PLAYWRIGHT_REUSE_EXISTING_SERVER === '1';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: skipWebServer ? 'block' : 'allow',
  },
  ...(skipWebServer ? {} : {
    webServer: [
      {
        command: 'cd ../backend && node server.mjs',
        port: backendPort,
        reuseExistingServer: true,
        timeout: 60_000,
      },
      {
        command: `npm run dev -- --host 0.0.0.0 --port ${frontendPort} --strictPort`,
        port: frontendPort,
        reuseExistingServer: reuseExistingFrontend,
        timeout: 30_000,
      },
    ],
  }),
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    {
      name: 'API Tests',
      testMatch: /e2e\/api\/.*\.spec\.ts/,
      use: { baseURL: `http://localhost:${backendPort}` },
      fullyParallel: false,
      retries: 0,
    },
  ],
});
