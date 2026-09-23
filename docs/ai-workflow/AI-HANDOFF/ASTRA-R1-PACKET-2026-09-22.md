# HOSTILE REVIEW PACKET - Creator Brains: the E1/E2 repairs, the shared retry policy, the A1-06 lock reclaim, and the S5 T-E3 retraction

**Reviewer seat:** gpt-6-astra (ChatGPT/Codex subscription transport) · **Mode:** hostile review · **Date:** 2026-09-22
**Repo:** SS-PT, branch `creator-brains-engine-r2-20260915`, HEAD `5331670af`.
**Working root:** `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT`
**Scope:** the changes quoted below, which are UNCOMMITTED in the working tree. HEAD does NOT contain them.

**REMIT - be adversarial and specific.** For each numbered question in section E, and for anything
else you can see in the excerpts, return a verdict of CONFIRMED / REFUTED / UNDERSTATED /
OVERSTATED / UNVERIFIABLE, citing file:line from the excerpts (line numbers appear above each
quoted block). For every CONFIRMED finding give: the defect, why it is a defect rather than a style
preference, the concrete failure it produces, and a proposed fix that names ONLY identifiers that
appear in the packet. If a proposed fix would need an identifier not in the packet, say so instead
of inventing one.

Priorities, highest first:
1. Does the E1 fix hold - bounded retry, reader atomicity preserved, no masking of real errors?
2. Does the E2 fix hold - BOTH halves, and does the test pin both?
3. The lock.mjs reclaim/release asymmetry (my question E1) - is it a defect, and which mechanism wins on Windows?
4. Anything in these excerpts that is WRONG, VACUOUS or UNPINNED that I have not asked about.
5. Is the S5 T-E3 retraction correctly scoped?

Concrete beats comprehensive: five findings with file:line beat fifteen written in prose.

---
### A1 - paths.mjs: the transient-retry policy, the rename publish, writeTextAtomic/writeJsonAtomic

(source: `scripts/creator-brains/lib/paths.mjs` lines 128-215 of 287; sha256[0:16]=`a093734db22cc6d0`)

```js
 * run — could interleave inside ONE temp file and produce a target containing a
 * mix of both. `rename` is only atomic with respect to readers; it does nothing
 * to separate two writers sharing a temp path. pid + random keeps them apart;
 * the rename stays the atomic publication step.
 *
 * E1 (2026-09-22), THE HALF THIS HR14 COMMENT DID NOT COVER: atomic FOR READERS
 * is not atomic FOR WRITERS. On Windows the second cross-process `renameSync`
 * onto one destination can fail EPERM while the first is landing — measured
 * 7-14% at 4x150, serialized control 0/1800, and the shipped journal hit it at
 * ~1-in-120 real runs (captured at this file's renameSync <- run.mjs:118).
 * "The rename stays the atomic publication step" was true and insufficient:
 * publication now RETRIES a momentarily-held destination for a bounded ~92 ms
 * (renameWithRetry below) and still fails loudly after the budget. The reader
 * guarantee is untouched: every attempt is one atomic rename, so a reader sees
 * the old file or the new one, never a missing or mixed one.
 *
 * The temp file is also removed on failure, so a full disk or a throw does not
 * litter the store with half-written candidates.
 */
/** Retryable TRANSIENT fs failures: the target is MOMENTARILY held by another
 *  process (Windows cross-process contention, E1) — shared by the rename
 *  publish below and by `lock.mjs`'s release unlink. Anything else (ENOENT,
 *  EIO, …) is a real error and must surface at once. */
const TRANSIENT_RETRYABLE = new Set(['EPERM', 'EBUSY', 'EACCES']);
const TRANSIENT_BACKOFF_MS = [2, 5, 10, 25, 50]; // 6 attempts, ~92 ms worst case

/** Park the thread without a child process. The API is synchronous, so a retry
 *  cannot yield to the event loop; Atomics.wait is the stdlib way to sleep
 *  synchronously (works on Node's main thread). */
export function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Run `op` until it succeeds, retrying only TRANSIENT codes (E1's lesson).
 *
 * Shared deliberately: two sites that used to swallow a transient Windows
 * contention failure — the rename publish (below) and the lock release — now
 * read ONE policy, so a third site cannot quietly reinvent a narrower one.
 * After the budget the failure is REAL and is rethrown: the retry adds
 * tolerance, never a lie.
 */
export function retryTransientSync(op, { backoffMs = TRANSIENT_BACKOFF_MS, retryable = TRANSIENT_RETRYABLE } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return op();
    } catch (e) {
      const code = e && e.code;
      if (!retryable.has(code) || attempt >= backoffMs.length) throw e;
      sleepSync(backoffMs[attempt]);
    }
  }
}

/**
 * `renameSync` with a BOUNDED retry on transient contention (E1).
 *
 * MEASURED (2026-09-22): two processes renaming onto ONE destination on
 * Windows is not atomic — 4 processes x 150 publishes lost 7-14% of renames
 * to EPERM with a serialized control at 0/1800, and the shipped path was
 * reached at ~1-in-120 real runs (`EPERM at paths.mjs:141 <- run.mjs:118`).
 * The destination is held only for the microseconds of the winning process's
 * own rename, so a short backoff clears it.
 *
 * WHY A RETRY AND NOT unlink-then-rename: every attempt is still one atomic
 * rename, so a reader sees the old file or the new file and NEVER a missing
 * one. Unlink-first would open a window with no destination at all — weaker
 * crash-safety to fix a liveness bug, which is the wrong trade for a journal.
 */
function renameWithRetry(tmp, p) {
  return retryTransientSync(() => renameSync(tmp, p));
}

export function writeTextAtomic(p, text) {
  ensureDir(dirname(p));
  const tmp = `${p}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    writeFileSync(tmp, text, 'utf-8');
    renameWithRetry(tmp, p);
  } catch (e) {
    try { rmSync(tmp, { force: true }); } catch { /* best effort */ }
    throw e;
  }
  return Buffer.byteLength(text, 'utf-8');
}

