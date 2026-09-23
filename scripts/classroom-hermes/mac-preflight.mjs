/**
 * Read-only, secret-minimizing Mac fact collector.
 *
 * Raw command output is parsed in memory and never printed. The emitted JSON
 * contains hardware/security booleans and versions only, with policy facts
 * intentionally unresolved for a human to answer.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

function firstMatch(text, pattern) {
  return String(text || '').match(pattern)?.[1]?.trim() || null;
}

export function parseSystemChip(text) {
  return firstMatch(text, /^\s*Chip:\s*(.+)$/imu)
    || firstMatch(text, /^\s*Processor Name:\s*(.+)$/imu)
    || 'unknown';
}

export function parseMemoryBytes(text) {
  const match = String(text || '').match(/^\s*Memory:\s*([\d.]+)\s*(TB|GB|MB)$/imu);
  if (!match) return 0;
  const units = { MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return Math.round(Number(match[1]) * units[match[2].toUpperCase()]);
}

export function parseMacVersion(text) {
  return firstMatch(text, /^\s*ProductVersion:\s*([\d.]+)$/imu) || 'unknown';
}

export function parseDiskBytes(text) {
  const bytes = firstMatch(text, /\(([\d,]+)\s+Bytes\)/iu);
  if (bytes) return Number(bytes.replaceAll(',', ''));
  const match = String(text || '').match(/(?:Free Space|Available Space):\s*([\d.]+)\s*(TB|GB|MB)/iu);
  if (!match) return 0;
  const units = { MB: 1000 ** 2, GB: 1000 ** 3, TB: 1000 ** 4 };
  return Math.round(Number(match[1]) * units[match[2].toUpperCase()]);
}

function safeVersion(text, commandName) {
  const line = String(text || '').split(/\r?\n/u).find(Boolean) || '';
  const match = line.match(/\b(v?\d+(?:\.\d+){1,3}(?:[-+][\w.-]+)?)/iu);
  return match ? `${commandName} ${match[1].replace(/^v/u, '')}` : null;
}

function h0Digest(text) {
  const line = String(text || '').split(/\r?\n/u)
    .find((candidate) => /^classroom(?::\S+)?\s+/iu.test(candidate.trim()));
  if (!line) return null;
  const fields = line.trim().split(/\s+/u);
  return fields[1] && /^[a-f0-9]{6,64}$/iu.test(fields[1]) ? fields[1] : 'present-digest-unparsed';
}

export function buildSafeMacReport(raw) {
  const chip = parseSystemChip(raw.hardware);
  const h0ModelDigest = h0Digest(raw.h0Show);
  return {
    schemaVersion: '1.0',
    platform: 'darwin',
    architecture: /^Apple\s+/iu.test(chip) ? 'arm64' : 'x64',
    chip,
    memoryBytes: parseMemoryBytes(raw.hardware),
    freeDiskBytes: parseDiskBytes(raw.disk),
    macOSVersion: parseMacVersion(raw.version),
    fileVaultEnabled: /FileVault is On/iu.test(String(raw.fileVault || '')),
    isStandardAccount: /NOT a member of admin/iu.test(String(raw.admin || '')),
    mdmEnrollment: /MDM enrollment:\s*Yes|Enrolled via DEP:\s*Yes/iu.test(String(raw.mdm || ''))
      ? 'enrolled'
      : /MDM enrollment:\s*No|Enrolled via DEP:\s*No/iu.test(String(raw.mdm || ''))
        ? 'not-enrolled'
        : 'unknown',
    ownership: 'unresolved',
    hermesInstalled: Boolean(raw.hermesVersion),
    hermesVersion: safeVersion(raw.hermesVersion, 'hermes'),
    ollamaInstalled: Boolean(raw.ollamaVersion),
    ollamaVersion: safeVersion(raw.ollamaVersion, 'ollama'),
    h0Installed: Boolean(h0ModelDigest),
    h0ModelDigest,
    h0Adoption: 'unknown',
    directorPolicy: 'unresolved',
  };
}

function run(command, args = []) {
  const response = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    timeout: 20_000,
    windowsHide: true,
  });
  if (response.error || response.status !== 0) return '';
  return String(response.stdout || response.stderr || '');
}

export function collectMacFacts() {
  if (process.platform !== 'darwin') {
    throw new Error('mac-preflight must run on the target Mac; no platform facts were guessed');
  }
  const currentUser = process.env.USER || '';
  return buildSafeMacReport({
    hardware: run('system_profiler', ['SPHardwareDataType']),
    version: run('sw_vers'),
    disk: run('diskutil', ['info', '/']),
    fileVault: run('fdesetup', ['status']),
    admin: currentUser ? run('dseditgroup', ['-o', 'checkmember', '-m', currentUser, 'admin']) : '',
    mdm: run('profiles', ['status', '-type', 'enrollment']),
    hermesVersion: run('hermes', ['--version']),
    ollamaVersion: run('ollama', ['--version']),
    h0Show: run('ollama', ['list']),
  });
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    process.stdout.write(`${JSON.stringify(collectMacFacts(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`BLOCKED: ${error.message}\n`);
    process.exitCode = 2;
  }
}

