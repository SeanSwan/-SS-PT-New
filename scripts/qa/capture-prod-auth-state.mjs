#!/usr/bin/env node
/**
 * SCRIPT: Capture SwanStudios production auth state
 * PURPOSE: Let Sean log in interactively, then save Playwright storage state for
 * read-only production Mission QA.
 * SAFETY: Accepts no login values, defaults to ignored `.auth/`, and refuses
 * output outside `.auth/` unless explicitly overridden.
 */

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');
const authDir = path.join(repoRoot, '.auth');
const args = process.argv.slice(2);

const validRoles = new Set(['admin', 'trainer', 'client', 'user']);
const roleEnv = {
  admin: 'SWAN_PROD_ADMIN_AUTH_STATE',
  trainer: 'SWAN_PROD_TRAINER_AUTH_STATE',
  client: 'SWAN_PROD_CLIENT_AUTH_STATE',
  user: 'SWAN_PROD_USER_AUTH_STATE',
};

function argValue(name) {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

const showHelp = args.includes('--help') || args.includes('-h');
const checkBrowserDriver = args.includes('--check-browser-driver');
const role = argValue('--role');
const baseUrl = argValue('--base-url') || 'https://sswanstudios.com';
const outputArg = argValue('--out');
const force = args.includes('--force');
const allowOutsideAuthDir = args.includes('--allow-outside-auth-dir');
const timeoutMs = Number(argValue('--timeout-ms') || '300000');

function printUsage() {
  process.stdout.write(`Usage: node scripts/qa/capture-prod-auth-state.mjs --role=admin|trainer|client|user [options]

Options:
  --out=<path>                  Output storage state path. Defaults to .auth/sswan-prod-<role>.json.
  --base-url=<url>              Production URL. Defaults to https://sswanstudios.com.
  --timeout-ms=<ms>             Time allowed for interactive login. Defaults to 300000.
  --force                       Overwrite an existing state file.
  --allow-outside-auth-dir      Permit output outside .auth/ after deliberate local approval.
  --check-browser-driver        Verify Playwright Chromium can be resolved without opening login.
  -h, --help                    Print this help without opening a browser.

Examples:
  npm run qa:prod-auth:capture:admin
  node scripts/qa/capture-prod-auth-state.mjs --role=admin
  $env:SWAN_PROD_ADMIN_AUTH_STATE=".auth/sswan-prod-admin.json"
  $env:SWAN_PROD_TRAINER_AUTH_STATE=".auth/sswan-prod-trainer.json"
  $env:SWAN_PROD_CLIENT_AUTH_STATE=".auth/sswan-prod-client.json"
  $env:SWAN_PROD_USER_AUTH_STATE=".auth/sswan-prod-user.json"
`);
}

function fail(message) {
  process.stderr.write(`Production auth capture blocked: ${message}\n`);
  process.exit(1);
}

function isInsideDirectory(parentDir, childPath) {
  const relative = path.relative(parentDir, childPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertInsideAuthDir(candidatePath) {
  const resolved = path.resolve(repoRoot, candidatePath);

  if (!allowOutsideAuthDir && !isInsideDirectory(authDir, resolved)) {
    fail('storage state output must stay inside .auth/ unless --allow-outside-auth-dir is supplied');
  }

  return resolved;
}

function loginUrl() {
  return `${baseUrl.replace(/\/$/, '')}/login`;
}

function defaultOutputPath() {
  return `.auth/sswan-prod-${role}.json`;
}

async function loadChromium() {
  const moduleUrl = pathToFileURL(path.join(frontendDir, 'node_modules', '@playwright', 'test', 'index.js')).href;
  let playwright;
  try {
    playwright = await import(moduleUrl);
  } catch {
    // A diagnostic that crashes with a raw module stack on the exact condition it
    // exists to diagnose is broken. Report the condition; exit clean.
    fail('Playwright driver not installed — run `npm ci` in frontend/ (expected frontend/node_modules/@playwright/test)');
  }
  const chromium = playwright.chromium || playwright.default?.chromium;
  if (!chromium?.launch) {
    fail('Playwright Chromium driver could not be resolved from frontend/node_modules');
  }
  return chromium;
}

if (showHelp) {
  printUsage();
  process.exit(0);
}

if (checkBrowserDriver) {
  await loadChromium();
  process.stdout.write('Chromium browser driver available.\n');
  process.exit(0);
}

if (!validRoles.has(role)) {
  fail('pass --role=admin, --role=trainer, --role=client, or --role=user');
}

if (!Number.isFinite(timeoutMs) || timeoutMs < 30_000) {
  fail('--timeout-ms must be at least 30000');
}

const outputPath = assertInsideAuthDir(outputArg || defaultOutputPath());

if (existsSync(outputPath) && !force) {
  fail(`storage state already exists at ${path.relative(repoRoot, outputPath)}; use --force to overwrite`);
}

mkdirSync(path.dirname(outputPath), { recursive: true });

process.stdout.write(`Opening ${loginUrl()}\n`);
process.stdout.write('Complete login in the opened browser window. The helper saves state after auth is detected.\n');

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(loginUrl(), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => {
      const tokenKeys = ['token', 'authToken', 'accessToken', 'jwt'];
      const hasLocalToken = tokenKeys.some((key) => Boolean(window.localStorage.getItem(key)));
      const hasSessionCookie = document.cookie
        .split(';')
        .some((cookie) => /token|auth|session/i.test(cookie));

      return hasLocalToken || hasSessionCookie;
    },
    undefined,
    { timeout: timeoutMs },
  );

  await context.storageState({ path: outputPath });
  process.stdout.write(`Saved ${role} auth state to ${path.relative(repoRoot, outputPath)}\n`);
  process.stdout.write(`Use ${roleEnv[role]}=${path.relative(repoRoot, outputPath)} for production live read-only QA.\n`);
} finally {
  await browser.close();
}
