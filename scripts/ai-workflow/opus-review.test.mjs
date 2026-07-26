import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CLI = join(ROOT, 'scripts', 'consult-opus.mjs');

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
    assert.match(result.stdout, /add --confirm-spend/);
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
