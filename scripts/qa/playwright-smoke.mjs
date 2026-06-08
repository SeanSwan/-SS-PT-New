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
 *   node scripts/qa/playwright-smoke.mjs --prod --workers=2
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseFrontendPort } from './local-frontend-server.mjs';

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
const workersArg = ownArgs.find(arg => arg.startsWith('--workers='));

const localFrontendPort = !prod && !baseUrlArg && !process.env.BASE_URL
  ? await chooseFrontendPort(Number(process.env.SWAN_PLAYWRIGHT_FRONTEND_PORT || '5173'))
  : null;

const baseURL = baseUrlArg
  ? baseUrlArg.slice('--base-url='.length)
  : prod ? 'https://sswanstudios.com' : process.env.BASE_URL || `http://127.0.0.1:${localFrontendPort}`;
const skipWebServer = prod || Boolean(baseUrlArg) || Boolean(process.env.BASE_URL) || process.env.SWAN_PLAYWRIGHT_SKIP_WEBSERVER === '1';
const selectedWorkersArg = workersArg || (prod || baseUrlArg || process.env.BASE_URL ? '--workers=1' : '--workers=2');

const smokeSpecs = [
  'admin-compliance-truth-smoke.spec.ts',
  'admin-workout-surfaces-protected-smoke.spec.ts',
  'client-dashboard-oracle-smoke.spec.ts',
  'gamification-hub-smoke.spec.ts',
  'marketing-native-publishing-smoke.spec.ts',
  'nutrition-workspace-smoke.spec.ts',
  'plaud-playback-smoke.spec.ts',
  'session-allocation-live-smoke.spec.ts',
  'social-challenges-truth-smoke.spec.ts',
  'social-notifications-smoke.spec.ts',
  'storefront-truth-smoke.spec.ts',
  'trainer-my-clients-truth-smoke.spec.ts',
  'trainer-permissions-truth-smoke.spec.ts',
  'workout-logger-error-truth-smoke.spec.ts',
];

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const playwrightArgs = [
  'playwright',
  'test',
  ...smokeSpecs,
  ...(projectArgs.length ? projectArgs : ['--project=Desktop Chrome', '--project=Mobile Chrome']),
  reporterArg || '--reporter=line',
  selectedWorkersArg,
  ...(headed ? ['--headed'] : []),
  ...passthroughArgs,
];

process.stdout.write(`SwanStudios canonical smoke\n`);
process.stdout.write(`Base URL: ${baseURL}\n`);
process.stdout.write(`Workers: ${selectedWorkersArg.slice('--workers='.length)}\n`);
if (localFrontendPort) {
  process.stdout.write(`Frontend port: ${localFrontendPort}\n`);
}
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
    ...(localFrontendPort ? { SWAN_PLAYWRIGHT_FRONTEND_PORT: String(localFrontendPort) } : {}),
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
