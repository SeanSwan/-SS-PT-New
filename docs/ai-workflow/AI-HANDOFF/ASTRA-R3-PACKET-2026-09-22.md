# HOSTILE REVIEW PACKET (ROUND 3) - Creator Brains: my fixes to your nine findings, and the run-dry question

**Reviewer seat:** gpt-6-astra (ChatGPT/Codex subscription transport) · **Mode:** hostile review · **Date:** 2026-09-22
**Repo:** SS-PT, branch `creator-brains-engine-r2-20260915`, HEAD `b1ab001bd`.
**Scope:** the changes quoted below, UNCOMMITTED in the working tree.
**Series:** round 1 (9 findings) -> round 2 (9 findings, all adjudicated) -> **this round**, which
fixes every one of yours that lives in my lane and asks whether anything remains.

---
### A1 - FIXED (your #8): contention gate now asserts PER-RACER shares, not just totals

(source: `scripts/creator-brains/test/atomic-rename-contention.test.mjs` lines 194-220 of 294; sha256[0:16]=`7589bfbec60b65c2`)

```js
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
```

---
### A2 - FIXED (your #2 and #3): reader-watch with child control, overlap proof, death causes, ENOENT split

(source: `scripts/creator-brains/test/atomic-rename-reader-watch.test.mjs` lines 175-262 of 263; sha256[0:16]=`a50fe23e42f1317d`)

```js
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

    // Non-vacuity, and (Astra R2 #2) PROOF OF OVERLAP: a complete record must have
    // been observed while a child was still running. Without this, a watcher that
    // read INIT, missed the whole publish window and read the final record after
    // every child had closed would pass while holes existed underneath it.
    assert.ok(seen.some((s) => COMPLETE.test(s)),
      'no complete racer record was ever observed — the reader never saw a real publication, '
      + `so "0 missing / 0 torn" would prove nothing. observations=${seen.length}`);
    assert.ok(duringPublish > 0,
      'no observation was credited WHILE children were running — the watcher did not demonstrably '
      + 'overlap active publication, so this run cannot speak to reader atomicity. Re-run; if it '
      + 'persists, the watcher is being starved (see rule 1) and the fixture is inconclusive.');

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
```

---
### A3 - FIXED (your #4 and #5): wiring gate now asserts NESTING, and E4 became a skipped pending regression

(source: `scripts/creator-brains/test/lock-release-wiring.test.mjs` lines 1-160 of 161; sha256[0:16]=`8a23e83417876eea`)

