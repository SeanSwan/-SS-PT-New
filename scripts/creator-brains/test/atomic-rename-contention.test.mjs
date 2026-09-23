#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/atomic-rename-contention.test.mjs
 * PURPOSE: The DETERMINISTIC root cause of the A1-06 case (2) flake — and of
 *          HR14f's `{"raw":""}` — measured directly, with no CPU load and no
 *          luck required.
 * PART OF: Creator Brains — SS-PT acquisition engine
 * SLICE: its own slice. `19 §4`'s case (2) was ruled INADMISSIBLE as evidence
 *        (rounds 2 and 3: "must not be cited either way"), and round 3 named
 *        the reason it deserved one: "a flaky gate is worse than a red one."
 *        This file is that slice. It is deterministic, so it cites something.
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * WHAT WAS BELIEVED, AND WHAT IS TRUE.
 *
 *   `paths.mjs:123` states the design in its own words:
 *
 *     "`rename` is only atomic with respect to readers; it does nothing to
 *      separate two writers sharing a temp path. pid + random keeps them apart;
 *      the rename stays the atomic publication step."
 *
 *   `lock.mjs:11` relies on the same assumption: "`writeTextAtomic` renames a
 *   temp file over the target, which makes a single write crash-safe."
 *
 *   Both are correct about READERS. Neither is correct about two writers
 *   RENAMING ONTO THE SAME DESTINATION AT THE SAME TIME on Windows: the second
 *   `renameSync` can fail with `EPERM`, because the destination is open for
 *   replacement by the first. Atomic-with-respect-to-readers was read as
 *   atomic-full-stop, and it is not.
 *
 * HOW THIS WAS FOUND — and why the old gate could not see it.
 *
 *   The A1-06 gate's case (2) was flaky at 1-in-10 to 3-in-10, only under
 *   full-suite CPU contention. Reproduced under load, the failure was NOT the
 *   shape it had been read as. Measured over 40 pairs (80 children):
 *
 *     {"ok=1 refused=1": 38, "ok=1 refused=0": 2}     doubleHold = 0
 *
 *   **Not one double-hold.** The two failures were a child that printed
 *   NOTHING (`{"raw":""}`), and capturing its stderr gave the real defect:
 *
 *     EPERM: operation not permitted, rename
 *       '…\journal.json.<pid>.<rand>.tmp' -> '…\journal.json'
 *       at renameSync   (node:fs)
 *       at writeTextAtomic  (paths.mjs:141)
 *       at writeJsonAtomic  (paths.mjs:150)
 *       at writeRunJournal  (run-journal.mjs:84)
 *
 *   The child died at exit code 1 with an empty stdout. The gate's
 *   `try { JSON.parse } catch { return { raw: s } }` then swallowed it, and the
 *   assertion reported it as "not exactly one refused" — which reads as a LOST
 *   MUTEX. It is not. The mutex never failed. A file publish failed, in a
 *   process that happened to be the loser, and the harness turned a crash into a
 *   lock-protocol verdict.
 *
 *   So the flake was NOT a coin-flip assertion, and case (2) is NOT evidence
 *   about the lock. Two separate things were tangled: a real Windows rename
 *   limitation, and a test that could not distinguish it from a lock failure.
 *   The ruling "must not be cited either way" was right, and this file is what
 *   replaces it.
 *
 * WHY THIS IS AN ENGINE DEFECT AND NOT A TEST-ONLY ONE.
 *
 *   The blast radius is every atomic write in the engine, not the journal:
 *   registry, state, run records, manifest, checkpoints, throttle, docs, digest,
 *   export, render, backup — all route through `writeTextAtomic`/`writeJsonAtomic`
 *   (`grep -rn` names 30+ call sites). On a store where two runners are live —
 *   the CLI plus a scheduled run, or two machines against a synced store, which
 *   A1-06 explicitly anticipates — any of those writes can throw EPERM and take
 *   its process down. That is a store-wide durability defect with a
 *   Windows-specific trigger, and it is the engine owner's to fix.
 *
 * WHAT WOULD FIX IT (engine owner's call — NOT patched here; the boundary is
 * additive-only, `19 §7.3`, and a console patch to engine files is out of bounds).
 *   The publish step needs to tolerate a destination that is momentarily held:
 *   retry the rename briefly on EPERM/EBUSY, and/or unlink-then-rename, and/or
 *   `fs.rename` with a short backoff. Any of those is a real change to the
 *   atomicity contract and belongs with the owner of `paths.mjs`.
 *
 * ── ⚠️ HOW NARROW IS THE REAL EXPOSURE? MEASURED — AND IT REACHES THE SHIPPED PATH
 *
 *   This file is a HIGH-AMPLIFICATION probe: 4 processes x 150 publishes onto one
 *   target. That overstates realistic load, so the counterweight was measured:
 *
 *     2 real `runDaily` per store x 20 rounds   →  40 children, 0 EPERM
 *     6-8 real `runDaily` per store x 12-25     → 284 children, 2 crashed
 *     8 real `runDaily` per store x 30          → 240 children, 0 crashed
 *     refusal path stressed x 30                → 240 children, 4 crashed
 *
 *   The crashes were then CAPTURED, and they are this defect:
 *
 *     EPERM: operation not permitted, rename
 *       '…\journal.json.<pid>.<rand>.tmp' -> '…\journal.json'
 *         at renameSync → writeTextAtomic (paths.mjs:141) → writeJsonAtomic
 *         → writeRunJournal (run-journal.mjs:84) → runDaily (run.mjs:118:18)
 *
 *   **So the shipped `runDaily` DOES reach this defect, at ~1-in-120 children.**
 *   The exposed points are the two publishes that run BEFORE ownership opens:
 *   the step-0 journal open (`run.mjs:118`, before `takeStoreLock` at `:168`) and
 *   the refusal path's `conclude()` (`:179`, before `withOwnership` at `:182`).
 *   `finalizeRunJournal` (`:159`) and `markSuccess` (`:261`) run under the lock
 *   and are serialized, which is why the windows are microseconds wide.
 *
 *   **What is narrow is the WINDOW, not the defect.** Do NOT read case (1) below
 *   as "every run can crash", and do NOT read a green shipped-path run as
 *   "no defect" — see `atomic-rename-shipped-path.test.mjs`, which asserts the
 *   mechanism rather than the rate for exactly that reason.
 *
 * RUN: node --test scripts/creator-brains/test/atomic-rename-contention.test.mjs
 * @module creator-brains/test/atomic-rename-contention
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));

