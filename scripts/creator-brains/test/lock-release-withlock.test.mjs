#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/lock-release-withlock.test.mjs
 * PURPOSE: Does `withLock`'s `finally` RETRY the release — or discard it (F03)?
 * PART OF: Creator Brains — SS-PT acquisition engine (Astra hostile r1)
 * ADDED: 2026-09-23
 * ============================================================================
 *
 * ── WHY THIS IS A SEPARATE FILE FROM `lock-release-retry.test.mjs` ──────────
 *
 * They test different call sites of ONE policy. That file drives the MUTATION
 * paths (`addCreator` → `commitResolvedCreator`, and `setEnabled`); this one
 * drives the lock's own async wrapper. Keeping them apart is deliberate on two
 * counts: the mutation file is the slice as authored and mutation-proven, so it
 * stays byte-exact; and either file alone would breach Rule 4's 300-line cap if
 * the two were merged. The child harness below is therefore a near-copy of the
 * one there — the shared part is ~50 lines and extracting it would mean editing
 * the file whose byte-exactness is the point.
 *
 * ── WHAT F03 IS, IN ONE PARAGRAPH ───────────────────────────────────────────
 *
 * `release()` returns **false** when its deletion retries are exhausted, and the
 * E4 repair deliberately does NOT latch `released` in that case — the SAME
 * handle stays retryable, which is the whole point of that repair. `withLock`'s
 * `finally` wrote `lock.release();` and threw the boolean away, so that
 * retryability was unreachable from the one path the CONSOLE RUN GATE takes
 * (`underRunGate` → `withLock`). The stake is not "busy": a transient Windows
 * unlink failure exhausts the ~92 ms budget, the lock stays on disk under a
 * **LIVE** pid, and `acquireLock` never reclaims a lock whose owner is alive —
 * the store wedges until a human deletes the file.
 *
 * ── HOW IT IS MEASURED ──────────────────────────────────────────────────────
 *
 * Same substitution as the sibling file, and the same load-bearing ordering:
 * the child patches `require('node:fs').unlinkSync` BEFORE the first ESM
 * instantiation of `node:fs`, then dynamically imports the module under test.
 * `lock.mjs` is the only module on this path that calls `unlinkSync`, so the
 * attempt counter counts lock deletions and nothing else. The inner budget is
 * MEASURED by a probe child rather than hardcoded, so this cannot silently stop
 * discriminating if that budget changes.
 *
 * RUN: node --test scripts/creator-brains/test/lock-release-withlock.test.mjs
 * @module creator-brains/test/lock-release-withlock
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const LOCK = join(HERE, '..', 'lib', 'lock.mjs');
const LOCK_HREF = pathToFileURL(LOCK).href;

/**
 * The behavioural child. It may NOT statically import `node:fs` (the patch must
 * land first), and `mode=probe` LEAVES THE LOCK BEHIND — so each mode gets its
 * own directory, or a probe's residue sends the next child down `acquireLock`'s
 * RECLAIM branch, which also unlinks, and the count stops meaning "release".
 */
const CHILD = `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fs = require('node:fs');
const { join } = require('node:path');
const dir = process.env.LR_DIR;
const lockPath = join(dir, '.lock');

const original = fs.unlinkSync;
let attempts = 0;
let failsLeft = Number(process.env.LR_FAILS || '0');
fs.unlinkSync = function injectedUnlink(p) {
  attempts += 1;
  if (failsLeft > 0) {
    failsLeft -= 1;
    const e = new Error('injected EPERM for test');
    e.code = 'EPERM';
    throw e;
  }
  return original.call(this, p);
};

if (process.env.LR_MODE === 'probe') {
  const { acquireLock } = await import(${JSON.stringify(LOCK_HREF)});
  const held = acquireLock(dir, { runId: 'probe' });
  if (!held.ok) {
    process.stdout.write('R' + JSON.stringify({ error: 'acquire_failed', held }));
    process.exit(0);
  }
  const res = held.release();
  process.stdout.write('R' + JSON.stringify({
    attempts, res, lockThere: fs.existsSync(lockPath),
  }));
  process.exit(0);
}

const { withLock } = await import(${JSON.stringify(LOCK_HREF)});
const res = await withLock(dir, async () => 'ok', { runId: 'gate' });
process.stdout.write('R' + JSON.stringify({
  res, attempts, lockThere: fs.existsSync(lockPath),
}));
`;