```js
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/lock-release-wiring.test.mjs
 * PURPOSE: Pin the WIRING that carries E1's retry policy into `release()` —
 *          the one consumer `retry-transient.test.mjs` does not reach.
 * PART OF: Creator Brains — SS-PT acquisition engine (additive)
 * ADDED: 2026-09-22 (Astra R1 finding 2, adjudicated CONFIRMED)
 * ============================================================================
 *
 * THE GAP, MEASURED. `retry-transient.test.mjs` drives the HELPER directly and
 * never calls `release()`. Removing `retryTransientSync` from `lock.mjs:179`
 * therefore leaves every existing test green — Astra R1 marked that
 * `[VERIFIED]`, and I re-confirmed it by grepping every test for
 * `retryTransientSync` / `EPERM`: the only hits are the helper's own file and
 * the two atomic-rename probes, neither of which touches `lock.mjs`.
 *
 * WHY THIS IS A SOURCE-SHAPE GATE AND NOT A BEHAVIOURAL ONE.
 *
 *   A behavioural test needs a deterministic transient `unlinkSync` failure. I
 *   probed BOTH natural candidates on this machine rather than assuming one, and
 *   **both failed to produce a failure at all**:
 *
 *     read-only target (chmod 0444) → unlinkSync returned NO_THROW, file gone;
 *                                       the retry then saw ENOENT on attempt 1
 *                                       (0.4 ms — no policy engagement).
 *     target held by an OPEN fd      → unlinkSync returned NO_THROW, file gone
 *                                       (Node opens with share-delete semantics
 *                                       on Windows), 0.5 ms.
 *
 *   So on Windows there is no natural way to make an ordinary unlink fail
 *   transiently from a test, and an engine-side fs seam would be required to
 *   inject one. That seam does not exist and adding it is an ENGINE change —
 *   outside this lane (additive-only). The honest instrument available to a
 *   test-only lane is therefore the source shape: assert the call site wires the
 *   shared policy in. Weaker than behaviour, but it does exactly the job that
 *   matters here — removing the wrapper turns this gate RED.
 *
 *   This is the same family as `no-engine-import.test.ts`, which asserts over
 *   source because the alternative cannot be driven from a test process.
 *
 * ALSO PINNED HERE (Astra R1, second defect): `released = true` is assigned
 * BEFORE the deletion attempt (`lock.mjs:167-168` vs the unlink at `:179`), so
 * once a release FAILS its budget every later call short-circuits at `:167` and
 * the handle can never release the lock it still owns. That is an ENGINE defect
 * and is NOT fixed here — it is filed for the owner in
 * `.ai-workflow/coordination/ENGINE-HANDOFF-two-data-loss-paths-2026-09-22.md`.
 * This gate only asserts the current shape so a future fix is visible as a
 * deliberate edit rather than an accident.
 *
 * RUN: node --test scripts/creator-brains/test/lock-release-wiring.test.mjs
 * @module creator-brains/test/lock-release-wiring
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const LOCK = join(HERE, '..', 'lib', 'lock.mjs');
const PATHS = join(HERE, '..', 'lib', 'paths.mjs');

/**
 * E4 pending flag. A non-empty string SKIPS the pending regression with that
 * reason (so the suite stays green while the engine defect is unfixed and E4
 * remains visibly unresolved rather than hidden); `null` runs it.
 *
 * Set to `null` once the engine owner lands E4 (`released = true` moved after a
 * successful delete). Until then this documents the DESIRED behaviour, per
 * Astra R2 (#5) — it must not assert the current defective order instead.
 */
const SKIP_E4 = 'engine defect E4 unfixed (released set before deletion, lock.mjs:168 vs :179) — filed in ENGINE-HANDOFF; set SKIP_E4 = null when fixed';

/** The body of `release()` — from its declaration to the next top-level export so a
 *  future edit that grows the file cannot silently widen the window this asserts over.
 *
 *  The anchor is `release() {` (with the brace), NOT `release()`: the bare form first
 *  occurs in this file's own JSDoc (`* Returns { ok: true, token, release() }`, line 90),
 *  which starts the window inside `acquireLock` and makes the first `unlinkSync(` the
 *  RECLAIM corpse unlink rather than the release one — so `released = true` then reads as
 *  if it came after the deletion and this gate reports the strand defect as "fixed".
 *  Measured 2026-09-22; the code was correct and the anchor was not. */
function releaseBody(src) {
  const start = src.indexOf('release() {');
  assert.ok(start !== -1, 'release() is gone or renamed — this gate must be re-scoped, not loosened');
  const end = src.indexOf('\nexport async function withLock', start);
  assert.ok(end > start, 'the withLock anchor moved — the release() window could not be bounded');
  return src.slice(start, end);
}

test('E1 wiring: the unlink EXECUTES INSIDE the retry callback (structural)', () => {
  const src = readFileSync(LOCK, 'utf-8');
  const body = releaseBody(src);

  // Astra R2 (#4) showed two INDEPENDENT matches do not prove nesting: this
  // replacement satisfies a "call retry" and a "call unlink" check while
  // retrying nothing at all:
  //     retryTransientSync(() => true);
  //     unlinkSync(lockPath(r));
  // So assert the STRUCTURE: an unlink appears inside the arrow body handed to
  // retryTransientSync. Comments are stripped first so prose cannot supply the
  // unlink, and the callback is located by its call site rather than by both
  // names merely occurring somewhere in the function.
  const executable = body
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
  const callAt = executable.indexOf('retryTransientSync(');
  assert.ok(callAt !== -1,
    'release() no longer routes its unlink through retryTransientSync — the E1 retry has been '
    + 'dropped from this consumer. Its own tests would stay green; this gate is what notices.');
  const open = executable.indexOf('(', callAt);
  let depth = 0;
  let close = -1;
  for (let i = open; i < executable.length; i += 1) {
    if (executable[i] === '(') depth += 1;
    else if (executable[i] === ')') { depth -= 1; if (depth === 0) { close = i; break; } }
  }
  assert.ok(close > open, 'could not bound the retryTransientSync call — re-scope this gate');
  const callback = executable.slice(open + 1, close);
  assert.match(callback, /unlinkSync\(/,
    'the deletion is no longer INSIDE the retry callback — a bare `retryTransientSync(() => true)` '
    + 'followed by `unlinkSync(...)` would satisfy any check that only looks for both calls, and '
    + 'that is precisely what this assertion exists to reject: ' + callback.trim().slice(0, 200));

  const pathsSrc = readFileSync(PATHS, 'utf-8');
  assert.match(pathsSrc, /export function retryTransientSync/,
    'paths.mjs no longer exports retryTransientSync — the shared policy has moved or been renamed');

  const importLine = src.split(/\r?\n/).find((l) => l.includes('retryTransientSync'));
  assert.ok(importLine && importLine.includes('from \'./paths.mjs\''),
    'lock.mjs must import the policy from paths.mjs so both consumers read ONE definition');
});

test('E4 PENDING: a failed release stays retryable through the SAME handle', { skip: SKIP_E4 },
  async () => {
    // Desired behaviour for E4 (filed in ENGINE-HANDOFF: `released = true` is set
    // BEFORE the deletion at lock.mjs:168 vs :179, so a budget-exhausted release
    // returns false and every later call short-circuits at :167 — the handle can
    // never release the lock it still owns).
    //
    // Written as the DESIRED assertion and SKIPPED until the engine owner lands the
    // fix, per Astra R2 (#5): an earlier version asserted the CURRENT (defective)
    // order instead, which makes the gate REQUIRE the defect to stay green and
    // cannot count as a correctness gate for E4. Asserting the corrected order
    // today would be a genuine RED — so the honest shape is a pending regression,
    // not a green gate over broken code. Set SKIP_E4 = null when E4 is fixed.
    //
    // This test cannot be driven here without an injection seam (see the file
    // header), so it asserts the reachable contract: after a release that reports
    // false, a later release through the same handle must still attempt deletion.
    const src = readFileSync(LOCK, 'utf-8');
    const body = releaseBody(src);
    const setReleased = body.indexOf('released = true');
    const doUnlink = body.indexOf('unlinkSync(');
    assert.ok(setReleased > doUnlink,
      'released must be assigned only AFTER a successful delete, so a failed release remains '
      + 'retryable through the same handle (E4).');
  });
```

---
### B1 - FIXED (your #1): my E7 over-claims, corrected in place with the original left visible

(source: `.ai-workflow/coordination/ENGINE-HANDOFF-two-data-loss-paths-2026-09-22.md` lines 277-311 of 312; sha256[0:16]=`f8e14f6d641cdb69`)

```js
# CORRECTION to E7 (Astra R2 #1, adjudicated) — my mechanism and my count were both overstated

Two parts of my E7 write-up above do not survive Astra R2's scrutiny, and both are my error, not
hers. Corrected here rather than edited in place, so the original claim stays visible under it
(a correction is a claim too, and the `⚠ CORRECTED` marker is exactly what makes a WRONG
correction worse than the original mistake).

**1. "the destination stayed held longer than the budget covers" was an INFERENCE, not a
measurement.** The captured trace proves an *exhausted rename failure* at `paths.mjs:173,198`.
It does NOT prove the destination was continuously held for >92 ms — repeated collisions and
scheduling delays fit the same trace. What is established: the retry gave up after its budget and
the caller died. The *cause* of the exhaustion remains open (same class as the archive's U2 on
the Windows layer). Stated as: **exhaustion observed; continuous-hold duration NOT measured.**

**2. "240 of 480 writes completed" was wrong.** `atomic-rename-reader-watch`'s `done` sums `ok`
only from PARSED reports; a child that dies mid-run produces a parse-failure result carrying no
`ok` count — so its already-published records are not counted. **240 is a floor, not a total.**
Plausible reading: the two dead children published *some* records before dying, so actual
publications > 240. No exact figure is available from that run's data.

**3. My option list was incomplete, and option (c) was the weakest framing.** Astra R2's fourth
option is better and is the one I now recommend: **separate the deterministic retry tests
(eventual success, explicit exhaustion) from the contention stress gate**, give the stress gate a
*defined* execution environment, and report its failures separately rather than inside the
deterministic suite. Her counter to my "flaky gate" framing also stands: *an intermittent failure
exposing a real availability limit is not automatically a defective test* — `failed === 0` is a
legitimate requirement if "complete this workload" is the contract. What is actually wrong is
placing a load-dependent stress gate in the same pool as deterministic gates without separating
the two kinds of signal.

Also from the same reply, both accepted without argument: **"no natural injection exists" was
overstated** (I measured two mechanisms; that is not an impossibility proof — a native handle with
delete sharing DISABLED, and test-local substitution of `unlinkSync`, remain untried), and the
E3 reachability `[UNKNOWN]` I closed with `attempt()`'s `finally { closeSync(fd) }` stands:
no handle is retained, so nothing blocks the stale rename.
```

---
### B2 - FILED, NOT FIXED (your #9 and #5): the engine defects that remain with the owner (E3, E4, and E7 as originally written, so you can see the claim B1 corrects)

(source: `.ai-workflow/coordination/ENGINE-HANDOFF-two-data-loss-paths-2026-09-22.md` lines 144-276 of 312; sha256[0:16]=`f8e14f6d641cdb69`)

```js
## E3 — the reclaim rename can STEAL a newly-acquired lock (Astra R1 finding 1, UNDERSTATED vs my question)

**`lock.mjs:141-145` states a proof that does not hold.** The comment claims:

> "Exactly one reclaimer can win it, because the rename fails ENOENT for everyone else."

That only holds while the path stays absent. It does not, because the WINNER recreates it:

1. Reclaimers A and B both observe the same dead holder (`readLock`).
2. A: `renameSync(lock -> corpseA)` wins → then `attempt()` **creates A's live lock** at `lockPath`.
3. B: its `renameSync(lock -> corpseB)` now targets a path that **exists again** — A's live
   lock — so the rename **succeeds**, moving A's lock away.
4. B then `attempt()`s → creates its own lock → **both A and B return `ok: true`.**

Two holders: the exact failure the file exists to prevent. `renameSync` is atomic with respect
to *one* pathname transition; it does not bind B's rename to the holder B *observed*. This is a
TOCTOU on the observation, not on the rename.

**Also CONFIRMED:** `lock.mjs:150-153`'s bare `catch` maps EVERY error — including a transient
EPERM of exactly the class E1 measures — to `reason: 'lock_raced'`. Fail-safe, but it reports a
contention event as a lost race.

**Do NOT fix this by adding retries to the reclaim rename** (Astra's warning, which I agree
with): retrying a stale rename is how B deletes a *live* lock a second time. The fix needs an
identity check binding the rename to the holder that was read, or fail-closed on the stale path.
Identifier not present in the review packet → owner's design call.

**The same wrong proof is written into `lock-reclaim-race.test.mjs:33-34`**, which asserts
*"renameSync fails ENOENT for everyone but the winner"* and reports 10/10 green. The green does
not cover the ordering above (both renames are raced before either `attempt()` recreates the
path), so the test corroborates the comment rather than the behaviour. A regression test for
E3 must delay the second rename until after the first `attempt()` succeeds.

## E4 — a failed release strands the lock for good (`released` set before the deletion)

**`lock.mjs:167-168` vs `:179`.** `released = true` is assigned BEFORE the unlink:

```js
release() {
  if (released) return false;   // :167 — now permanently true
  released = true;              // :168 — set unconditionally, before any attempt
  ...
  try { return retryTransientSync(() => { unlinkSync(lockPath(r)); return true; }); }
  catch { return false; }       // :180 — budget exhausted → false, but `released` stays true
}
```

So if the ~92 ms retry budget expires, `release()` returns `false` **and every later call
returns `false` immediately at `:167`** — even after the contention that caused it has cleared.
The handle can never release the lock it still owns; every later run refuses until the process
exits. Ironically this is the failure the comment at `:173-177` was written to prevent.

**Fix shape (owner's call):** assign `released` only after a successful delete, so a failed
release stays retryable through the same handle.

**Pinned by a NEW gate** — `scripts/creator-brains/test/lock-release-wiring.test.mjs` (additive).
Test 1 asserts `release()` routes its unlink through `retryTransientSync` (removing the wrapper
now goes RED; previously nothing noticed). Test 2 asserts the CURRENT order on purpose, so the
strand fix turns it RED with a message naming the required update rather than leaving a green
gate over code that lacks the fix.

**Why that gate reads SOURCE instead of driving behaviour:** a behavioural test needs a
deterministic transient `unlinkSync` failure, and I probed both natural candidates on this
machine — **neither fails at all**:

| injection | result |
|---|---|
| target chmod `0444` | `unlinkSync` → **NO_THROW**, file gone; retry then saw `ENOENT`, 0.4 ms |
| target held by an OPEN fd | `unlinkSync` → **NO_THROW**, file gone (share-delete), 0.5 ms |

So on Windows there is no natural way to make an ordinary unlink fail transiently from a test;
an engine-side fs seam would be required, and adding one is an engine change. The source-shape
gate is the strongest instrument a test-only lane has here. This also answers Astra's `[UNKNOWN]`
on her proposed minimal wiring test.

## Also filed from the same round (console lane, NOT an engine item)

**E5 — `web/bench/frame-bench.mjs` computes `drawn` ONCE after warm-up (`:155`) and reuses it in
`pass` (`:235`).** A renderer that draws during warm-up and then does nothing across all timed
iterations still passes. The newer `sync` loop forces `readPixels` per sample (so a raster tail
cannot hide — that half is good), but it checks only TIME, never pixel content. Not fixed here:
the file was being actively rewritten by another session during this round (8095 B → 11550 B in
20 minutes), and editing it concurrently would race them. Owner/later round.

**E6 — `19-s5-exit-evidence.md` now cites a result string the bench no longer emits** (doc says
`frames: 120` with the old `method`; bench emits `frames:{cpu,sync,dolly}` with a new method
string and five guards). Doc `18:53` predates bench `19:03`. Same concurrent-writer caveat.

## E7 — E1's retry BUDGET exhausts under full-suite contention (captured, shipped path)

**The E1 fix works as designed and is still not sufficient under load.** Measured 2026-09-22,
in the full engine suite (not a synthetic harness): four real children publishing through
`writeTextAtomic` onto ONE target, **240 of 480 writes completed and two children died** with:

```
Error: EPERM: operation not permitted, rename
  '…\target.json.68828.3834a42d65d6.tmp' -> '…\target.json'
    at renameSync        (node:fs:1012:11)
    at writeTextAtomic   (paths.mjs:198:35)     ← renameWithRetry
    at retryTransientSync(paths.mjs:173:14)     ← threw: budget exhausted
```

`TRANSIENT_BACKOFF_MS = [2, 5, 10, 25, 50]` (`paths.mjs:152`) buys **6 attempts / 92 ms of
sleep** — and as Astra R1 put it, that is *not* a wall-clock ceiling: operation time and
scheduling sit on top of it. Under the suite's CPU contention the destination stayed held
longer than the budget covers, so the retry gives up honestly and the caller dies.

**Why this matters more than the rate.** Two gates now depend on it:

- `atomic-rename-contention.test.mjs:202` asserts `failed === 0` over a 4×150 run through the
  same publisher. When the budget exhausts, that assertion goes RED.
- `atomic-rename-reader-watch.test.mjs` originally asserted `done === 4*N` and died the same way
  (**240/480, both children captured**). I removed that assertion from my own gate so this file
  does not add a second load-dependent red; it now asserts reader atomicity only and prints the
  dead publishers.

So the suite carries a **load-dependent latent red**: green on an idle machine, occasionally red
under parallel load, on a *real* engine limit. The archive's own ruling on A1-06 was that "a
flaky gate is worse than a red one" — so this should be settled rather than lived with.

**Owner's options (not taken here — engine files):**
1. raise the budget / add jitter so the backoff distribution covers a held-longer destination;
2. make the *publisher* survive by falling back to a bounded wait on the destination rather than
   only on the rename;
3. accept the limit and then **weaken the gate deliberately to a stated rate** (e.g. "≤ k
   exhaustions in 600"), documented as a rate rather than as `=== 0` — a number the gate can
   actually hold under load.

Option 3 is the only one that keeps the suite honest without an engine change; but it trades a
deterministic green for a measured tolerance, and that is an operator call, not a builder's.

---

```

---
### C - YOUR ROUND-2 NINE FINDINGS: what I did with each

| # | Your finding | Verdict | Action taken |
|---|---|---|---|
| 1 | E7 confirmed NARROWLY; my duration inference and the 240 count OVERSTATED | **CONFIRMED - both were my over-claims** | corrected in B1 with the original left visible: exhaustion observed, continuous-hold duration NOT measured, 240 = a floor (dead children's completed writes carry no `ok`); adopted your FOURTH option (separate deterministic retry tests from the stress gate) over my weaker option (c) |
| 2 | A2 control can pass while the subject misses the publish window | **CONFIRMED** | control rebuilt as a CHILD (same arrangement), plus `duringPublish` now credited ONLY while children run and asserted `> 0` |
| 3 | A2 accepts unidentified deaths; ENOENT folded with other read errors; log omits done/dead | **CONFIRMED** | `code` preserved from `close`; every death must have non-empty stderr AND name EPERM; `missing` (ENOENT) split from `readErr`; log prints obs, overlap, missing/readErr/mixed, done and dead |
| 4 | A3 matches retry and unlink INDEPENDENTLY, so `retryTransientSync(() => true); unlinkSync(...)` passes | **CONFIRMED and mutation-proven** | nesting now asserted by bounding the call and looking inside its callback, comments stripped first; your exact counterexample goes RED, echoing `() => true` in the failure |
| 4b | "No natural injection exists" is OVERSTATED (two attempts, not a proof) | **CONFIRMED** | claim softened in the handoff: two mechanisms measured; a native handle with delete sharing DISABLED and test-local substitution remain untried |
| 5 | A3 test 2 encodes the defect as the required passing condition | **CONFIRMED** | replaced by `E4 PENDING` with the DESIRED assertion, SKIPPED with the reason (suite stays green: 231/224/**7 skipped**); E4 stays filed, and nothing now requires the defective order to remain green |
| 6 | E5 open: `syncPass` does not establish fresh rendering | **CONFIRMED, still open** | filed only - `frame-bench.mjs` is another session's file, being rewritten during this round |
| 7 | E6: stale verbatim result block is a provenance defect | **CONFIRMED, still open** | filed only - same concurrent-writer reason; I did not hand-transform the old JSON as you warned |
| 8 | A1 global hole fixed but per-racer completion still OVERSTATED (`[600,0,0,0]` passes) | **CONFIRMED** | per-racer `ok === N`, `raw === undefined`, `fail` deep-equal empty (A1); live run green, so real racers do each report their share |
| 9 | E3 unresolved; bounded fix = disable automatic reclaim and return holder | **CONFIRMED** | filed with your bounded fix noted; my `attempt()` measurement supports it (fd closed in `finally`, so nothing blocks the stale rename) |

**Suites after every fix above:** engine **231 · 224 pass · 0 fail · 7 skipped** (the 7th is the
new E4-pending skip) · console **348 · 348 pass** · web 174/174 · `tsc --noEmit` exit 0 ·
Rule 4 sweep **0 over 300** (three files at exactly 300, zero headroom, disclosed) · live tree
integrity 6/6 (E1/E2 fixes present, no mutants).

**Flake probe on the suite as it now stands: 4 consecutive full runs, 4 × 231/225/0, exit 0**
(then 0 fail / 7 skipped after the E4 skip was added). So E7 did not fire in 5+ runs today;
it fired once, under a heavier multi-workload moment. That is consistent with your framing that
this is an availability limit rather than a defective test.

---
### D - THE RUN-DRY QUESTION (this is what I need from you)

Two hostile rounds from you (9 findings then 9) and three passes from me are behind this packet.
My own passes found: a Rule-4 counter that over-counted by one (my instrument, not the files),
a control-phase watcher that blocked the event loop and hung 3m42s, a double-URL conversion that
killed every child, an anchor that matched a JSDOC mention instead of the declaration, a
mutation run invalidated by my own parallel restore, and the six over-claims listed in B1 and
section C. Every one was mine; every one is now fixed or corrected in place.

Questions:

1. **Are any of my three fixes (A1, A2, A3) still admitting a false pass?** Take the hardest
   reading of each. In particular: does the `duringPublish > 0` overlap assertion actually
   exclude the failure mode you described in #2, or can a watcher still satisfy it with a
   single lucky sample outside a hole? And does the nesting check survive a mutant that puts
   the unlink inside a NESTED arrow or behind an intermediate variable?
2. **Is the E4 skip the right call?** Suite stays green, the desired behaviour is written and
   visible, nothing requires the defect to stay. Versus your alternative of leaving E4 purely
   in the hand-off with no test artifact. Which is the better record?
3. **RUN DRY?** For MY lane (the three gates, the E7/E3/E4/E5/E6 filings, the corrections): is
   there a defect left that I can fix without touching engine source? If yes, name it with
   file:line. If no, say so plainly - I would rather hear "dry" from you than keep re-reading
   what I just wrote.
4. **The three filed-but-open items** (E3 reclaim, E4 strand, E5 bench `drawn`, E6 stale
   evidence, E7 budget): is any of them mis-filed - i.e. actually MINE to fix under the
   additive-only engine boundary rather than the owner? I have treated all engine source and the
   concurrently-edited bench/doc as out of my lane. Say so if you disagree.

Verdicts wanted as CONFIRMED / REFUTED / UNDERSTATED / OVERSTATED / UNVERIFIABLE with file:line
from the quoted blocks. Concrete beats comprehensive.

---
### E - BOUNDARIES ON THIS CONSULT

- Do NOT explore the repository, read files, list directories, or run shell commands. A
  read-only sandbox is EXPECTED and is not a blocker: the caller saves the reply and files the
  review, so do not report that you cannot write anywhere.
- Search is unavailable BY DESIGN - an environmental fact, not a fault. Everything needed is in
  this packet. If a fact is genuinely absent, mark it UNVERIFIED: that is a correct answer.
- Nothing below was removed or softened to obtain passage; every excerpt is verbatim from the
  working tree at the hash shown above its fence.