/** A worker that renames N temp files onto ONE shared destination. */
const RACER = `
import { writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
const d = process.env.RP_DIR, tag = process.env.RP_TAG;
const target = join(d, 'target.json');
let ok = 0, eperm = 0, other = {};
for (let i = 0; i < Number(process.env.RP_N || 150); i++) {
  const tmp = join(d, 't-' + tag + '-' + i + '.tmp');
  writeFileSync(tmp, tag + i, 'utf-8');
  try { renameSync(tmp, target); ok++; }
  catch (e) {
    if (e.code === 'EPERM') eperm++;
    else other[e.code] = (other[e.code] || 0) + 1;
  }
}
process.stdout.write('R' + JSON.stringify({ tag, ok, eperm, other }));
`;

/** The SAME load, driven through the SHIPPED publisher (`writeTextAtomic`) —
 *  the function all 30+ engine call sites actually use. Under E1-unfixed this
 *  throws EPERM out of the retry-less rename; under the fix the bounded retry
 *  absorbs the transient destination lock. */
const WRAP_RACER = `
import { writeTextAtomic } from ${JSON.stringify(pathToFileURL(join(HERE, '..', 'lib', 'paths.mjs')).href)};
import { join } from 'node:path';
const d = process.env.RP_DIR, tag = process.env.RP_TAG;
const target = join(d, 'target.json');
let ok = 0, fail = {};
for (let i = 0; i < Number(process.env.RP_N || 150); i++) {
  try { writeTextAtomic(target, tag + i); ok++; }
  catch (e) { const c = (e && e.code) || 'NO_CODE'; fail[c] = (fail[c] || 0) + 1; }
}
process.stdout.write('R' + JSON.stringify({ tag, ok, fail }));
`;

/** Run the racer in a real child — the contention must be cross-process,
 *  because that is exactly the condition the in-process probe does not have. */
function runRacer(dir, tag, n, src = RACER) {
  const file = join(dir, `racer-${tag}.mjs`);
  writeFileSync(file, src, 'utf-8');
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [file], {
      env: { ...process.env, RP_DIR: dir, RP_TAG: tag, RP_N: String(n) },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => {
      try { resolve(JSON.parse(out.slice(out.indexOf('R') + 1))); }
      catch { resolve({ tag, raw: out }); }
    });
  });
}

/* ── (1) THE REGRESSION GATE — the SHIPPED publisher under 4x150 contention ── */

