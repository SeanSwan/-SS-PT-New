import { defineConfig } from '@playwright/test';

// reuseExistingServer: FALSE, deliberately.
// It was true, and on a machine that already had a dev server on the configured port Playwright
// happily reused it — the boot test asserted against the SwanStudios frontend instead of this game.
// A false GREEN was one lucky render away. Always start our own server; never inherit a stranger's.
// SWAN_PORT lets the suite run beside a live play session on 5299 (see vite.config.js).
const PORT = Number(process.env.SWAN_PORT ?? 5299);

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    command: 'npm run dev',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
