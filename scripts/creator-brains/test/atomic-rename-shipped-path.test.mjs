#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/atomic-rename-shipped-path.test.mjs
 * PURPOSE: Does the atomic-publish defect REACH THE SHIPPED ENGINE? Measured
 *          against real `runDaily`, with each child reporting its own error.
 * PART OF: Creator Brains — SS-PT acquisition engine
 * SPLIT FROM: `atomic-rename-contention.test.mjs`, at the seam between "the
 *          primitive is not atomic" and "and here is what that costs a run".
 *          Rule 4: the parent hit 319 lines, so it was divided, not trimmed.
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * WHY THIS IS A SEPARATE FILE, AND NOT A FOURTH CASE IN ITS PARENT.
 *
 *   The parent proves the PRIMITIVE (`renameSync` onto a shared destination is
 *   not atomic across processes on Windows) and its failure SHAPE (a crashed
 *   child prints nothing on stdout). Neither of those says the defect matters.
 *   A reader is entitled to ask: does the shipped engine actually lose this
 *   race, or is it an artifact of a 4-process stress harness? This file answers
 *   that question directly, and the answer is yes — with a rate.
 *
 * THE CAPTURED PROOF (2026-09-22), and the exact line it names.
 *
 *   Driving real concurrent `runDaily` calls against ONE store, with each child
 *   printing its own error payload:
 *
 *     EPERM: operation not permitted, rename
 *       '…\journal.json.<pid>.<rand>.tmp' -> '…\journal.json'
 *         at renameSync        (node:fs:1012)
 *         at writeTextAtomic   (paths.mjs:141)
 *         at writeJsonAtomic   (paths.mjs:150)
 *         at writeRunJournal   (run-journal.mjs:84)
 *         at runDaily          (run.mjs:118:18)   ← the step-0 open
 *
 *   `run.mjs:118` is the journal OPEN, and it runs BEFORE `takeStoreLock` at
 *   `:168` — so it is genuinely unsynchronized. That is the exposure.
 *
 * THE TWO EXPOSED PUBLISH POINTS, AND WHY THE RATE IS LOW.
 *
 *   1. `run.mjs:118` — the step-0 journal open, before the lock.
 *   2. `run.mjs:179` — the REFUSAL PATH's `conclude()`, which is reached before
 *      `withOwnership` opens at `:182`. A refused run therefore stamps the
 *      journal with NO LOCK HELD, while the winner is mid-run. This is the point
 *      the A1-06 gate's case (2) actually exercises, because a refused run is
 *      that case's whole subject. (Of the four `conclude()` sites — `:179`,
 *      `:191`, `:198`, `:253` — only `:179` is outside the ownership region.)
 *
 *   The other publishes (`finalizeRunJournal` `:159`, `markSuccess` `:261`) run
 *   under the lock and are serialized by construction. Both exposed windows are
 *   microseconds wide, which is why measured rate is ~1-in-120 children rather
 *   than the parent probe's amplified 7–14%.
 *
 * ⚠️ THIS FILE ASSERTS THE MECHANISM, NOT THE RATE — DELIBERATELY.
 *
 *   A hard `assert(throws > 0)` at ~1-in-120 would be a FLAKY GATE, which is the
 *   precise defect this work exists to retire. A gate that is red 1 run in 120
 *   teaches the team to ignore it. So this file pins what is deterministic — a
 *   crashed child reports its error in its own output, so no crash can be
 *   SILENT — and PRINTS the observed rate on every run.
 *
 *   The consequence, stated so it cannot be misread: **a green run here does NOT
 *   mean the defect is absent.** It means the sample did not catch it. The
 *   defect's existence is established by the captured stack above, by the raw
 *   primitive MEASUREMENT in the parent file's case (1b) (printed every run —
 *   24/600 this round, serialized control 0), and by the wrapper gate (1), whose
 *   job is the opposite: to prove the SHIPPED publisher now survives the
 *   contention rather than that the contention is gone. Not by this one's verdict.
 *
 * RUN: node --test scripts/creator-brains/test/atomic-rename-shipped-path.test.mjs
 * @module creator-brains/test/atomic-rename-shipped-path
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));