test('P0 E1: writeTextAtomic survives four processes publishing onto ONE destination', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-atomic-wrap-'));
  try {
    writeFileSync(join(dir, 'target.json'), 'INIT', 'utf-8');
    const N = 150;
    const results = await Promise.all(['A', 'B', 'C', 'D'].map((t) => runRacer(dir, t, N, WRAP_RACER)));

    const total = results.reduce((a, r) => a + (r.ok || 0) + Object.values(r.fail || {}).reduce((x, y) => x + y, 0), 0);
    const failed = results.reduce((a, r) => a + Object.values(r.fail || {}).reduce((x, y) => x + y, 0), 0);

    assert.equal(results.every((r) => !r.raw), true,
      `every racer must report, got ${JSON.stringify(results)}`);
    // Astra R1 (2026-09-22) — this gate computed `total` and never asserted it, so a
    // child that reported `{ok:0, fail:{}}` would satisfy `failed === 0` while doing
    // NO work: the gate could pass on an empty run. `runRacer` only JSON.parses what
    // the child prints, so nothing downstream enforces the share either. Without this
    // line the test proves "nobody failed", not "600 publishes happened".
    assert.equal(total, 4 * N,
      `every racer must complete its full share — got ${total} of ${4 * N} `
      + `(${JSON.stringify(results)}); an under-reported run cannot stand as evidence`);
    // Astra R2 (#8): the aggregate above is satisfiable by ONE racer doing all
    // the work — `[600,0,0,0]` with empty `fail` objects passes both `total`
    // and `failed`. "Every racer" has to be asserted per racer, not summed.
    for (const r of results) {
      assert.equal(r.raw, undefined,
        `racer ${r.tag} did not produce a parseable report: ${JSON.stringify(r).slice(0, 300)}`);
      assert.equal((r.ok || 0), N,
        `racer ${r.tag} reported ${r.ok} of its ${N} — a share is per-racer, not a total`);
      assert.deepEqual(r.fail || {}, {},
        `racer ${r.tag} recorded failures that never reached the total: ${JSON.stringify(r.fail)}`);
    }
    assert.equal(failed, 0,
      `writeTextAtomic lost ${failed}/${total} publishes under cross-process contention: `
      + `${JSON.stringify(results)} — the engine's own publisher threw instead of tolerating `
      + 'the transient destination lock (EPERM on rename, paths.mjs). This is amplified load '
      + '(4 x 150 onto one target); the shipped-path measurement in the header says the window '
      + 'is narrow in real runs, and THIS is what makes the narrow window survivable.');

    // The target must hold one racer's whole record, never a mix — the retry
    // must not have turned atomic publication into append-or-torn.
    const body = readFileSync(join(dir, 'target.json'), 'utf-8');
    assert.match(body, /^[ABCD]\d+$/, `the target holds one whole record, got ${JSON.stringify(body)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ── (1b) THE PLATFORM FACT — raw renameSync, measured, never asserted zero ──
 *
 * Rewritten 2026-09-22: this used to assert `eperm === 0` on the RAW primitive
 * and was the suite's permanent red-by-design. That disclosure has served its
 * purpose — E1 is now pinned at the caller level by test (1) above, which drives
 * the SHIPPED function. What remains true forever is a property of Windows, not
 * of this engine: two processes renaming onto one destination can EPERM. So
 * this case now MEASURES the rate (printed every run) and asserts only what is
 * this engine's to keep: every racer reports, and the target is never a mix. */

test('P0 platform fact: raw renameSync contention is measured, and the target never mixes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-atomic-'));
  try {
    writeFileSync(join(dir, 'target.json'), 'INIT', 'utf-8');
    const N = 150;
    const results = await Promise.all(['A', 'B', 'C', 'D'].map((t) => runRacer(dir, t, N)));

    const total = results.reduce((a, r) => a + (r.ok || 0) + (r.eperm || 0), 0);
    const eperm = results.reduce((a, r) => a + (r.eperm || 0), 0);

    assert.equal(results.every((r) => !r.raw), true,
      `every racer must report, got ${JSON.stringify(results)}`);
    // eslint-disable-next-line no-console
    console.log(`[atomic-rename] raw primitive: ${eperm}/${total} renames lost to EPERM under `
      + '4x150 contention (platform fact; serialized control below is 0 — it is CONTENSION, '
      + 'and the shipped writeTextAtomic above is what tolerates it)');

    const body = readFileSync(join(dir, 'target.json'), 'utf-8');
    assert.match(body, /^[ABCD]\d+$/, `the target holds one whole record, got ${JSON.stringify(body)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/* ── (2) THE CONTROL — the SAME renames, serialized, never fail ───────────── */

test('P0 control: serialized renames onto the same destination never EPERM', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-atomic-serial-'));
  try {
    writeFileSync(join(dir, 'target.json'), 'INIT', 'utf-8');
    // One racer at a time. If this also failed, the defect would be
    // "rename onto an existing file is broken", which it is not — it is
    // specifically CONTENTION. Stating it keeps the claim precise.
    const results = [];
    for (const t of ['A', 'B', 'C', 'D']) results.push(await runRacer(dir, t, 150));
    const eperm = results.reduce((a, r) => a + (r.eperm || 0), 0);
    assert.equal(eperm, 0,
      `serialized renames must never EPERM, got ${eperm}: ${JSON.stringify(results)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});


/* ── MOVED OUT, not deleted ─────────────────────────────────────────────────
 * The case that drives the SHIPPED `runDaily` and measures whether this defect
 * reaches it (captured EPERM at `run.mjs:118`, 2-4 in 240 real concurrent
 * children, plus the second exposed point on the refusal path) now lives in
 * `atomic-rename-shipped-path.test.mjs`. It was split — not trimmed — when this
 * file crossed Rule 4's 300 lines, because "the primitive is not atomic" and
 * "and here is what that costs a run" are two different claims.
 * Case (3), THE LINK TO THE GATE (the corpse shape), followed it there on
 * 2026-09-22 for the same reason: the E1 wrapper gate landed in THIS file and
 * pushed it to 304 lines. Runtime-to-runtime: 3 + 2 tests before and after.
 */