export function writeJsonAtomic(p, obj) {
  return writeTextAtomic(p, `${JSON.stringify(obj, null, 2)}\n`);
```

---
### A2 - render.mjs: nextGeneration (the E2 fix, both halves)

(source: `scripts/creator-brains/lib/render.mjs` lines 73-90 of 196; sha256[0:16]=`fe5e37808f699be3`)

```js
function nextGeneration(dir) {
  // E2 (2026-09-22), TWO load-bearing halves:
  //   1. the filter was /^gen-\d{4}$/, which made gen-10000 INVISIBLE — three
  //      publishes at the boundary yielded one distinct generation;
  //   2. `listDir().sort()` LEXICOGRAPHS: 'gen-10000' < 'gen-9999'. Stage 1
  //      alone still returned gen-10000 forever — measured by running the E2
  //      gate between the two stages, not reasoned. Both halves, or none.
  const existing = listDir(dir).filter((n) => /^gen-\d{4,}$/.test(n))
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
  const last = existing.length ? Number(existing[existing.length - 1].slice(4)) : 0;
  return `gen-${String(last + 1).padStart(4, '0')}`;
}

/**
 * Render, validate and publish one brain generation.
 *
 * @param brain    the object `buildBrain` produced
 * @param sources  raw transcript texts it was derived from — the corpus the
```

---
### A3 - lock.mjs: atomic reclaim (P1c) and the release retry

(source: `scripts/creator-brains/lib/lock.mjs` lines 138-190 of 224; sha256[0:16]=`ac9a886c28d4282b`)

```js
      //   is the exact failure this file exists to prevent, and its comment
      //   asserted the opposite.
      //
      //   A token re-read before unlink narrows it and does not close it — it is
      //   still read-then-act. The atomic step available here is `renameSync`:
      //   rename the corpse to a private name. Exactly one reclaimer can win it,
      //   because the rename fails ENOENT for everyone else. The winner then
      //   creates the lock; the losers fall through to a fresh read instead of
      //   assuming the path is free.
      const corpse = `${lockPath(r)}.reclaim.${process.pid}.${randomUUID().slice(0, 8)}`;
      try {
        renameSync(lockPath(r), corpse);
      } catch {
        // Someone else reclaimed it first. Do NOT attempt() from a stale
        // observation — re-read and let the next caller see the real state.
        return { ok: false, reason: 'lock_raced', holder: readLock(r) };
      }
      // We own the corpse. Remove it; failure here leaks a temp file, never a lock.
      try { unlinkSync(corpse); } catch { /* leaked corpse is harmless */ }
      try { attempt(); } catch { return { ok: false, reason: 'lock_raced', holder: readLock(r) }; }
    }
  }

  let released = false;
  return {
    ok: true,
    token,
    holder: { pid: process.pid, host: hostname(), runId },
    release() {
      if (released) return false;
      released = true;
      // Only remove OUR lock. A reclaim by another process would have written a
      // new body, and deleting that would hand the store to a third writer.
      const cur = readLock(r);
      if (cur && !cur.ambiguous && cur.token !== token) return false;
      // A TRANSIENT unlink failure (Windows: a concurrent readLock holding the
      // file open) would strand a live-looking lock under THIS pid — every later
      // run refused until the process exits. Same E1 class as the rename
      // publish: retry the transient codes through the shared policy, then
      // report honestly (false = the lock is still there).
      try {
        return retryTransientSync(() => { unlinkSync(lockPath(r)); return true; });
      } catch { return false; }
    },
  };
}

