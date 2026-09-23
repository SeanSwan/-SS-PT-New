const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const local = createRequire(resolve(__dirname, '../../../../../frontend/package.json'));
module.exports = local('@playwright/test').defineConfig({ testDir: __dirname,
  testMatch: 'ui.spec.cjs', workers: 1, retries: 0, reporter: 'list',
  use: { browserName: 'chromium', headless: true, trace: 'retain-on-failure' } });
