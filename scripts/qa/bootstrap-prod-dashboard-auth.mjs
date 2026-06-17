#!/usr/bin/env node
/**
 * SCRIPT: Bootstrap production dashboard auth states
 * PURPOSE: Use an existing admin storage state to create or refresh scoped QA
 * role personas, write Playwright storage states, and optionally run the
 * read-only production dashboard crawl.
 * SAFETY: Writes deterministic @swanstudios-qa.local users and never logs secrets.
 */

import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertStorageStateMatchesRole } from './prod-auth-state-role.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const authDir = path.join(repoRoot, '.auth');
const roleEnv = {
  admin: 'SWAN_PROD_ADMIN_AUTH_STATE',
  trainer: 'SWAN_PROD_TRAINER_AUTH_STATE',
  client: 'SWAN_PROD_CLIENT_AUTH_STATE',
  user: 'SWAN_PROD_USER_AUTH_STATE',
};
const validRoles = new Set(['trainer', 'client', 'user']);
const defaultRoles = ['trainer', 'client', 'user'];

function argValue(args, name) {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function normalizeBaseUrl(value) {
  return (value || 'https://sswanstudios.com').replace(/\/$/, '');
}

function resolveRepoPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

export function parseRoleList(raw = defaultRoles.join(',')) {
  const roles = [...new Set(raw.split(',').map((role) => role.trim().toLowerCase()).filter(Boolean))];
  const invalid = roles.filter((role) => !validRoles.has(role));
  if (invalid.length) {
    throw new Error(`invalid role(s): ${invalid.join(', ')}; use trainer, client, user`);
  }
  return roles.length ? roles : [...defaultRoles];
}

export function qaPersonaForRole(role, domain = 'swanstudios-qa.local') {
  const normalized = role.toLowerCase();
  if (!validRoles.has(normalized)) {
    throw new Error(`unsupported QA role: ${role}`);
  }
  return {
    role: normalized,
    firstName: 'Dashboard',
    lastName: `QA ${normalized[0].toUpperCase()}${normalized.slice(1)}`,
    email: `sswan.qa.dashboard.${normalized}@${domain}`,
    username: `sswan_qa_dashboard_${normalized}`,
    ...(normalized === 'trainer' ? {
      specialties: 'Production dashboard QA',
      certifications: 'Internal QA',
      bio: 'Scoped production QA trainer persona.',
      hourlyRate: 0,
    } : {}),
  };
}

export function createStorageState({ baseUrl, token, refreshToken, user, now = Date.now() }) {
  const origin = new URL(normalizeBaseUrl(baseUrl)).origin;
  return { cookies: [], origins: [{
      origin,
      localStorage: [
        { name: 'token', value: token },
        { name: 'refreshToken', value: refreshToken },
        { name: 'user', value: JSON.stringify(user) },
        { name: 'tokenTimestamp', value: String(now) },
      ],
    }] };
}

function getLocalStorageValue(state, keys, baseUrl) {
  const keySet = new Set(Array.isArray(keys) ? keys : [keys]);
  const expectedOrigin = new URL(normalizeBaseUrl(baseUrl)).origin;
  const origins = Array.isArray(state?.origins) ? state.origins : [];
  const preferred = origins.find((origin) => origin?.origin === expectedOrigin) || origins[0];
  const entries = Array.isArray(preferred?.localStorage) ? preferred.localStorage : [];
  return entries.find((entry) => keySet.has(entry?.name) && typeof entry.value === 'string')?.value || null;
}

function readStorageState(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function readAuthBundle(filePath, baseUrl) {
  const state = readStorageState(filePath);
  return {
    token: getLocalStorageValue(state, ['token', 'authToken', 'accessToken', 'jwt'], baseUrl),
    refreshToken: getLocalStorageValue(state, 'refreshToken', baseUrl),
    user: getLocalStorageValue(state, 'user', baseUrl),
  };
}

function defaultRoleStatePath(role) {
  return path.join(authDir, `sswan-prod-${role}.json`);
}

function outputPathForRole(role, reservedPath) {
  const configured = process.env[roleEnv[role]];
  const preferred = resolveRepoPath(configured || defaultRoleStatePath(role));
  if (reservedPath && path.resolve(preferred) === path.resolve(reservedPath)) {
    return path.join(authDir, `sswan-prod-${role}-dashboard.json`);
  }
  return preferred;
}

function candidateAdminPaths(adminStateArg) {
  return [...new Set([
    adminStateArg,
    process.env.SWAN_PROD_ADMIN_AUTH_STATE,
    process.env.SWAN_PROD_AUTH_STATE,
    process.env.SWAN_PROD_TRAINER_AUTH_STATE,
    process.env.SWAN_PROD_CLIENT_AUTH_STATE,
    process.env.SWAN_PROD_USER_AUTH_STATE,
    defaultRoleStatePath('admin'),
    defaultRoleStatePath('trainer'),
    defaultRoleStatePath('client'),
    defaultRoleStatePath('user'),
  ].filter(Boolean).map(resolveRepoPath))];
}

function findAdminStorageState(adminStateArg) {
  const tried = [];
  for (const candidate of candidateAdminPaths(adminStateArg)) {
    if (!existsSync(candidate)) continue;
    try {
      assertStorageStateMatchesRole({
        expectedRole: 'admin',
        authPath: candidate,
        envName: 'SWAN_PROD_ADMIN_AUTH_STATE',
      });
      return candidate;
    } catch (error) {
      tried.push(`${path.relative(repoRoot, candidate)} (${error.message})`);
    }
  }
  throw new Error(
    'no valid admin production auth state was found. Run npm run qa:prod-auth:capture:admin, or pass --admin-state=<path>.'
    + (tried.length ? ` Checked: ${tried.join('; ')}` : '')
  );
}

function randomPassword() {
  return `${crypto.randomBytes(18).toString('base64url')}!Aa1`;
}

async function apiRequest({ baseUrl, apiPath, token, method = 'GET', body }) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${apiPath}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText;
    throw new Error(`${method} ${apiPath} failed with ${response.status}: ${message}`);
  }
  return data;
}