/**
 * Run `fn` under the lock, releasing on every exit path including a throw.
 * `onBusy` decides what a second writer does: by default it refuses rather than
 * waiting, because a scheduled run queueing behind a manual run is how a store
 * gets two writers "safely" and a stale in-memory map.
 */
```

---
### A4 - run.mjs: the step-0 journal open (the captured EPERM site)

(source: `scripts/creator-brains/lib/run.mjs` lines 108-132 of 272; sha256[0:16]=`cf52aff3fb01b388`)

```js
  record.selection = onlyCreators || null;
  record.config = {
    maxMinutes: config.maxMinutes, maxOps: config.maxOps, noTrackHours: config.noTrackHours,
  };

  // ── 0. JOURNAL, BEFORE ANYTHING CAN FAIL (HR16) ───────────────────────────
  //   Keep what this open displaces. A run that is refused by the lock has
  //   already erased a finished foreign entry — deliberately replaceable, see
  //   O2 — and the refusal path is the only place that knows to put it back
  //   (round 3, D8). Null when there was nothing prior to displace.
  const opened = writeRunJournal(r, {
    runId,
    startedAt: record.startedAt,
    pid: process.pid,
    selection: onlyCreators || null,
    phases: only || 'all',
  });
  const displaced = opened ? opened.displaced : null;

  const phase = async (name, fn) => {
    const t0 = tick();
    let ok = true; let reason = null; let counts = {};
    try {
      const out = await fn();
      ok = out ? out.ok !== false : true;
```

---
### B1 - TEST: retry-transient.test.mjs (the shared policy gate, full)

(source: `scripts/creator-brains/test/retry-transient.test.mjs` lines 1-60 of 61; sha256[0:16]=`12ec927f30c93797`)

```js
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/retry-transient.test.mjs
 * PURPOSE: The shared transient-retry policy (E1's helper) — now used by BOTH
 *          the rename publish and the lock release, so it gets its own gate.
 * PART OF: Creator Brains — SS-PT acquisition engine (additive)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * WHY A GATE FOR A 10-LINE HELPER: two production sites read it (paths.mjs's
 * `renameWithRetry`, lock.mjs's release unlink). The properties are the ones
 * that keep the retry from becoming a lie:
 *
 *   1. TRANSIENT codes are retried and a later success is returned;
 *   2. NON-transient codes surface IMMEDIATELY (no 92 ms mask on ENOENT);
 *   3. the budget is BOUNDED — a permanently-failing transient still throws
 *      after the backoff schedule, so "retry" can never mean "hang".
 *
 * RUN: node --test scripts/creator-brains/test/retry-transient.test.mjs
 * @module creator-brains/test/retry-transient
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { retryTransientSync, sleepSync } from '../lib/paths.mjs';

const eperm = () => { const e = new Error('transient'); e.code = 'EPERM'; return e; };
const enoent = () => { const e = new Error('gone'); e.code = 'ENOENT'; return e; };

test('E1 helper: a transient failure is retried and the eventual success is returned', () => {
  let calls = 0;
  const out = retryTransientSync(() => {
    calls += 1;
    if (calls < 3) throw eperm();
    return 'published';
  }, { backoffMs: [0, 0, 0] }); // zero sleeps: the scheduling is not under test
  assert.equal(out, 'published');
  assert.equal(calls, 3, 'two transients then success — exactly three attempts');
});

test('E1 helper: a NON-transient error surfaces on the first attempt — no masked ENOENT', () => {
  let calls = 0;
  assert.throws(() => retryTransientSync(() => { calls += 1; throw enoent(); }, { backoffMs: [0, 0] }), /gone/);
  assert.equal(calls, 1, 'ENOENT is a real error; waiting cannot make it succeed');
});

test('E1 helper: the budget is BOUNDED — a permanent transient throws after the schedule', () => {
  let calls = 0;
  assert.throws(() => retryTransientSync(() => { calls += 1; throw eperm(); }, { backoffMs: [0, 0] }), /transient/);
  assert.equal(calls, 3, 'initial attempt + one per backoff entry, then it gives up honestly');
});

test('E1 helper: sleepSync actually waits (the backoff is not a no-op)', () => {
  const t0 = process.hrtime.bigint();
  sleepSync(12);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms >= 8, `expected >= ~12ms park (>=8 tolerant), slept ${ms.toFixed(1)}ms`);
});
```

---
### B2 - TEST: the E1 wiring gate inside atomic-rename-contention.test.mjs

(source: `scripts/creator-brains/test/atomic-rename-contention.test.mjs` lines 182-218 of 275; sha256[0:16]=`57cb10e69aae988a`)

```js
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
```

---
### B3 - TEST: the E2 gate inside publication.test.mjs

(source: `scripts/creator-brains/test/publication.test.mjs` lines 100-135 of 132; sha256[0:16]=`b0769607d97d8c79`)

```js
  }
});

