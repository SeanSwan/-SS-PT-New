import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sanitize } from './sequential-review/reviewer.mjs';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CLI = join(ROOT, 'scripts', 'consult-opus.mjs');

test('sanitizer redacts a standalone phone without corrupting SHA-256 values', () => {
  const digest = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab';
  const sanitized = sanitize(`digest=${digest}\nphone=555-123-4567`);

  assert.match(sanitized, /phone=<REDACTED_PHONE>/);
  assert.match(sanitized, new RegExp(`digest=${digest}`));
});

test('Opus review defaults to a zero-call preflight', () => {
  const dir = mkdtempSync(join(tmpdir(), 'swan-opus-preflight-'));
  try {
    const packet = join(dir, 'packet.md');
    const output = join(dir, 'review.md');
    writeFileSync(packet, '# Anonymous architecture packet\nNo client data.', 'utf8');
    const result = spawnSync(process.execPath, [
      CLI, '--document', packet, '--out', output, '--cap-usd', '3',
    ], { cwd: ROOT, encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /status=preflight model_calls=0/);
    assert.match(result.stdout, /model=anthropic\/claude-opus-5/);
    assert.match(result.stdout, /worst_case_usd=\$\d+\.\d{4}/);
    assert.doesNotMatch(result.stdout, /worst_case_usd=\$NaN/);
    assert.match(result.stdout, /add --confirm-spend/);
    assert.throws(() => readFileSync(output, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PowerShell Opus wrapper reaches the zero-call preflight', {
  skip: process.platform !== 'win32',
}, () => {
  const dir = mkdtempSync(join(tmpdir(), 'swan-opus-wrapper-'));
  try {
    const packet = join(dir, 'packet.md');
    const output = join(dir, 'review.md');
    const wrapper = join(ROOT, 'scripts', 'ai-workflow', 'run-opus-review.ps1');
    writeFileSync(packet, '# Anonymous architecture packet\nNo client data.', 'utf8');
    const result = spawnSync('powershell.exe', [
      '-NoProfile', '-File', wrapper,
      '-Document', packet,
      '-Out', output,
      '-CapUsd', '3',
    ], { cwd: ROOT, encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /status=preflight model_calls=0/);
    assert.match(result.stdout, /worst_case_usd=\$\d+\.\d{4}/);
    assert.throws(() => readFileSync(output, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('Opus review rejects secret-bearing input paths before preflight', () => {
  const dir = mkdtempSync(join(tmpdir(), 'swan-opus-blocked-'));
  try {
    const packet = join(dir, '.env');
    writeFileSync(packet, 'SECRET=value', 'utf8');
    const result = spawnSync(process.execPath, [
      CLI, '--document', packet, '--cap-usd', '3',
    ], { cwd: ROOT, encoding: 'utf8' });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /blocked by outbound-context policy/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
