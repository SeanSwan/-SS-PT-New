#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/lock-release-retry.test.mjs
 * PURPOSE: Is `release()` RETRIED by the catalog mutation paths — or is its
 *          boolean thrown away again (F03)?
 * PART OF: Creator Brains — SS-PT acquisition engine (Astra hostile r1)
 * ADDED: 2026-09-23
 * ============================================================================
 *
 * ── WHAT F03 ACTUALLY WAS ───────────────────────────────────────────────────
 *
 * `lock.mjs`'s `release()` returns **false** when its deletion retries are
 * exhausted, and the E4 repair deliberately does NOT latch `released` in that
 * case, leaving the SAME handle retryable. That repair is real and it is proven
 * by `lock-release-wiring.test.mjs`'s E4 test. But EVERY caller in the catalog
 * paths wrote `lock.release();` and discarded the boolean, so the retryability
 * was unreachable from the only callers that need it. A fix that is correct and
 * uncallable is not a fix, and `lock-release-wiring.test.mjs` could not catch
 * this: it drives the HANDLE, never a mutation path.
 *
 * The stake is not "the store is busy". It is wedged. A transient unlink failure
 * on Windows (another reader holding the file open) exhausts the ~92 ms budget,
 * the lock stays on disk carrying a **LIVE** pid, and `acquireLock` refuses to
 * reclaim a lock whose owner is alive — so every later writer, the daily run
 * included, refuses until a human deletes the file by hand.
 *
 * ── HOW IT IS MEASURED, AND WHY THIS INSTRUMENT ─────────────────────────────
 *
 * Same substitution as `lock-release-wiring.test.mjs`: the child patches
 * `require('node:fs').unlinkSync` BEFORE the first ESM instantiation of
 * `node:fs`, then dynamically imports the module under test. That ordering is
 * load-bearing and was MEASURED there: a probe with a static `node:fs` import
 * saw `patched=0`, because the namespace had already captured the original
 * bindings. The child therefore uses `createRequire` for everything and never
 * statically imports `node:fs`. No engine source is touched.
 *
 * The substitution is safe to apply globally in the child for a measured
 * reason: exactly one module on this path calls `unlinkSync` — `lock.mjs`.
 * `store.mjs` and `paths.mjs` contain no `unlinkSync` at all (grepped), so the
 * attempt counter counts lock deletions and nothing else.
 *
 * ── WHY THE INNER BUDGET IS MEASURED, NOT HARDCODED ─────────────────────────
 *
 * The discriminating quantity is "more attempts than `release()` would make on
 * its own". Hardcoding 6 would silently stop discriminating the day that budget
 * changes — the instrument would report a state it never reached, which is the
 * mistake `lock-release-wiring.test.mjs` already records twice. So a probe child
 * measures it first, and the mutation child is injected `inner + 2` failures:
 * one more than the inner retry can absorb, and well inside what the outer retry
 * can.
 *
 * ── WHAT EACH TEST PROVES ───────────────────────────────────────────────────
 *
 *   1. `addCreator` with `inner + 2` injected EPERMs must still leave NO lock
 *      behind. A discarded boolean stops at `inner` attempts and leaves the lock
 *      on disk -> RED on both `lockThere` and `attempts > inner`.
 *
 *   2. `addCreator` against a store that genuinely cannot be freed must return
 *      `ok: true` with `releaseFailed: true`. S1-H9 forbids reporting a write
 *      that COMMITTED as a refusal, so `{ok:false}` here is a defect. This also
 *      makes `releaseFailed` a field something actually reads, rather than one
 *      that is set and ignored — the same sin one level up.
 *
 * RUN: node --test scripts/creator-brains/test/lock-release-retry.test.mjs
 * @module creator-brains/test/lock-release-retry
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REGISTRY = join(HERE, '..', 'lib', 'registry.mjs');
const LOCK = join(HERE, '..', 'lib', 'lock.mjs');
const REGISTRY_HREF = pathToFileURL(REGISTRY).href;
const LOCK_HREF = pathToFileURL(LOCK).href;

/** `UC` + 22 url-safe chars — the exact shape `validateCreatorRef` accepts. */
const CHANNEL = `UC${'a'.repeat(22)}`;