// ── E2: the generation counter must survive its own success ─────────────────

test('E2 generation numbering crosses five digits: gen-9999 + gen-10000 -> gen-10001, and no publish reuses a directory', async () => {
  const r = await seededStore('e2');
  const { mkdirSync } = await import('node:fs');
  // Plant the state three publishes at gen-10000 leave behind. `nextGeneration`
  // must SEE a five-digit directory (`render.mjs` used to filter `/^gen-\d{4}$/`
  // so it was invisible) and must ORDER it numerically (`listDir().sort()` is
  // lexicographic: 'gen-10000' < 'gen-9999', so a widened regex ALONE still
  // returns gen-10000 forever — both halves are load-bearing).
  const base = join(paths(r).brainsDir, A);
  mkdirSync(join(base, 'gen-9999'), { recursive: true });
  mkdirSync(join(base, 'gen-10000'), { recursive: true });
  const { valid } = listDocsChecked(r, A);
  const brain = buildBrain({ channelId: A, title: 'Alpha' }, { docs: valid });
  const sources = valid.map((d) => d.text);

  const g1 = publishBrain(brain, { r, sources, now: makeClock() });
  const g2 = publishBrain(brain, { r, sources, now: makeClock() });

  assert.equal(g1.generation, 'gen-10001',
    `first publish after the boundary names the next free generation, got '${g1.generation}' (E2: five-digit directories were invisible to nextGeneration)`);
  assert.equal(g2.generation, 'gen-10002',
    `second publish must not reuse a directory, got '${g2.generation}'`);
  assert.notEqual(g1.generation, g2.generation,
    'consecutive publishes must yield distinct generations — collapsing them is the E2 measured failure ("1 distinct generation of 3 publishes")');
});



