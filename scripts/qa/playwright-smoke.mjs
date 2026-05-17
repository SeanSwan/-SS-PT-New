#!/usr/bin/env node
/**
 * CANONICAL QA SMOKE LAUNCHER
 * ===========================
 * Runs the current production-safe Playwright smoke set. These specs mock auth
 * and app APIs where appropriate, so smoke results are not coupled to old
 * seeded passwords or production account state.
 *
 * Usage:
 *   node scripts/qa/playwright-smoke.mjs
 *   node scripts/qa/playwright-smoke.mjs --prod
 *   node scripts/qa/playwright-smoke.mjs --base-url=https://sswanstudios.com
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');

const args = process.argv.slice(2);
const passthroughIndex = args.indexOf('--');
const ownArgs = passthroughIndex >= 0 ? args.slice(0, passthroughIndex) : args;
const passthroughArgs = passthroughIndex >= 0 ? args.slice(passthroughIndex + 1) : [];
const prod = ownArgs.includes('--prod');
const headed = ownArgs.includes('--headed');
const reporterArg = ownArgs.find(arg => arg.startsWith('--reporter='));
const projectArgs = ownArgs.filter(arg => arg.startsWith('--project='));
const baseUrlArg = ownArgs.find(arg => arg.startsWith('--base-url='));

const baseURL = baseUrlArg
  ? baseUrlArg.slice('--base-url='.length)
  : prod ? 'https://sswanstudios.com' : process.env.BASE_URL || 'http://localhost:5173';
const skipWebServer = prod || Boolean(baseUrlArg) || process.env.SWAN_PLAYWRIGHT_SKIP_WEBSERVER === '1';

const smokeSpecs = [
  'client-dashboard-oracle-smoke.spec.ts',
  'marketing-native-publishing-smoke.spec.ts',
];

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const playwrightArgs = [
  'playwright',
  'test',
  ...smokeSpecs,
  ...(projectArgs.length ? projectArgs : ['--project=Desktop Chrome', '--project=Mobile Chrome']),
  reporterArg || '--reporter=line',
  '--workers=2',
  ...(headed ? ['--headed'] : []),
  ...passthroughArgs,
];

process.stdout.write(`SwanStudios canonical smoke\n`);
process.stdout.write(`Base URL: ${baseURL}\n`);
process.stdout.write(`Web server: ${skipWebServer ? 'skipped' : 'managed by Playwright config'}\n`);
process.stdout.write(`Specs: ${smokeSpecs.join(', ')}\n\n`);

function shellQuote(arg) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

const spawnOptions = {
  cwd: frontendDir,
  env: {
    ...process.env,
    BASE_URL: baseURL,
    SWAN_SMOKE_TARGET: prod ? 'production' : baseUrlArg ? 'external' : 'local',
    ...(skipWebServer ? { SWAN_PLAYWRIGHT_SKIP_WEBSERVER: '1' } : {}),
  },
  stdio: 'inherit',
};

const result = process.platform === 'win32'
  ? spawnSync(['npx', ...playwrightArgs].map(shellQuote).join(' '), {
      ...spawnOptions,
      shell: true,
    })
  : spawnSync(npx, playwrightArgs, spawnOptions);

if (result.error) {
  process.stderr.write(`Failed to launch Playwright smoke: ${result.error.message}\n`);
}

process.exit(result.status ?? 1);