async function listUsers(baseUrl, adminToken) {
  const data = await apiRequest({ baseUrl, apiPath: '/api/auth/users', token: adminToken });
  return Array.isArray(data?.users) ? data.users : [];
}

async function createOrRefreshPersona({ baseUrl, adminToken, persona, password }) {
  const users = await listUsers(baseUrl, adminToken);
  const existing = users.find((user) => String(user.email || '').toLowerCase() === persona.email);
  const payload = { ...persona, password };
  if (existing?.id) {
    await apiRequest({ baseUrl, apiPath: `/api/auth/user/${existing.id}`, token: adminToken, method: 'PUT', body: payload });
    return { action: 'refreshed', id: existing.id };
  }
  const created = await apiRequest({ baseUrl, apiPath: '/api/auth/user', token: adminToken, method: 'POST', body: payload });
  return { action: 'created', id: created?.user?.id || null };
}

async function loginPersona(baseUrl, persona, password) {
  let data = await apiRequest({
    baseUrl,
    apiPath: '/api/auth/login',
    method: 'POST',
    body: { username: persona.email, password },
  });
  if (data?.forcePasswordChange && data?.tempToken) {
    data = await apiRequest({
      baseUrl,
      apiPath: '/api/auth/force-change-password',
      method: 'POST',
      body: { tempToken: data.tempToken, newPassword: password },
    });
  }
  if (!data?.token || !data?.refreshToken || !data?.user) {
    throw new Error(`login for ${persona.role} did not return a complete auth payload`);
  }
  return data;
}

function writeRoleState({ role, baseUrl, authPayload, outputPath }) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const state = createStorageState({
    baseUrl,
    token: authPayload.token,
    refreshToken: authPayload.refreshToken,
    user: authPayload.user,
  });
  writeFileSync(outputPath, `${JSON.stringify(state, null, 2)}\n`);
  assertStorageStateMatchesRole({ expectedRole: role, authPath: outputPath, envName: roleEnv[role] });
}

function runDashboardCrawl(env, passthroughArgs) {
  const args = [
    path.join(__dirname, 'playwright-mission.mjs'),
    '--prod-live-readonly',
    '--require-prod-auth-roles=admin,trainer,client,user',
    '--grep=@dashboard-crawl',
    '--reporter=line',
    '--project=Desktop Chrome',
    ...passthroughArgs,
  ];
  return spawnSync(process.execPath, args, { cwd: repoRoot, env, stdio: 'inherit' }).status ?? 1;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const passthroughIndex = rawArgs.indexOf('--');
  const args = passthroughIndex >= 0 ? rawArgs.slice(0, passthroughIndex) : rawArgs;
  const passthroughArgs = passthroughIndex >= 0 ? rawArgs.slice(passthroughIndex + 1) : [];
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write('Usage: node scripts/qa/bootstrap-prod-dashboard-auth.mjs [--run-crawl] [--roles=trainer,client,user] [--admin-state=<path>] [--base-url=<url>]\n');
    return;
  }
  const baseUrl = normalizeBaseUrl(argValue(args, '--base-url'));
  const roles = parseRoleList(argValue(args, '--roles'));
  const runCrawl = args.includes('--run-crawl');
  const adminState = findAdminStorageState(argValue(args, '--admin-state'));
  const adminAuth = readAuthBundle(adminState, baseUrl);
  if (!adminAuth.token) throw new Error('admin storage state does not contain a readable access token');
  let adminToken = adminAuth.token;
  try {
    await listUsers(baseUrl, adminToken);
  } catch (error) {
    if (!/401|Token expired/i.test(error.message) || !adminAuth.refreshToken || !adminAuth.user) throw error;
    const refreshed = await apiRequest({
      baseUrl,
      apiPath: '/api/auth/refresh-token',
      method: 'POST',
      body: { refreshToken: adminAuth.refreshToken },
    });
    adminToken = refreshed.token;
    writeRoleState({
      role: 'admin',
      baseUrl,
      authPayload: { ...refreshed, user: JSON.parse(adminAuth.user) },
      outputPath: adminState,
    });
    process.stdout.write('Refreshed expired admin auth state.\n');
  }

  const env = { ...process.env, SWAN_PROD_ADMIN_AUTH_STATE: adminState };
  process.stdout.write(`Using admin state: ${path.relative(repoRoot, adminState)}\n`);
  for (const role of roles) {
    const persona = qaPersonaForRole(role);
    const password = randomPassword();
    const result = await createOrRefreshPersona({ baseUrl, adminToken, persona, password });
    const authPayload = await loginPersona(baseUrl, persona, password);
    const outputPath = outputPathForRole(role, adminState);
    writeRoleState({ role, baseUrl, authPayload, outputPath });
    env[roleEnv[role]] = outputPath;
    process.stdout.write(`${role}: ${result.action} QA persona and saved ${path.relative(repoRoot, outputPath)}\n`);
  }
  if (runCrawl) process.exit(runDashboardCrawl(env, passthroughArgs));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`Production dashboard auth bootstrap blocked: ${error.message}\n`);
    process.exit(1);
  });
}