```

---
### B4 - TEST: lock-reclaim-race.test.mjs (the P1c two-reclaimer gate, first 70 lines)

(source: `scripts/creator-brains/test/lock-reclaim-race.test.mjs` lines 1-70 of 162; sha256[0:16]=`0888ad7ac283e475`)

```js
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/lock-reclaim-race.test.mjs
 * PURPOSE: Two REAL reclaimers racing on one dead owner's lock — exactly one
 *          may end up holding the store (Astra round 1, P1c).
 * PART OF: Creator Brains — SS-PT acquisition engine
 * ADDED: 2026-09-21 | SPLIT from concurrency.test.mjs 2026-09-21 (rule 4)
 * ============================================================================
 *
 * WHY THIS IS ITS OWN FILE (and not another case in concurrency.test.mjs):
 *
 *   It is the only case in this family that needs a BARRIER. Every other
 *   concurrency case can be satisfied by starting two processes and letting the
 *   scheduler do what it does; this one is about a window that closes in
 *   microseconds, so both children are held until each has taken its stale read.
 *   That is a different test technique from its neighbours, and it pushed the
 *   parent file over rule 4's 300-line cap — so it moved rather than the cap
 *   moving. `concurrency.test.mjs` keeps the HR14 family; this file owns the race.
 *
 * THE DEFECT IT PINS (measured, not argued):
 *
 *   Reclaiming a dead owner's lock used to be `readLock` → `unlinkSync`. The
 *   comment on that unlink called losing the race benign — "someone else got
 *   there". It was not. Two reclaimers that both read the SAME dead holder could
 *   both delete: B unlinks the corpse and acquires, then A unlinks **B's LIVE
 *   lock** using its stale observation and acquires too. Two holders on one
 *   store — the exact failure the lock exists to prevent.
 *
 *   Measured against the unlink implementation, this test caught it as
 *   `[{"who":"A","ok":true},{"who":"B","ok":true}]` — both holding. Against the
 *   rename fix it is 10 of 10 green. The fix has exactly one winner per race
 *   because `renameSync` fails ENOENT for everyone but the winner.
 *
 * RUN: node --test scripts/creator-brains/test/lock-reclaim-race.test.mjs
 * @module creator-brains/test/lock-reclaim-race
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { tempRoot } from './helpers.mjs';
import { ensureStore } from '../lib/store.mjs';
import { lockStatus } from '../lib/lock.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));
const LOCK_URL = JSON.stringify(pathToFileURL(join(LIB, 'lock.mjs')).href);

/** A minimal store. This test is about the LOCK, so the seeded content is irrelevant. */
function seedStore(tag) {
  const r = tempRoot(`cb-${tag}`);
  ensureStore(r);
  return r;
}

