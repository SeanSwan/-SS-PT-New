#!/usr/bin/env node
/**
 * FILE: check-plaud-official-sync.mjs
 * PURPOSE: Presence-only health check for the official PLAUD sync launcher.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const checkOnly = process.argv.includes('--check-only');
const skipPlaudCli = process.argv.includes('--skip-plaud-cli');

function localRoot() {
  return process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'SwanStudios', 'plaud-official-sync')
    : join(homedir(), '.swanstudios', 'plaud-official-sync');
}

function redact(value) {
  return String(value || '')
    .replace(/(https?:\/\/[^\s?"']+)\?[^\s"']+/gi, '$1?[redacted]')
    .replace(/(https?:\/\/)[^/\s?#"']+@/gi, '$1[redacted]@')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\b(token|access_token|accessToken|refresh_token|refreshToken|secret|password)=([^\s&]+)/gi, '$1=[redacted]')
    .replace(/("?\b(?:token|access_token|accessToken|refresh_token|refreshToken|secret|password)\b"?\s*[:=]\s*"?)[^",\s}]+/gi, '$1[redacted]')
    .replace(/\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[redacted-token]');
}

async function run(command, args, options = {}) {
  const usesWindowsShellCommand = process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command);
  try {
    const result = await execFileAsync(command, args, {
      cwd: repoRoot,
      windowsHide: true,
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024,
      shell: usesWindowsShellCommand,
    });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (err) {
    return { ok: false, code: err.code || null, stdout: err.stdout || '', stderr: err.stderr || err.message || '' };
  }
}

async function checkNodeSyntax(path) {
  const result = await run(process.execPath, ['--check', path]);
  return result.ok ? { ok: true } : { ok: false, error: redact(result.stderr || result.stdout) };
}

async function checkPlaudCliAuth() {
  if (skipPlaudCli) {
    return { status: 'not_checked', message: 'Skipped by --skip-plaud-cli; run without this flag to verify Plaud login.' };
  }
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = await run(command, ['--yes', '@plaud-ai/cli', 'me'], { timeout: 45000 });
  if (result.ok) return { status: 'ok' };
  if (checkOnly && ['EPERM', 'EINVAL'].includes(result.code)) {
    return { status: 'not_checked', message: 'Runtime blocked child process; rerun this health check from normal PowerShell.' };
  }
  const output = redact(`${result.stdout}\n${result.stderr}`.trim());
  const missing = /AUTH_FAILED|token invalid|run plaud login|not authenticated/i.test(output);
  return {
    status: missing ? 'missing' : 'error',
    message: missing ? 'Run `npx --yes @plaud-ai/cli login` once.' : output,
  };
}

function presence() {
  const root = localRoot();
  const startup = process.env.APPDATA
    ? join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'Start-Swan-Plaud-Official-Sync.cmd')
    : null;
  return {
    localRoot: existsSync(root),
    config: existsSync(join(root, 'config.json')),
    state: existsSync(join(root, 'state.json')),
    swanToken: existsSync(join(root, 'swan-token.txt')),
    legacySwanToken: process.env.LOCALAPPDATA
      ? existsSync(join(process.env.LOCALAPPDATA, 'SwanStudios', 'applaud-sync', 'swan-token.txt'))
      : false,
    startup: startup ? existsSync(startup) : false,
    qaAuthState: existsSync(join(repoRoot, '.auth', 'sswan-prod-admin.json')),
  };
}

const files = {
  agent: join(repoRoot, 'scripts', 'plaud-official-sync', 'swan-plaud-official-sync.mjs'),
  qa: join(repoRoot, 'scripts', 'qa', 'check-plaud-official-sync.mjs'),
  launcher: join(repoRoot, 'scripts', 'launchers', 'Start-Swan-Plaud-Official-Sync.ps1'),
  installer: join(repoRoot, 'scripts', 'launchers', 'Install-Swan-Plaud-Official-Autostart.ps1'),
};

const report = {
  files: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, existsSync(value)])),
  syntax: {
    agent: await checkNodeSyntax(files.agent),
    qa: await checkNodeSyntax(files.qa),
  },
  plaudCli: await checkPlaudCliAuth(),
  presence: presence(),
};

const sandboxSpawnBlocked = checkOnly
  && !report.syntax.agent.ok
  && !report.syntax.qa.ok
  && /spawn E(PERM|INVAL)/.test(`${report.syntax.agent.error} ${report.syntax.qa.error}`);
if (sandboxSpawnBlocked) {
  report.syntax.agent = { ok: true, skipped: true, message: 'Runtime blocked child process; direct node --check still recommended.' };
  report.syntax.qa = { ok: true, skipped: true, message: 'Runtime blocked child process; direct node --check still recommended.' };
}

const hasHardFailure = Object.values(report.files).includes(false)
  || !report.syntax.agent.ok
  || !report.syntax.qa.ok
  || report.plaudCli.status === 'error';
const missingOperatorAuth = ['missing', 'not_checked'].includes(report.plaudCli.status)
  || (!report.presence.swanToken && !report.presence.legacySwanToken && !report.presence.qaAuthState);

console.log(JSON.stringify(report, null, 2));
if (hasHardFailure || (!checkOnly && missingOperatorAuth)) process.exitCode = 1;
