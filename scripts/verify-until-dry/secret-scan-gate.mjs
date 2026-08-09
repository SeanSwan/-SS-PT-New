#!/usr/bin/env node
/**
 * @file secret-scan-gate.mjs
 * @description Cross-platform, fail-closed launcher for the full secret scanner.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const WINDOWS_BASH = [
  'C:/Program Files/Git/bin/bash.exe',
  'C:/Program Files/Git/usr/bin/bash.exe',
];

export function selectBashExecutable(platform = process.platform, exists = existsSync) {
  if (platform !== 'win32') return 'bash';
  return WINDOWS_BASH.find((candidate) => exists(candidate)) ?? null;
}

export function validateSecretScanResult(result) {
  if (result?.error) return { valid: false, error: `secret-scan-spawn:${result.error.code ?? 'error'}` };
  if (result?.status !== 0) return { valid: false, error: `secret-scan-exit:${result?.status ?? 'null'}` };
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (/\bfatal:/i.test(output)) return { valid: false, error: 'secret-scan-fatal-output' };
  const match = output.match(/Scanned:\s+(\d+) files/i);
  if (!match) return { valid: false, error: 'secret-scan-count-missing' };
  const scanned = Number(match[1]);
  if (!Number.isInteger(scanned) || scanned < 1) return { valid: false, error: 'secret-scan-zero-evidence' };
  if (!/Hits:\s+0\b/i.test(output) || !/\bCLEAN\./.test(output)) {
    return { valid: false, error: 'secret-scan-clean-proof-missing' };
  }
  return { valid: true, scanned };
}

export function main() {
  if (process.argv.slice(2).join(' ') !== '--all') {
    process.stderr.write('[verify-until-dry] secret scan wrapper requires exactly --all\n');
    process.exitCode = 2;
    return;
  }
  const bash = selectBashExecutable();
  if (!bash) {
    process.stderr.write('[verify-until-dry] Git Bash is unavailable; secret scan blocked\n');
    process.exitCode = 1;
    return;
  }
  const result = spawnSync(bash, ['scripts/scan-secrets.sh', '--all'], {
    cwd: process.cwd(), encoding: 'utf8', windowsHide: true,
    timeout: 570_000, maxBuffer: 32 * 1024 * 1024,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const proof = validateSecretScanResult(result);
  if (!proof.valid) {
    process.stderr.write(`[verify-until-dry] ${proof.error}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