/** Run a snippet in a real child process; the file is written so quoting is not under test. */
function runChild(source, { env = {}, timeoutMs = 30_000 } = {}) {
  const dir = tempRoot('cb-child');
  const file = join(dir, 'child.mjs');
  writeFileSync(file, source, 'utf-8');
  try {
    const stdout = execFileSync(process.execPath, [file], {
      encoding: 'utf-8',
      timeout: timeoutMs,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
```

---
### C1 - DOC: 19-s5-exit-evidence.md header + the T-E3 retraction and its replacement

(source: `docs/ai-workflow/blueprints/creator-brains-console-20260917/19-s5-exit-evidence.md` lines 1-52 of 268; sha256[0:16]=`8adcfe95c0b0af29`)

```js
# S5 exit evidence — BrainConstellation (CD3 "Vault Observatory")

**Date:** 2026-09-22 · **Slice:** S5 · **Depends on:** S2 (roster = accessible equal) · **Status:** ✅ **4 of 4 exit criteria now have evidence — T-E3 re-measured in a real browser (§4), both required mutations killed; closure awaits Sean's word**

The slice table (`08-slices-operations.md:12`) states S5's exit gate verbatim:

> **T-T1/T-T2/T-W7 green; T-E3 budget measured; Sean has seen it (ideation follow-through)**

Each clause is answered below with a command that reproduces it. Nothing here is
asserted from memory.

> ⚠️ **Correction, 2026-09-22 (later the same day).** The header here read *"all
> four exit criteria discharged"* until the T-E3 budget was re-verified against
> shipped source and found to measure a local arithmetic loop rather than a
> renderer frame. **T-E3 is withdrawn — see §4.** T-T1, T-T2, T-W7 and the render
> stand. S5's gate is therefore **not** fully discharged, and the honest count is
> **3 of 4**. The follow-up is named in §4.
>
> ✅ **Resolved the same evening.** §4 now carries a REAL in-browser measurement
> — built chunk, real WebGL, 40 nodes, observable pixel output, and both of the
> mutations `2026-09-22-140126` D1 required (slow frame → red, empty renderer →
> red) executed and killed. The count above returns to **4 of 4 with evidence**;
> flipping the slice to CLOSED is Sean's word, not this document's.

---

## 1. T-T1 — `layoutBrains` is pure and data-driven · **GREEN 14/14**

> `06-test-plan.md` T-T1: *"`layoutBrains(brains)` pure: same input → same
> positions/sizes/colors; size ∝ videos, arc ∝ coverage, color per state map"*

```
npx vitest run src/components/constellation-layout.test.ts   →  14 passed
```

The determinism clause is the one with teeth, and it is tested in the stronger
form: **same positions when the input array ORDER differs**. A layout keyed on
arrival order would reshuffle the sky on every poll, and that failure is
invisible in a single screenshot because both frames look deliberate.

Two encodings are tested for the *absent* case, not just the present one: a null
`videos` maps to the size floor (never silently a maximum), and `ratio()` returns
**`null`** for an unmeasurable coverage — distinct from `0`, because `S1-H9`
requires an untakeable count be rendered as absent rather than as "fetched
nothing".

## 2. T-T2 — loop lifecycle and clean teardown · **GREEN 8/8**

> `06-test-plan.md` T-T2: *"rAF controller: `document.hidden` → loop stops ≤1
> frame; off-viewport (IntersectionObserver stub) → stops; remount → clean
> teardown (no leaked context)"*

```

---
### C2 - BENCH: frame-bench.mjs, the T-E3 gate-field contract (its own header)

(source: `packages/creator-brains-console/web/bench/frame-bench.mjs` lines 1-45 of 183; sha256[0:16]=`89ba2dda30b52668`)

```js
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/web/bench/frame-bench.mjs
 * PURPOSE: T-E3's missing measurement — prepare a real-browser frame benchmark
 *          against the BUILT constellation chunk (40 nodes, real WebGL).
 * PART OF: Creator Brains — S5 / T-E3 (adjudication of Astra 140126 D1)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * WHY THIS EXISTS. The budget gate (`constellation-budget.test.ts`) times a local
 * arithmetic loop — retracted as T-E3 evidence (19 §4). Astra's fix demanded
 * "benchmark the actual scene frame in a browser with WebGL and 40 nodes;
 * require observable rendered output so an empty renderer fails; demonstrate by
 * mutation that an injected slow frame fails the timing guard." jsdom cannot do
 * any of that, so the measurement runs against `vite build` output in a real
 * Chromium driven by agent-browser.
 *
 * THE HASH PROBLEM, AND WHY THIS SCRIPT EXISTS. The lazy chunk's filename is
 * content-hashed (`constellation-three-<hash>.js`), so a hand-written bench page
 * cannot name it. This script locates the chunk in `dist/assets` and REWRITES
 * `dist/frame-bench.html` with the current hash — the page is generated, never
 * checked in stale.
 *
 * RUN:
 *   1. node bench/frame-bench.mjs --prepare     (after `vite build`)
 *   2. npx vite preview --port 4179             (serves dist/)
 *   3. agent-browser open http://127.0.0.1:4179/frame-bench.html
 *      agent-browser snapshot                   → look for `T_E3_RESULT {…}`
 *      agent-browser close
 *
 * The page prints ONE line: `T_E3_RESULT {json}` — machine-parseable, and the
 * snapshot shows it without any eval capability. Gate fields:
 *   drawn      — readPixels after warm frames is non-zero (empty renderer fails)
 *   medianMs   — median of 120 `scene.frame()` samples, ceiling 16.7
 *   renderer   — gl.RENDERER string, so a SwiftShader run NAMES itself
 *   pass       — drawn && medianMs <= 16.7
 *
 * @module creator-brains-console/web/bench/frame-bench
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const mode = process.argv[2] || '--prepare';
if (mode !== '--prepare') {
```

---
### C3 - BENCH: frame-bench.mjs, the sampling and the pass predicate as implemented

(source: `packages/creator-brains-console/web/bench/frame-bench.mjs` lines 135-178 of 183; sha256[0:16]=`89ba2dda30b52668`)

```js
        ${fixture}
        const canvas = document.getElementById('c');
        const scene = mod.createScene(canvas, { entryDolly: false });
        scene.update(NODES);
        scene.resize(800, 600);

        // Warm frames, then a readPixels FORCES GPU completion so the drawn
        // check is a fact about finished work, not about queueing.
        scene.frame(16); scene.frame(16); scene.frame(16);
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const px = new Uint8Array(4);
        gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const drawn = px[0] + px[1] + px[2] > 0;

        const samples = [];
        for (let i = 0; i < ${FRAMES}; i += 1) {
          const t0 = performance.now();
          scene.frame(16);
          samples.push(performance.now() - t0);
        }
        gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // flush tail

        samples.sort((a, b) => a - b);
        const medianMs = samples[Math.floor(samples.length / 2)];
        const p95 = samples[Math.floor(samples.length * 0.95)];
        emit({
          nodes: ${NODE_COUNT},
          frames: ${FRAMES},
          drawn,
          centerPixel: Array.from(px),
          medianMs: Number(medianMs.toFixed(3)),
          p95Ms: Number(p95.toFixed(3)),
          maxMs: Number(samples[samples.length - 1].toFixed(3)),
          ceiling: ${CEILING_MS},
          renderer: gl.getParameter(gl.RENDERER),
          method: 'cpu submit time per scene.frame(); gpu completion forced via readPixels after warm-up and after the timed loop',
          pass: drawn && medianMs <= ${CEILING_MS},
        });
        scene.dispose();
      } catch (e) {
        emit({ error: String(e && e.message || e), pass: false });
      }
    </script>
  </body>
```

---
### D - MEASURED FACTS (all re-measured this round, on this machine)

- Windows, Node v22.22.2. The engine suite must be invoked as
  ```node --test "scripts/creator-brains/test/*.test.mjs"```
  (the DIRECTORY form does not discover tests on this Node: it exits 1 with
  MODULE_NOT_FOUND, which reads like a catastrophic suite failure and is not one).
- E1 primitive (raw renameSync, 4 children x 150 onto ONE destination): **60/600 EPERM**;
  serialized control: **0/1800**. Shipped path captured earlier at ~1-in-120
  (EPERM at paths.mjs:141 <- writeRunJournal <- runDaily run.mjs:118).
- MUTATIONS, applied one at a time, sequentially:
  - E1: renameWithRetry reverted to plain renameSync -> RED on
    "P0 E1: writeTextAtomic survives four processes publishing onto ONE destination".
    Restored, green. So the E1 wiring IS pinned, by the test in excerpt B2.
  - E2 half 2 (ordering): numeric sort reverted to lexicographic .sort() -> RED on
    "E2 generation numbering crosses five digits". Restored, green. Half 2 IS pinned.
  - E2 half 1 (the widened regex): re-narrowed to /^gen-\d{4}$/ while keeping the numeric
    sort -> RED on the same test, and for the RIGHT reason: the assertion message reads
    "first publish after the boundary names the next free generation, got 'gen-10000'
    (E2: five-digit directories were invisible to nextGeneration)". Two earlier attempts
    failed at the harness layer (a shell-mangled pattern, then a scratch copy whose
    relative import escaped the copied tree) and were discarded, not counted.
    => BOTH halves of the E2 fix are pinned by one test.
- Rule 4 (hard 300-line cap, tests included): **PASS** - oauth.mjs and tier.test.mjs are
  both EXACTLY 300. An earlier sweep of mine reported 301 for both, because
  split(newline).length counts the element AFTER a trailing newline. wc -l (newline count)
  is the canonical counter; my instrument was wrong, not the files.
- Console 346/346 (61 files) · web 145/145 (15 files, vitest) · tsc --noEmit clean.
- The console never calls writeJsonAtomic/writeTextAtomic directly, and
  no-engine-import.test.ts bans engine imports through static, re-export, export-star and
  concatenated-literal forms.

---
### E - MY OWN OPEN QUESTIONS (framed as questions, not asserted contradictions)

1. lock.mjs: is the BARE catch around renameSync(lockPath, corpse) (around line 150 of
   excerpt A3) a misclassification? The comment at release() says explicitly that a
   concurrent readLock holding the file open can cause a transient fs failure, and that is
   why release() retries through retryTransientSync. The reclaim rename sits ~40 lines
   above and maps EVERY failure - including a transient EPERM - to "someone else reclaimed
   first" -> reason lock_raced. Is that a real (fail-safe but false) refusal under the same
   contention E1 measured, or is rename-onto-an-absent-target immune where unlink is not?
   Which is it on Windows? Answer the mechanism, not the style.
2. Is the release() retry WIRING pinned anywhere? I could find no test that makes release()
   throw a transient and then asserts it retried. retry-transient.test.mjs (B1) tests the
   HELPER only, so a regression that drops retryTransientSync from release() might stay green.
   Is that gap real? If so, what is the minimal test that would pin it?
3. EACCES is in TRANSIENT_RETRYABLE (A1, line ~151). retry-transient.test.mjs asserts
   "NON-transient codes surface IMMEDIATELY (no 92 ms mask on ENOENT)". A PERMANENT EACCES
   (ACL denial, read-only attribute) is therefore delayed ~92 ms and then rethrown. Bounded
   and honest - but is classing EACCES as transient correct, or does it mask a real
   permission error behind a policy documented as "the target is momentarily held by another
   process"? What is the concrete failure, if any?
4. sleepSync uses Atomics.wait on the MAIN THREAD - up to ~92 ms of blocked event loop per
   contended publish, and writeJsonAtomic has 30+ call sites. I found no such call inside
   the console HTTP handlers (the console does not import the engine), so my working view is
   "engine-process latency only, not console request latency". Is that right, or is there a
   path I missed? If right, is the trade acceptable for a long-running CLI run?
5. S5 / T-E3, which MOVED while this packet was being assembled - treat this as the
   current state, not as background. The budget claim (median 0.0036 ms) was RETRACTED
   midday because it timed a local arithmetic loop rather than a frame. This evening the
   same document was updated: the retraction is kept as history, and section 4 now claims
   a REPLACEMENT measurement in a real browser - a built chunk served by vite preview,
   drawn:true via readPixels of a known centre pixel, median 0.1 ms over 120 frames at 40
   nodes, and BOTH required mutations executed and killed (25 ms busy-wait -> median 25.2
   ms pass:false; renderer.render commented out -> drawn:false pass:false). The bench is
   web/bench/frame-bench.mjs and the guards read: pass = drawn && medianMs <= 16.7.
   Questions: (a) does that actually discharge "frame samples <= 16.7 ms median with 40
   nodes", or is it still measuring the wrong quantity? The bench itself discloses that
   the samples are CPU submit time for scene.frame(), with GPU completion forced only at
   TWO readPixels points rather than per frame - so a slow raster tail would not appear.
   Is that disclosure a fatal gap for the clause, or an acceptable basis? (b) Is
   pass = drawn && medianMs <= 16.7 a VACUOUS guard - can either conjunct fail to fail
   when it should? (c) The slices table and the document now both say 4 of 4 with closure
   "awaiting Sean word", while an earlier committed closure declared S5 done without
   mentioning T-E3. Is there a third reading that resolves all three artifacts?
6. Anything in these excerpts that is WRONG, VACUOUS, or UNPINNED and that I have not
   thought to ask about. That is where I most want your eyes.

---
### F - WHAT I AM NOT ASKING YOU TO DO

- Do NOT explore the repository. Do NOT read files, list directories, or run shell commands.
  A read-only sandbox is EXPECTED here and is not a blocker: the caller saves the reply and
  files the review, so please do not report that you cannot write anywhere.
- Everything needed is in this packet. Search is unavailable by design, which is an
  environmental fact rather than a fault. If a fact is genuinely absent, mark it
  UNVERIFIED - that is a correct answer, not a failure.
- This is defensive engineering material: a filesystem-atomicity and lock-contention review
  of the operator own repository. Nothing here is an exploit, there is no third-party
  target, and the contention harnesses exist so the guards fail loudly under load.

Nothing below was removed or softened to obtain passage. Every excerpt is quoted verbatim
from the working tree at the hash shown above its fence.

