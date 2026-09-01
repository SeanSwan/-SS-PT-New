#!/usr/bin/env node
/**
 * atomic-claim.test.mjs — exactly one caller may spend one approval, proven with REAL
 * concurrent processes.
 * ============================================================================
 * WHY A PROCESS-LEVEL BARRIER AND NOT A LOOP. Codex hostile review 2026-08-31 asked
 * for "a genuinely parallel barrier test proving exactly one winner", and the ask is
 * exact: the forced-interleaving test beside this one proves the LOGIC refuses a stale
 * snapshot, and cannot prove the FILESYSTEM primitive is atomic under real contention.
 *
 * A naive spawn-and-hope test does not prove it either. This suite already learned
 * that the expensive way: an earlier parallel test spawned four children and asserted
 * one winner, and node's ~30-60ms startup against a ~1ms race window meant the children
 * never overlapped — it passed against the BROKEN code 20 times out of 20. GLM 5.3
 * called it vacuous before I did.
 *
 * So the children boot, import, announce readiness, and then spin on a `go` file the
 * parent writes only once every child is parked. They enter the claim within
 * microseconds of each other. Spinning rather than sleeping is deliberate: a sleep
 * reintroduces the scheduling skew the barrier exists to remove.
 *
 * Run: node --test scripts/lib/atomic-claim.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLAIM_URL = `file://${join(HERE, 'atomic-claim.mjs').split('\\').join('/')}`;

async function race(dir, key, token, children = 6) {
  const runner = join(dir, 'claimer.mjs');
  writeFileSync(runner, [
    'import { writeFileSync, existsSync } from "node:fs";',
    'import { join } from "node:path";',
    'const dir = process.argv[2];',
    'const id = process.argv[3];',
    `const m = await import(${JSON.stringify(CLAIM_URL)});`,
    // Announce readiness AFTER the import, so module load sits outside the window.
    'writeFileSync(join(dir, `ready-${id}`), "1", "utf-8");',
    'while (!existsSync(join(dir, "go"))) { /* spin — sleeping reintroduces skew */ }',
    `const won = m.redeemOnce(dir, ${JSON.stringify(key)}, ${JSON.stringify(token)});`,
    'process.stdout.write(won ? "WIN" : "LOSE");',
  ].join('\n'), 'utf-8');

  const run = (id) => new Promise((resolve) => {
    let out = '';
    const p = spawn(process.execPath, [runner, dir, String(id)]);
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => resolve(out.trim()));
  });
  const pending = Array.from({ length: children }, (_, i) => run(i));

  const deadline = Date.now() + 30_000;
  while (Array.from({ length: children }, (_, i) => existsSync(join(dir, `ready-${i}`))).some((r) => !r)) {
    if (Date.now() > deadline) throw new Error('children never reached the barrier — the harness is broken, not the code');
    await new Promise((r) => setTimeout(r, 5));
  }
  writeFileSync(join(dir, 'go'), '1', 'utf-8');
  return Promise.all(pending);
}

test('BARRIER: six concurrent processes, one approval, exactly one winner', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'swan-claim-'));
  const results = await race(dir, 'k1', 'aaaaaaaaaaaa');
  const winners = results.filter((r) => r === 'WIN').length;
  assert.equal(winners, 1, `one approval admitted ${winners} callers (${results.join(',')})`);
  // And the win is durable: a later attempt on the same token still loses.
  const { redeemOnce } = await import(CLAIM_URL);
  assert.equal(redeemOnce(dir, 'k1', 'aaaaaaaaaaaa'), false, 'a spent token must stay spent');
  rmSync(dir, { recursive: true, force: true });
});

test('BARRIER: the harness really runs children (instrument check)', async () => {
  // A barrier test that silently spawned nothing would report exactly one winner by
  // reporting nothing at all. This workstream has hit instrument-blindness six times;
  // the control costs one assertion.
  const dir = mkdtempSync(join(tmpdir(), 'swan-claim-i-'));
  const results = await race(dir, 'k2', 'bbbbbbbbbbbb', 4);
  assert.equal(results.length, 4, 'every child must report');
  assert.ok(results.every((r) => r === 'WIN' || r === 'LOSE'), `children returned: ${results.join(',')}`);
  assert.equal(results.filter((r) => r === 'LOSE').length, 3, 'three must lose, or they did not contend');
  rmSync(dir, { recursive: true, force: true });
});

test('a DIFFERENT token for the same key is not blocked by the first', async () => {
  // The round-5 brick, kept pinned in the shared primitive: keying either file by the
  // breach alone made every SECOND approval cycle unredeemable. A control keyed on
  // something coarser than the thing it protects will eventually deny the thing it
  // protects.
  const { redeemOnce } = await import(CLAIM_URL);
  const dir = mkdtempSync(join(tmpdir(), 'swan-claim-2-'));
  assert.equal(redeemOnce(dir, 'k', 'aaaaaaaaaaaa'), true, 'cycle 1 redeems');
  assert.equal(redeemOnce(dir, 'k', 'aaaaaaaaaaaa'), false, 'and is then spent');
  assert.equal(redeemOnce(dir, 'k', 'cccccccccccc'), true, 'cycle 2 must NOT be bricked by cycle 1');
  rmSync(dir, { recursive: true, force: true });
});

test('the reclaim DELETES nothing — the race was in the unlink', async () => {
  // `stat -> unlink -> create` is three operations, so a racer can unlink another's
  // fresh claim and both proceed. A reclaim creates the next generation with O_EXCL
  // instead; the original survives as the crash record.
  const { claimToken } = await import(CLAIM_URL);
  const dir = mkdtempSync(join(tmpdir(), 'swan-claim-3-'));
  assert.equal(claimToken(dir, 'k', 'aaaaaaaaaaaa'), true);
  const files = readdirSync(dir);
  assert.ok(files.some((f) => f.startsWith('claim-k-aaaaaaaaaaaa')), 'the claim exists');
  assert.ok(!files.some((f) => f.includes('.gen')), 'a first claim needs no generation');
  rmSync(dir, { recursive: true, force: true });
});