function runChild(dir, { fails, mode }) {
  const file = join(dir, 'release-child.mjs');
  writeFileSync(file, CHILD, 'utf-8');
  const r = spawnSync(process.execPath, [file], {
    encoding: 'utf-8',
    env: { ...process.env, LR_DIR: dir, LR_FAILS: String(fails), LR_MODE: mode },
    windowsHide: true,
  });
  const stdout = String(r.stdout || '');
  let payload = null;
  try { payload = JSON.parse(stdout.slice(stdout.indexOf('R') + 1)); } catch { /* reported below */ }
  return {
    status: r.status,
    payload,
    stderr: String(r.stderr || '').slice(0, 800),
    stdout: stdout.slice(0, 400),
  };
}

/** Measure `release()`'s own attempt budget, in its own directory. */
function measureInnerBudget() {
  const dir = mkdtempSync(join(tmpdir(), 'cb-f03-wl-probe-'));
  try {
    const probe = runChild(dir, { fails: 999, mode: 'probe' });
    assert.ok(probe.payload && !probe.payload.error,
      `the probe child could not measure release(): ${JSON.stringify(probe)}`);
    const inner = probe.payload.attempts;
    assert.ok(inner >= 1,
      `release() made no unlink attempt at all, so nothing below can be measured: `
      + `${JSON.stringify(probe.payload)}`);
    assert.equal(probe.payload.res, false,
      'the probe injects unlimited EPERM, so release() must report false');
    assert.equal(probe.payload.lockThere, true,
      'the probe must leave the lock behind — it is the baseline the retry is measured against');
    return inner;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('F03: withLock RETRIES the release past release()\'s own budget, so the store is freed', () => {
  const inner = measureInnerBudget();
  const dir = mkdtempSync(join(tmpdir(), 'cb-f03-wl-'));
  try {
    const r = runChild(dir, { fails: inner + 2, mode: 'gate' });
    assert.ok(r.payload, `the child produced no payload: ${JSON.stringify(r)}`);
    const p = r.payload;

    assert.equal(p.res, 'ok',
      `withLock must still return the callback's value: ${JSON.stringify(p)}`);

    assert.equal(p.lockThere, false,
      `the store was NOT freed. release()'s own budget is ${inner} attempt(s) and the injection is `
      + `${inner + 2}, so a finally that discards release()'s boolean gives up while the lock is `
      + `still on disk under a LIVE pid — which acquireLock will never reclaim. That is F03, on the `
      + `console run gate's path. ${JSON.stringify(p)}`);

    assert.ok(p.attempts > inner,
      `only ${p.attempts} unlink attempt(s) and the inner budget is ${inner} — the retry never ran, `
      + `or ran without effect. ${JSON.stringify(p)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('precondition: withLock is WIRED to the shared release policy', () => {
  // Structural, and deliberately narrow — a re-scope tripwire, not the proof.
  // The proof is the behavioural test above. This exists so that deleting the
  // wiring fails with a sentence that says where to look.
  const src = readFileSync(LOCK, 'utf-8');
  assert.match(src, /from '\.\/lock-release\.mjs'/,
    'lock.mjs no longer imports the shared release policy — re-scope this gate, do not loosen it');

  const start = src.indexOf('export async function withLock');
  assert.ok(start !== -1, 'withLock is gone or renamed — re-scope this gate, do not loosen it');
  const tail = src.slice(start);
  assert.match(tail, /releaseStore\s*\(/,
    'withLock\'s finally no longer routes its release through releaseStore — the F03 retryability '
    + 'is unreachable from the run-gate path again');

  const policy = readFileSync(join(HERE, '..', 'lib', 'lock-release.mjs'), 'utf-8');
  assert.match(policy, /export function releaseStore/,
    'lock-release.mjs no longer exports releaseStore');
  assert.ok(existsSync(LOCK), 'lock.mjs disappeared while this gate ran');
});
