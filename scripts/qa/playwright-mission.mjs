#!/usr/bin/env node
/**
 * SCRIPT: SwanStudios Mission QA launcher
 * PURPOSE: Run mission-level Playwright workflows without mixing them into the
 * canonical smoke launcher.
 * MODES: contract/read-only by default, production bundle read-only,
 * production live read-only, and guarded staging write mode.
 * SAFETY: Never enables writes without explicit flags because local dev can
 * point at the production DATABASE_URL in this repo.
 *
 * Mission QA tests the product's intended workflows, while keeping writes opt-in
 * and guarded. This runner intentionally starts only the Vite frontend in
 * contract mode; API calls are intercepted by the specs.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  chooseFrontendPort,
  cleanupFrontendProcess,
  waitForOwnedFrontendPort,
} from './local-frontend-server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');
const missionDirLabel = 'frontend/e2e/mission';

const args = process.argv.slice(2);
const passthroughIndex = args.indexOf('--');
const ownArgs = passthroughIndex >= 0 ? args.slice(0, passthroughIndex) : args;
const passthroughArgs = passthroughIndex >= 0 ? args.slice(passthroughIndex + 1) : [];

const prodReadOnly = ownArgs.includes('--prod-readonly');
const prodLiveReadOnly = ownArgs.includes('--prod-live-readonly');
const writeMode = ownArgs.includes('--staging-write') || ownArgs.includes('--write');
const allowProdWrite = ownArgs.includes('--allow-prod-write');
const headed = ownArgs.includes('--headed');
const showHelp = ownArgs.includes('--help') || ownArgs.includes('-h');
const reporterArg = ownArgs.find((arg) => arg.startsWith('--reporter='));
const projectArgs = ownArgs.filter((arg) => arg.startsWith('--project='));
const baseUrlArg = ownArgs.find((arg) => arg.startsWith('--base-url='));
const grepArg = ownArgs.find((arg) => arg.startsWith('--grep='));
const grepInvertArg = ownArgs.find((arg) => arg.startsWith('--grep-invert='));
const requireProdAuthRolesArg = ownArgs.find((arg) => arg.startsWith('--require-prod-auth-roles='));

const mode = writeMode
  ? 'staging-write'
  : prodLiveReadOnly
    ? 'prod-live-readonly'
    : prodReadOnly
      ? 'prod-readonly'
      : 'contract';
const allowWrites = writeMode ? '1' : '0';
const liveApi = prodLiveReadOnly ? '1' : '0';

function looksProductionUrl(value) {
  return /sswanstudios\.com|onrender\.com/i.test(value || '');
}

function looksProductionDb(value) {
  return /render\.com|amazonaws\.com|supabase\.co|neon\.tech/i.test(value || '');
}

function fail(message) {
  process.stderr.write(`Mission QA blocked: ${message}\n`);
  process.exit(1);
}

function normalizeAuthStatePath(value) {
  if (!value) return undefined;
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

function normalizedAuthStateEnv() {
  return {
    ...(process.env.SWAN_PROD_AUTH_STATE
      ? { SWAN_PROD_AUTH_STATE: normalizeAuthStatePath(process.env.SWAN_PROD_AUTH_STATE) }
      : {}),
    ...(process.env.SWAN_PROD_ADMIN_AUTH_STATE
      ? { SWAN_PROD_ADMIN_AUTH_STATE: normalizeAuthStatePath(process.env.SWAN_PROD_ADMIN_AUTH_STATE) }
      : {}),
    ...(process.env.SWAN_PROD_TRAINER_AUTH_STATE
      ? { SWAN_PROD_TRAINER_AUTH_STATE: normalizeAuthStatePath(process.env.SWAN_PROD_TRAINER_AUTH_STATE) }
      : {}),
    ...(process.env.SWAN_PROD_CLIENT_AUTH_STATE
      ? { SWAN_PROD_CLIENT_AUTH_STATE: normalizeAuthStatePath(process.env.SWAN_PROD_CLIENT_AUTH_STATE) }
      : {}),
  };
}

const prodAuthRoleEnv = {
  admin: ['SWAN_PROD_ADMIN_AUTH_STATE'],
  trainer: ['SWAN_PROD_TRAINER_AUTH_STATE'],
  client: ['SWAN_PROD_CLIENT_AUTH_STATE', 'SWAN_PROD_AUTH_STATE'],
};

function parseRequiredProdAuthRoles() {
  const raw = requireProdAuthRolesArg
    ? requireProdAuthRolesArg.slice('--require-prod-auth-roles='.length)
    : process.env.SWAN_MISSION_QA_REQUIRE_AUTH_ROLES;

  if (!raw) return [];

  return [...new Set(raw
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean))];
}

function assertRequiredProdAuthStates(requiredRoles) {
  if (requiredRoles.length === 0) return;
  if (!prodLiveReadOnly) {
    fail('--require-prod-auth-roles is only valid with --prod-live-readonly');
  }

  requiredRoles.forEach((role) => {
    const envNames = prodAuthRoleEnv[role];
    if (!envNames) {
      fail(`unknown required production auth role "${role}"; use admin, trainer, client`);
    }

    const configuredEnv = envNames
      .map((name) => [name, process.env[name]])
      .find(([, value]) => Boolean(value));

    if (!configuredEnv) {
      fail(`missing required production auth state for ${role}; set ${envNames.join(' or ')}`);
    }

    const [envName, authPath] = configuredEnv;
    const resolvedPath = normalizeAuthStatePath(authPath);
    if (!existsSync(resolvedPath)) {
      fail(`required production auth state for ${role} does not exist at ${resolvedPath} (${envName})`);
    }
  });
}

function printUsage() {
  process.stdout.write(`Usage: node scripts/qa/playwright-mission.mjs [mode] [options] [-- playwright-options]

Modes:
  --prod-readonly       Run mission specs against https://sswanstudios.com with writes blocked.
  --prod-live-readonly  Run live-production GET checks against sswanstudios.com with writes blocked.
  --staging-write       Enable @write mission specs against an explicit staging base URL.
  --write               Alias for --staging-write.

Options:
  --base-url=<url>      Target URL. Required for write mode unless BASE_URL is set.
  --allow-prod-write    Permit write mode against a production-looking URL after explicit approval.
  --project=<name>      Forward a Playwright project selection.
  --grep=<pattern>      Override the default mission tag filter.
  --require-prod-auth-roles=<roles>
                        For --prod-live-readonly, fail unless role storage states exist.
                        Example: admin,trainer,client.
  --reporter=<name>     Forward a Playwright reporter.
  --headed              Run headed browser sessions.
  -h, --help            Print this help without starting Vite or Playwright.

Environment:
  SWAN_MISSION_QA_CONFIRM_PROD_DB_WRITES=true  Required if write mode sees a production-looking DATABASE_URL.
  SWAN_PLAYWRIGHT_FRONTEND_PORT=<port>          First local Vite port to try in contract mode.
  SWAN_PROD_AUTH_STATE=<path>                   Optional Playwright storage state for live authenticated prod checks.
  SWAN_MISSION_QA_REQUIRE_AUTH_ROLES=<roles>     Env alternative to --require-prod-auth-roles.
`);
}

if (showHelp) {
  printUsage();
  process.exit(0);
}

if ((prodReadOnly || prodLiveReadOnly) && writeMode) {
  fail('choose a read-only mode or --staging-write, not both');
}

if (prodReadOnly && prodLiveReadOnly) {
  fail('choose either --prod-readonly or --prod-live-readonly, not both');
}

const requiredProdAuthRoles = parseRequiredProdAuthRoles();
assertRequiredProdAuthStates(requiredProdAuthRoles);

if (writeMode && !baseUrlArg && !process.env.BASE_URL) {
  fail('write mode requires --base-url or BASE_URL so local-prod DB is not targeted by accident');
}

const localFrontendPort = !prodReadOnly && !prodLiveReadOnly && !writeMode && !baseUrlArg && !process.env.BASE_URL
  ? await chooseFrontendPort(Number(process.env.SWAN_PLAYWRIGHT_FRONTEND_PORT || '5173'))
  : null;

const baseURL = baseUrlArg
  ? baseUrlArg.slice('--base-url='.length)
  : prodReadOnly || prodLiveReadOnly
    ? 'https://sswanstudios.com'
    : process.env.BASE_URL || `http://127.0.0.1:${localFrontendPort || 5173}`;

if (writeMode && looksProductionUrl(baseURL) && !allowProdWrite) {
  fail('write mode points at production; add --allow-prod-write only after Sean explicitly approves');
}

if (
  writeMode &&
  looksProductionDb(process.env.DATABASE_URL) &&
  process.env.SWAN_MISSION_QA_CONFIRM_PROD_DB_WRITES !== 'true'
) {
  fail('DATABASE_URL looks production; set SWAN_MISSION_QA_CONFIRM_PROD_DB_WRITES=true only after approval');
}

const skipWebServer = true;

const grep = grepArg
  ? grepArg
  : prodLiveReadOnly
    ? '--grep=@prod-live-readonly'
    : writeMode
      ? '--grep=@write'
      : '--grep=@contract|@readonly';
const grepInvert = grepInvertArg
  ? [grepInvertArg]
  : !prodLiveReadOnly && !writeMode
    ? ['--grep-invert=@prod-live-readonly']
    : [];

const playwrightCli = path.join(frontendDir, 'node_modules', '@playwright', 'test', 'cli.js');
const viteCli = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
const playwrightArgs = [
  'test',
  'e2e/mission',
  ...(projectArgs.length ? projectArgs : ['--project=Desktop Chrome', '--project=Mobile Chrome']),
  reporterArg || '--reporter=line',
  grep,
  ...grepInvert,
  '--workers=1',
  ...(writeMode ? ['--retries=0'] : []),
  ...(headed ? ['--headed'] : []),
  ...passthroughArgs,
];

process.stdout.write('SwanStudios Mission QA\n');
process.stdout.write(`Mode: ${mode}\n`);
process.stdout.write(`Mission dir: ${missionDirLabel}\n`);
process.stdout.write(`Base URL: ${baseURL}\n`);
process.stdout.write(`Writes: ${allowWrites === '1' ? 'enabled' : 'blocked'}\n`);
process.stdout.write(`Live API: ${liveApi === '1' ? 'enabled' : 'contract/mocked where specs define it'}\n`);
if (requiredProdAuthRoles.length > 0) {
  process.stdout.write(`Required prod auth roles: ${requiredProdAuthRoles.join(', ')}\n`);
}
process.stdout.write(`Web server: ${skipWebServer ? 'skipped' : 'managed by Playwright config'}\n\n`);

const playwrightSpawnOptions = {
  cwd: frontendDir,
  env: {
    ...process.env,
    BASE_URL: baseURL,
    SWAN_MISSION_QA_MODE: mode,
    SWAN_MISSION_QA_ALLOW_WRITES: allowWrites,
    SWAN_MISSION_QA_LIVE_API: liveApi,
    ...normalizedAuthStateEnv(),
    ...(localFrontendPort ? { SWAN_PLAYWRIGHT_FRONTEND_PORT: String(localFrontendPort) } : {}),
    ...(skipWebServer ? { SWAN_PLAYWRIGHT_SKIP_WEBSERVER: '1' } : {}),
  },
  encoding: 'utf8',
};

let frontendProcess = null;
let exitCode = 1;
try {
  if (localFrontendPort) {
    frontendProcess = spawn(
      process.execPath,
      [viteCli, '--host', '0.0.0.0', '--port', String(localFrontendPort), '--strictPort'],
      { cwd: frontendDir, stdio: 'inherit' },
    );
    await waitForOwnedFrontendPort(localFrontendPort, frontendProcess);
  }

  const result = spawnSync(process.execPath, [playwrightCli, ...playwrightArgs], playwrightSpawnOptions);

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.error) {
    process.stderr.write(`Failed to launch Mission QA: ${result.error.message}\n`);
  }

  exitCode = result.status ?? 1;
} finally {
  cleanupFrontendProcess(frontendProcess);
}

process.exit(exitCode);
