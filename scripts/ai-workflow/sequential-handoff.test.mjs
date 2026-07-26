import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const KIMI_CLI = join(ROOT, 'scripts', 'consult-kimi-second-pass.mjs');

test('Kimi second pass refuses to run without a completed Opus artifact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'swan-kimi-no-opus-'));
  try {
    const packet = join(dir, 'packet.md');
    writeFileSync(packet, '# Anonymous architecture packet', 'utf8');
    const result = spawnSync(process.execPath, [
      KIMI_CLI, '--document', packet, '--cap-usd', '3',
    ], { cwd: ROOT, encoding: 'utf8' });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /requires --seed <completed Opus review>/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Kimi verifies the frozen Opus artifact against the current document hash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'swan-kimi-frozen-opus-'));
  try {
    const document = '# Anonymous architecture packet\nNo client data.';
    const packet = join(dir, 'packet.md');
    const opus = join(dir, 'opus.md');
    writeFileSync(packet, document, 'utf8');
    writeFileSync(opus, '# Claude Opus 5 - Review\n\n**Document SHA-256:** `wrong`', 'utf8');

    const rejected = spawnSync(process.execPath, [
      KIMI_CLI, '--document', packet, '--seed', opus, '--cap-usd', '3',
    ], { cwd: ROOT, encoding: 'utf8' });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /does not match the current document SHA-256/i);

    const hash = crypto.createHash('sha256').update(document).digest('hex');
    writeFileSync(opus, `# Claude Opus 5 - Review\n\n**Document SHA-256:** \`${hash}\`\n\nReview.`, 'utf8');
    const accepted = spawnSync(process.execPath, [
      KIMI_CLI, '--document', packet, '--seed', opus, '--cap-usd', '3',
    ], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.match(accepted.stdout, /status=preflight model_calls=0 model=moonshotai\/kimi-k3/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