/**
 * The behavioural child. THREE RULES THIS BODY OBEYS, all load-bearing:
 *
 *   - it may NOT statically import `node:fs` (the patch must land first);
 *   - `mode=probe` measures `release()`'s own budget and LEAVES THE LOCK BEHIND,
 *     so each mode gets its own directory — a probe's residue in the same dir
 *     would send the next child down `acquireLock`'s RECLAIM branch, which also
 *     calls `unlinkSync`, and the attempt count would stop meaning "release";
 *   - the "did the write commit" check reads the FILE, not `res.ok`. The whole
 *     point of test 2 is that `ok:true` is not evidence on its own.
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
  // First ESM instantiation of node:fs happens at this dynamic import, after the
  // patch — so lock.mjs binds the injected unlinkSync.
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

const { addCreator } = await import(${JSON.stringify(REGISTRY_HREF)});
const res = await addCreator({
  ref: process.env.LR_REF,
  r: dir,
  deps: {
    resolveCreator: () => ({
      channelId: process.env.LR_REF,
      title: 'Probe Channel',
      url: 'https://www.youtube.com/channel/' + process.env.LR_REF + '/videos',
    }),
  },
});
let wrote = false;
try {
  wrote = fs.readFileSync(join(dir, 'registry.json'), 'utf-8').includes(process.env.LR_REF);
} catch { /* reported as false */ }
process.stdout.write('R' + JSON.stringify({
  ok: res.ok === true,
  reason: res.reason || null,
  releaseFailed: res.releaseFailed === true,
  attempts,
  lockThere: fs.existsSync(lockPath),
  wrote,
}));
`;

function runChild(dir, { fails, mode }) {
  const file = join(dir, 'release-child.mjs');
  writeFileSync(file, CHILD, 'utf-8');
  const r = spawnSync(process.execPath, [file], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      LR_DIR: dir,
      LR_FAILS: String(fails),
      LR_MODE: mode,
      LR_REF: CHANNEL,
    },
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
  const dir = mkdtempSync(join(tmpdir(), 'cb-f03-probe-'));
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
      'the probe must leave the lock behind — it is the baseline the outer retry is measured against');
    return inner;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('F03: addCreator RETRIES the release past release()\'s own budget, so the store is freed', () => {
  const inner = measureInnerBudget();
  const dir = mkdtempSync(join(tmpdir(), 'cb-f03-add-'));
  try {
    const r = runChild(dir, { fails: inner + 2, mode: 'add' });
    assert.ok(r.payload, `the child produced no payload: ${JSON.stringify(r)}`);
    const p = r.payload;

    assert.equal(p.ok, true, `the write itself must still succeed: ${JSON.stringify(p)}`);
    assert.equal(p.wrote, true, `the catalog on disk must carry the creator: ${JSON.stringify(p)}`);

    assert.equal(p.lockThere, false,
      `the store was NOT freed. release()'s own budget is ${inner} attempt(s) and the injection is `
      + `${inner + 2}, so a release whose boolean is discarded gives up while the lock is still on `
      + `disk under a LIVE pid — which acquireLock will never reclaim. That is F03. ${JSON.stringify(p)}`);

    assert.ok(p.attempts > inner,
      `only ${p.attempts} unlink attempt(s) and the inner budget is ${inner} — the outer retry never `
      + `ran, or ran without effect. ${JSON.stringify(p)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('F03: a store that cannot be freed is REPORTED, never dressed up as a refusal', () => {
  const inner = measureInnerBudget();
  const dir = mkdtempSync(join(tmpdir(), 'cb-f03-stuck-'));
  try {
    const r = runChild(dir, { fails: 999, mode: 'add' });
    assert.ok(r.payload, `the child produced no payload: ${JSON.stringify(r)}`);
    const p = r.payload;

    // S1-H9: the write COMMITTED. Reporting it as `{ok:false}` would tell the
    // owner their creator was not added when it was, and the retry they are
    // invited to make would be a second add of the same channel.
    assert.equal(p.ok, true,
      `a committed write must not be reported as a refusal (S1-H9): ${JSON.stringify(p)}`);
    assert.equal(p.wrote, true, `the creator must be on disk: ${JSON.stringify(p)}`);
    assert.equal(p.releaseFailed, true,
      `the caller must be TOLD the store may still look locked, as its own field: ${JSON.stringify(p)}`);
    assert.equal(p.lockThere, true,
      `with every unlink failing, the lock must genuinely still be there — otherwise this test is `
      + `asserting a state it never reached. ${JSON.stringify(p)}`);

    assert.ok(p.attempts > inner,
      `the outer retry must have run before giving up: ${p.attempts} attempt(s) vs an inner budget `
      + `of ${inner}. ${JSON.stringify(p)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('precondition: the release policy is still WIRED into the mutation path', () => {
  // Structural, and deliberately narrow — a re-scope tripwire, not the proof.
  // The proof is the behavioural test above. This exists so that deleting the
  // wiring fails with a sentence that says where to look, rather than only with
  // a count of unlink attempts.
  const src = readFileSync(REGISTRY, 'utf-8');
  assert.match(src, /from '\.\/lock-release\.mjs'/,
    'registry.mjs no longer imports the shared release policy — re-scope this gate, do not loosen it');
  const calls = src.match(/releaseStore\(/g) || [];
  assert.equal(calls.length, 2,
    `expected 2 releaseStore( CALLS in registry.mjs (addCreator and setEnabled), found `
    + `${calls.length} — a path may have gone back to discarding release()`);

  const policy = readFileSync(join(HERE, '..', 'lib', 'lock-release.mjs'), 'utf-8');
  assert.match(policy, /export function releaseStore/,
    'lock-release.mjs no longer exports releaseStore');
  assert.ok(existsSync(LOCK), 'lock.mjs disappeared while this gate ran');
});
