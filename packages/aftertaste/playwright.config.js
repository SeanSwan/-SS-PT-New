import { defineConfig } from '@playwright/test';

// reuseExistingServer: FALSE, deliberately.
// It was true, and on a machine that already had a dev server on the configured port Playwright
// happily reused it — the boot test asserted against the SwanStudios frontend instead of this game.
// A false GREEN was one lucky render away. Always start our own server; never inherit a stranger's.
// SWAN_PORT lets the suite run beside a live play session on 5299 (see vite.config.js).
const PORT = Number(process.env.SWAN_PORT ?? 5299);

export default defineConfig({
  /**
   * ONE RETRY, and what it does NOT excuse.
   *
   * This machine runs ~73 node processes steadily; a browser suite that asserts on transient scene
   * and store state (a corpse that ages off in a second, a model that mounts a frame late, a wave
   * arriving through a metered window) is timing-sensitive by nature, and every one of these tests
   * has already been hardened at its cause — clocks driven instead of raced, conditions waited on
   * instead of sampled, meshes awaited before being asserted about.
   *
   * What a retry buys: a run that fails only because the machine stalled is not reported as a
   * broken game. What it must never buy: silence. Playwright reports a retried test as FLAKY, so a
   * test that needs its retry is visible in every run — and a genuinely broken behaviour fails both
   * attempts and still fails the suite. A flaky count that grows is a signal to fix, not to raise.
   */
  retries: 1,
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