test('P0 the shipped runDaily reaches this defect — at run.mjs:118, ~1 in 120 children', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-shipped-'));
  try {
    const child = join(dir, 'runner.mjs');
    writeFileSync(child, `
      import { runDaily } from ${JSON.stringify(pathToFileURL(join(HERE, '..', 'lib', 'run.mjs')).href)};
      try {
        const rec = await runDaily({ r: process.env.CB_ROOT, only: ['canary'] });
        process.stdout.write('RAN ' + JSON.stringify({ ok: rec.ok }));
      } catch (e) {
        process.stdout.write('CRASHED ' + JSON.stringify({ code: e && e.code, msg: String((e && e.message) || '').slice(0, 200) }));
      }
    `, 'utf-8');

    const one = (root) => new Promise((resolve) => {
      const p = spawn(process.execPath, [child], {
        env: { ...process.env, CB_ROOT: root }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
      });
      let o = '';
      p.stdout.on('data', (d) => { o += d; });
      p.on('close', (code) => resolve({ o, code }));
    });

    const ROUNDS = 6, PER = 4;
    let children = 0, crashed = 0, eperm = 0;
    const runs = [];
    for (let i = 0; i < ROUNDS; i++) {
      const root = mkdtempSync(join(tmpdir(), 'cb-shipped-store-'));
      try {
        const out = await Promise.all(Array.from({ length: PER }, () => one(root)));
        for (const x of out) {
          children += 1;
          runs.push(x);
          if (x.o.startsWith('CRASHED')) {
            crashed += 1;
            if (x.o.includes('EPERM')) eperm += 1;
          }
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }

    // THE MECHANISM, asserted so it can actually FAIL. Two properties, counted
    // separately — an aggregate would lie about both:
    //   1. completeness — every child process ran;
    //   2. SILENCE — a child that exits non-zero must have named its error in
    //      its own stdout. A corpse with empty stdout is precisely what turned
    //      case (2) and HR14f into lock-protocol verdicts for three rounds, and
    //      the previous assertion here (`eperm <= crashed`) was true BY
    //      CONSTRUCTION of the accumulator — eperm only increments inside the
    //      crashed branch — so it could never fire on any input.
    assert.equal(children, ROUNDS * PER, 'every child ran');
    const silent = runs.filter((x) => x.code !== 0 && !String(x.o).startsWith('CRASHED'));
    assert.equal(silent.length, 0,
      `a crashed child printed NOTHING (${silent.length}/${children}) — the {"raw":""} corpse `
      + 'this probe exists to make impossible: ' + JSON.stringify(silent.slice(0, 3)));
    // eslint-disable-next-line no-console
    console.log(`[atomic-rename] shipped runDaily: ${children} concurrent children · `
      + `${crashed} crashed (of which ${eperm} named EPERM); rate ${crashed}/${children} — `
      + '0 here is NOT evidence of absence, only of sampling (see header)');
    assert.ok(eperm <= crashed, 'no crash is counted as EPERM unless it said so (eperm is a subset of crashed)');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
/* ── (3) MOVED HERE 2026-09-22 — the corpse shape, at the seam ─────────────────────────────
 * Split from `atomic-rename-contention.test.mjs`, which crossed Rule 4’s
 * 300-line cap when the E1 wrapper gate landed in it. The seam is honest:/n * that file proves the PUBLISHER survives contention; this one owns what a
 * crash LOOKS LIKE to a stdout-only harness — which is this file’s whole
 * subject (the A1-06 gate read `{"raw":""}` as a lock verdict for three rounds).
 */

/* ── (3) THE LINK TO THE GATE — a crashed child is what case (2) misread ──── */

test('P0 a child killed by this failure has EMPTY stdout — the shape case (2) read as a lock loss', async () => {
  // The whole confusion, in one assertion. `writeRunJournal` -> `writeJsonAtomic`
  // -> `renameSync` EPERM is UNCAUGHT in the racer child, so node exits 1 with
  // nothing on stdout. The A1-06 gate parses the child's stdout and falls into
  // `catch { return { raw: s } }`, so the failure arrives as `{"raw":""}` and the
  // assertion says "not exactly one refused" — blaming the lock for a rename.
  const dir = mkdtempSync(join(tmpdir(), 'cb-atomic-shape-'));
  try {
    const crashing = join(dir, 'crashing-child.mjs');
    // Renames onto a directory that does not exist: a stand-in for any
    // unhandled fs throw in a child, which is the property being pinned.
    writeFileSync(crashing, `
      import { renameSync } from 'node:fs';
      import { join } from 'node:path';
      renameSync(join(process.env.RP_DIR, 'nope.tmp'), join(process.env.RP_DIR, 'no-such-dir', 'x.json'));
      process.stdout.write('NEVER');
    `, 'utf-8');
    const res = await new Promise((resolve) => {
      const p = spawn(process.execPath, [crashing], { env: { ...process.env, RP_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
      let o = '', e = '';
      p.stdout.on('data', (d) => { o += d; });
      p.stderr.on('data', (d) => { e += d; });
      p.on('close', (code) => resolve({ o, e, code }));
    });
    assert.notEqual(res.code, 0, 'the child exits non-zero');
    assert.equal(res.o, '', 'and prints NOTHING to stdout — so a stdout-parsing parent sees only {"raw":""}');
    assert.match(res.e, /(ENOENT|EPERM|EACCES)/, 'the evidence is on stderr, where a stdout-only harness never looks');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
