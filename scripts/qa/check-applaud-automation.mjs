#!/usr/bin/env node
/**
 * FILE: check-applaud-automation.mjs
 * PURPOSE: Secret-safe local health check for SwanStudios Applaud automation.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import net from 'node:net';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const strict = args.has('--strict');

const appData = process.env.APPDATA || '';
const localAppData = process.env.LOCALAPPDATA || '';
const userProfile = process.env.USERPROFILE || '';
let processProbeAvailable = false;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function runPowerShell(command) {
  try {
    const encoded = Buffer.from(command, 'utf16le').toString('base64');
    const output = execFileSync('powershell.exe', ['-NoProfile', '-EncodedCommand', encoded], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 4,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    processProbeAvailable = true;
    return output;
  } catch {
    return null;
  }
}

function decodeCsvValue(value) {
  return value
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/^"|"$/g, '');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      values.push(decodeCsvValue(current));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(decodeCsvValue(current));
  return values;
}

function getProcessesFromWmic() {
  try {
    const wmicPath = join(process.env.WINDIR || 'C:\\Windows', 'System32', 'wbem', 'WMIC.exe');
    const raw = execFileSync(wmicPath, [
      'process',
      'get',
      'ProcessId,Name,CommandLine',
      '/format:csv',
    ], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 4,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    processProbeAvailable = true;
    return raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^\uFEFF/, '').trim())
      .filter((line) => line && !line.startsWith('Node,'))
      .map((line) => {
        const [, CommandLine, Name, ProcessId] = parseCsvLine(line);
        return { CommandLine, Name, ProcessId: Number(ProcessId) || null };
      })
      .filter((proc) => /applaud|swan-applaud-sync|Start-Swan-Applaud/i.test(proc.CommandLine || ''));
  } catch {
    return null;
  }
}

function getProcesses() {
  const wmicRows = getProcessesFromWmic();
  if (wmicRows) return wmicRows;

  const script = [
    "$rows = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'applaud|swan-applaud-sync|Start-Swan-Applaud' } |",
    'Select-Object ProcessId,Name,CommandLine;',
    '$rows | ConvertTo-Json -Depth 4 -Compress',
  ].join(' ');
  const raw = runPowerShell(script);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.filter((proc) => /applaud|swan-applaud-sync|Start-Swan-Applaud/i.test(proc.CommandLine || ''));
  } catch {
    return [];
  }
}

async function isPortListening(port) {
  if (!port) return false;
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: Number(port), timeout: 700 });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function countAudioFiles(root) {
  const extensions = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm']);
  const result = { count: 0, totalBytes: 0, newestMtimeMs: null };
  function walk(dir) {
    let entries = [];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile()) {
        const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
        if (!extensions.has(ext)) continue;
        const info = statSync(path);
        result.count += 1;
        result.totalBytes += info.size;
        result.newestMtimeMs = Math.max(result.newestMtimeMs || 0, info.mtimeMs);
      }
    }
  }
  if (root && existsSync(root)) walk(root);
  return result;
}

function hasCommandLineMatch(processes, pattern) {
  const re = new RegExp(pattern, 'i');
  return processes.some((proc) => re.test(proc.CommandLine || ''));
}

const settingsPath = join(appData, 'applaud', 'settings.json');
const syncRoot = join(localAppData, 'SwanStudios', 'applaud-sync');
const automationRoot = join(localAppData, 'SwanStudios', 'applaud-automation');
const startupRoot = join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const startupCommandPath = join(startupRoot, 'Start-Swan-Applaud-Automation.cmd');
const legacyShortcutPath = join(startupRoot, 'Start-Swan-Applaud-Sync.lnk');
const syncConfigPath = join(syncRoot, 'config.json');
const syncTokenPath = join(syncRoot, 'swan-token.txt');
const syncRefreshPath = join(syncRoot, 'swan-refresh-token.txt');
const syncStatePath = join(syncRoot, 'state.json');
const automationLogPath = join(automationRoot, 'automation.log');
const launcherLogPath = join(syncRoot, 'launcher.log');

const applaudSettings = readJson(settingsPath);
const syncConfig = readJson(syncConfigPath);
const processes = getProcesses();
const bindPort = Number(applaudSettings?.bind?.port || 44471);
const recordingsDir = syncConfig?.watchDir
  || applaudSettings?.recordingsDir
  || join(userProfile, 'Documents', 'Plaud Recordings');
const audio = countAudioFiles(recordingsDir);

const report = {
  paths: {
    settingsPath,
    syncConfigPath,
    startupCommandPath,
    recordingsDir,
    automationLogPath,
    launcherLogPath,
  },
  checks: {
    applaudSettingsPresent: existsSync(settingsPath),
    applaudSetupComplete: Boolean(applaudSettings?.setupComplete),
    applaudTokenPresent: Boolean(applaudSettings?.token),
    applaudWebhookEnabled: Boolean(applaudSettings?.webhook?.enabled),
    applaudPort: bindPort,
    applaudPortListening: await isPortListening(bindPort),
    processProbeAvailable,
    applaudProcessSeen: processProbeAvailable
      ? hasCommandLineMatch(processes, 'quick-pt\\\\applaud|server\\\\dist\\\\index\\.js')
      : null,
    swanUploaderConfigPresent: existsSync(syncConfigPath),
    swanUploaderTokenPresent: existsSync(syncTokenPath),
    swanUploaderRefreshTokenPresent: existsSync(syncRefreshPath),
    swanUploaderStatePresent: existsSync(syncStatePath),
    swanUploaderProcessSeen: processProbeAvailable
      ? hasCommandLineMatch(processes, 'swan-applaud-sync\\.mjs')
      : null,
    startupCommandInstalled: existsSync(startupCommandPath),
    legacyPromptShortcutStillInstalled: existsSync(legacyShortcutPath),
    automationLogPresent: existsSync(automationLogPath),
    launcherLogPresent: existsSync(launcherLogPath),
  },
  recordings: {
    count: audio.count,
    totalMB: Number((audio.totalBytes / 1024 / 1024).toFixed(2)),
    newestLocalTime: audio.newestMtimeMs ? new Date(audio.newestMtimeMs).toLocaleString() : null,
  },
  processCount: processes.length,
  findings: [],
};

function finding(level, message) {
  report.findings.push({ level, message });
}

if (!report.checks.applaudSettingsPresent) finding('error', 'Applaud settings.json is missing.');
if (!report.checks.applaudSetupComplete) finding('error', 'Applaud setup is not complete.');
if (!report.checks.applaudTokenPresent) finding('error', 'Applaud Plaud-cloud token is missing.');
if (!report.checks.startupCommandInstalled) finding('error', 'Windows Startup command is not installed.');
if (report.checks.legacyPromptShortcutStillInstalled) finding('error', 'Old prompt-blocking Startup shortcut is still installed.');
if (!report.checks.swanUploaderConfigPresent) finding('error', 'Swan uploader config is missing.');
if (!report.checks.swanUploaderTokenPresent && !report.checks.swanUploaderRefreshTokenPresent) {
  finding('error', 'Swan uploader has no encrypted token or refresh token.');
}
if (!report.checks.applaudPortListening) finding('warn', `Applaud is not listening on port ${bindPort}.`);
if (report.checks.processProbeAvailable && !report.checks.swanUploaderProcessSeen) {
  finding('warn', 'Swan local uploader process is not running.');
}
if (!report.checks.processProbeAvailable) {
  finding('info', 'Process probe unavailable in this shell; use port/log checks or run from normal PowerShell.');
}
if (report.checks.applaudWebhookEnabled) {
  finding('warn', 'Applaud direct webhook is enabled; disable it if using Swan local uploader to avoid duplicates.');
}
if (report.recordings.count === 0) finding('warn', 'No audio files found in the watched recordings folder.');

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Swan Applaud Automation Health');
  console.log(`Recordings folder: ${report.paths.recordingsDir}`);
  console.log(`Audio files: ${report.recordings.count} (${report.recordings.totalMB} MB)`);
  for (const item of report.findings) {
    console.log(`${item.level.toUpperCase()}: ${item.message}`);
  }
  if (report.findings.length === 0) {
    console.log('OK: Applaud automation checks passed.');
  }
}

if (strict && report.findings.some((item) => item.level === 'error')) {
  process.exitCode = 1;
}
