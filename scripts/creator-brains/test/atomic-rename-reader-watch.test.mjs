#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/atomic-rename-reader-watch.test.mjs
 * PURPOSE: The property the E1 gate CLAIMED but never observed — reader
 *          atomicity WHILE publishers are racing, not once afterwards.
 * PART OF: Creator Brains — SS-PT acquisition engine
 * SPLIT FROM: `atomic-rename-contention.test.mjs`. Rule 4: extract at the seam.
 * ADDED: 2026-09-22 (Astra R1 finding 6) · HARDENED 2026-09-22 (Astra R2 #2/#3)
 * ============================================================================
 *
 * WHY THE FINAL READ WAS NOT ENOUGH — Astra R1, adjudicated CONFIRMED.
 *
 *   The parent gate read `target.json` ONCE, after all racers exited, and
 *   asserted `/^[ABCD]\d+$/`. That proves the SURVIVING value is whole. It cannot
 *   see a destination that was briefly MISSING or TORN. "The last value is
 *   intact" is a different claim from "a reader never observes a hole" — and the
 *   E1 fix's own comment promises the second:
 *
 *     "every attempt is one atomic rename, so a reader sees the old file or
 *      the new file, never a missing or mixed one"  (paths.mjs, E1 note)
 *
 * FOUR DESIGN RULES, each paid for by a version of this file that was wrong.
 *
 *   1. THE WATCHER MUST YIELD. Single-threaded process: a loop of synchronous
 *      `readFileSync` with no `await` NEVER RETURNS, blocks the event loop and
 *      starves the code it watches. The first version hung 3m42s on an empty TAP.
 *      Every iteration awaits `setImmediate`.
 *
 *   2. THE CONTROL GAP MUST BE ASYNC, AND THE CONTROL MUST USE THE SAME
 *      ARRANGEMENT AS THE SUBJECT. Sleeping with a blocking sleep would starve the
 *      watcher in the one window that matters; and a control driven by the PARENT
 *      proves sensitivity to a parent-made gap, not to a child's publication.
 *      So the broken publisher is now a CHILD, exactly like phase 2 (Astra R2 #2).
 *
 *   3. OVERLAP MUST BE ASSERTED, NOT ASSUMED. Before hardening, the subject
 *      required only "some observations and one complete record" — which a watcher
 *      that read INIT, MISSED THE ENTIRE PUBLISH WINDOW, then read the final
 *      record would satisfy while holes existed under it. Now observations are
 *      only credited while children are still running, and at least one must land
 *      during active publication (Astra R2 #2).
 *
 *   4. A DEAD PUBLISHER MUST NAME ITS CAUSE. An earlier version accepted any dead
 *      publisher whose stderr was EMPTY or merely contained one of three codes, so
 *      an unidentified death passed silently — the exact corpse this work exists
 *      to catch. Now `code` is preserved, and every death must name EPERM (the
 *      identified transient exhaustion, filed as E7); anything else is red
 *      (Astra R2 #3).
 *
 * WHAT COUNTS AS A FAILURE.
 *
 *   - ENOENT read           → "never a missing one" broken (counted separately,
 *   - other read error      →   because only ENOENT means the FILE disappeared;
 *                               folding them together made the message assert a
 *                               disappearance the code did not observe)
 *   - body neither INIT nor → "never a mixed one": a torn or half-written
 *     complete racer record     publication.
 *
 * RUN: node --test scripts/creator-brains/test/atomic-rename-reader-watch.test.mjs
 * @module creator-brains/test/atomic-rename-reader-watch
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const LIB_HREF = pathToFileURL(join(HERE, '..', 'lib', 'paths.mjs')).href;
await import(LIB_HREF); // fail fast and loudly if the engine module will not load

const COMPLETE = /^[ABCD]\d+$/;
const N = 120;
const CONTROL_ROUNDS = 30;
const CONTROL_GAP_MS = 4;
/** The only death this test tolerates: the identified E1/E7 transient exhaustion. */
const IDENTIFIED = /EPERM/;

const yieldNow = () => new Promise((r) => setImmediate(r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Child: publish through the SHIPPED atomic publisher (E1's retry included).
 *  The href is INLINED once at build time, exactly as the parent probe's
 *  WRAP_RACER does — passing it via env and calling `pathToFileURL()` again
 *  converts an already-converted href and yields `file:\C:\…file:\C:\…`, which
 *  the child dies on with ERR_MODULE_NOT_FOUND and empty stdout (measured). */
const RACER = `
import { writeTextAtomic } from ${JSON.stringify(LIB_HREF)};
import { join } from 'node:path';
const target = join(process.env.RP_DIR, 'target.json');
let ok = 0;
for (let i = 0; i < Number(process.env.RP_N || 120); i++) {
  writeTextAtomic(target, process.env.RP_TAG + i);
  ok += 1;
}
process.stdout.write('R' + JSON.stringify({ tag: process.env.RP_TAG, ok }));
`;

/** The deliberately BROKEN publisher, used for phase 1. Same child-process
 *  arrangement as the subject, so the control exercises the observation path
 *  that phase 2 actually relies on. */
const BROKEN = `
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
const target = join(process.env.RP_DIR, 'target.json');
for (let i = 0; i < Number(process.env.RP_N || 30); i++) {
  try { unlinkSync(target); } catch { /* the gap is the point */ }
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${CONTROL_GAP_MS});
  writeFileSync(target, 'INIT', 'utf-8');
}
process.stdout.write('R' + JSON.stringify({ tag: process.env.RP_TAG, ok: Number(process.env.RP_N) }));
`;

/** Spawn a child and PRESERVE its exit status: stderr and code are the only
 *  places a crash states its cause, and discarding either turns every death into
 *  an unexplained `raw: ""`. */
function runChild(dir, tag, src) {
  const file = join(dir, `child-${tag}.mjs`);
  writeFileSync(file, src, 'utf-8');
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [file], {
      env: { ...process.env, RP_DIR: dir, RP_TAG: tag, RP_N: String(N) },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => {
      let parsed = null;
      try { parsed = JSON.parse(out.slice(out.indexOf('R') + 1)); } catch { /* keep raw */ }
      resolve({ tag, code, ok: parsed && parsed.ok, fail: parsed && parsed.fail, raw: parsed ? undefined : out, stderr: err });
    });
  });
}

function classify(body) {
  if (body === 'INIT' || COMPLETE.test(body)) return null;
  return 'MIXED:' + body.slice(0, 32);
}

test('P0 reader atomicity DURING publication — child control, then the shipped publisher', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-reader-watch-'));
  const target = join(dir, 'target.json');
  const seen = [];
  let missing = 0;   // ENOENT only: the destination genuinely disappeared
  let readErr = 0;   // any other read failure: distinct cause, distinct message
  let mixed = 0;
  let duringPublish = 0; // observations credited ONLY while children run
  let publishing = false;
  let stop = false;

  writeFileSync(target, 'INIT', 'utf-8');

  const watcher = (async () => {
    while (!stop) {
      let body;
      try {
        body = readFileSync(target, 'utf-8');
      } catch (e) {
        if (e && e.code === 'ENOENT') missing += 1;
        else readErr += 1;
        seen.push(e && e.code === 'ENOENT' ? 'MISSING' : 'READERR:' + (e && e.code));
        if (publishing) duringPublish += 1;
        await yieldNow();
        continue;
      }
      const bad = classify(body);
      if (bad) { mixed += 1; seen.push(bad); } else { seen.push(body); }
      if (publishing) duringPublish += 1;
      await yieldNow();
    }
  })();

  try {
    // ── PHASE 1: CONTROL — a CHILD publishing non-atomically ────────────────
    // Same arrangement as phase 2 (child process, parent watching), so the
    // sensitivity this proves is the sensitivity phase 2 depends on.
    for (let i = 0; i < CONTROL_ROUNDS; i += 1) {
      const broken = runChild(dir, 'B', BROKEN);
      publishing = true;
      const r = await broken;
      publishing = false;
      assert.equal(r.code, 0, `control child failed unexpectedly: ${JSON.stringify(r)}`);
      await sleep(2);
    }
    assert.ok(missing > 0,
      `CONTROL FAILED — the reader never observed the gap a CHILD deliberately opened across `
      + `${CONTROL_ROUNDS} rounds of ${CONTROL_GAP_MS} ms. This instrument cannot detect a `
      + 'missing destination through the very path phase 2 uses, so a clean subject phase below '
      + 'would prove nothing. Do not record a verdict from this run.');

    // Reset: phase 1's gaps must not be credited to phase 2's counters.
    missing = 0; readErr = 0; mixed = 0; duringPublish = 0;
    seen.length = 0;
    writeFileSync(target, 'INIT', 'utf-8');
    await yieldNow();

    // ── PHASE 2: SUBJECT — the shipped atomic publisher, 4 real processes ───
    publishing = true;
    const results = await Promise.all(['A', 'B', 'C', 'D'].map((t) => runChild(dir, t, RACER)));
    publishing = false;

    // Publishers are REPORTED, and every death must NAME ITS CAUSE. Tolerating an
    // identified exhaustion (E7) is defensible in a reader-safety test; silently
    // accepting an unidentified death is not (Astra R2 #3).
    const done = results.reduce((a, r) => a + (r.ok || 0), 0);
    const dead = results.filter((r) => r.code !== 0);
    for (const d of dead) {
      assert.ok(String(d.stderr || '').length > 0,
        `publisher ${d.tag} died (exit ${d.code}) with EMPTY stderr — an unidentified death. `
        + 'Cause must be printed by the child; a stdout-only harness cannot distinguish a crash '
        + 'from a hang, which is how case (2) and HR14f were misread for three rounds.');
      assert.ok(IDENTIFIED.test(d.stderr),
        `publisher ${d.tag} died of something other than the identified transient rename `
        + `exhaustion (E7): ${String(d.stderr).slice(0, 400)}`);
    }

    assert.ok(seen.length > 0,
      'the subject phase was never observed — PROBE INCONCLUSIVE, not a pass');

    // WHAT THIS RUN ESTABLISHES, STATED NARROWLY (Astra R3 #3 corrected an
    // overstatement here). The honest claim is: **no missing or torn records were
    // observed in N samples taken while publishers ran.** It is NOT a proof that
    // every gap was sampled — one early complete observation plus a missed later
    // gap still satisfies `duringPublish > 0`, and no sample threshold fixes that
    // (a threshold proves volume, not uninterrupted visibility).
    //
    // What DOES establish sensitivity to a gap of this shape is phase 1: a CHILD
    // publishing non-atomically (unlink -> gap -> write) while this same watcher
    // runs, which the control requires to be caught. That is deterministic,
    // interleaved coverage of "reader attempt lands inside a broken publication's
    // gap" — for the control's gap width. The subject's own gaps are not proven
    // sampled, and this test does not claim they are.
    assert.ok(seen.some((s) => COMPLETE.test(s)),
      'no complete racer record was ever observed — the reader never saw a real publication, '
      + `so "nothing missing or torn was observed" would be vacuous. observations=${seen.length}`);
    assert.ok(duringPublish > 0,
      'no observation was credited WHILE children were running — the watcher did not demonstrably '
      + 'overlap active publication, so even the narrow claim above cannot be made from this run. '
      + 'Re-run; if it persists the watcher is being starved (see rule 1) and the fixture is '
      + 'inconclusive.');

    assert.equal(missing, 0,
      `a reader saw the destination DISAPPEAR ${missing} time(s) (ENOENT) while writeTextAtomic `
      + 'published — the E1 promise "old file or new file, never a missing one" broke. Offenders: '
      + JSON.stringify(seen.filter((s) => s === 'MISSING').slice(0, 5)));

    assert.equal(readErr, 0,
      `a reader hit ${readErr} non-ENOENT read failure(s) — a DIFFERENT cause from a missing `
      + 'file (handle contention, permissions), reported separately so the message cannot claim a '
      + 'disappearance that was not observed: '
      + JSON.stringify(seen.filter((s) => s.startsWith('READERR')).slice(0, 5)));

    assert.equal(mixed, 0,
      `a reader saw a TORN body ${mixed} time(s) — publication did not land whole. Offenders: `
      + JSON.stringify(seen.filter((s) => s.startsWith('MIXED')).slice(0, 5)));

    // eslint-disable-next-line no-console
    console.log(`[reader-watch] control (child) caught the gap · subject: ${seen.length} obs `
      + `(${duringPublish} during publication) · missing=${missing} readErr=${readErr} `
      + `mixed=${mixed} · publishers done=${done} dead=${dead.length}`
      + (dead.length ? ` [tolerated E7: ${dead.map((d) => d.tag).join(',')}]` : ''));
  } finally {
    stop = true;
    await watcher;
    rmSync(dir, { recursive: true, force: true });
  }
});
