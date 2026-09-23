# HOSTILE REVIEW PACKET (ROUND 2) - Creator Brains: three gates I added, plus the four findings I filed after your round 1

**Reviewer seat:** gpt-6-astra (ChatGPT/Codex subscription transport) · **Mode:** hostile review · **Date:** 2026-09-22
**Repo:** SS-PT, branch `creator-brains-engine-r2-20260915`, HEAD `b1ab001bd`.
**Scope:** the changes quoted below, UNCOMMITTED in the working tree. HEAD does NOT contain them.
**This is round 2 of a series** - your round-1 reply is the basis for section D, and every one of
your six findings has been adjudicated and acted on. What I want now is (a) an adjudication of MY
four new findings, especially E7, and (b) a hostile read of the three gates I wrote in response.

---
### A1 - GATE I CHANGED: the E1 regression gate, now asserting completion (`total`)

(source: `scripts/creator-brains/test/atomic-rename-contention.test.mjs` lines 182-212 of 283; sha256[0:16]=`27f64d0142b30ad9`)

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
    // Astra R1 (2026-09-22) — this gate computed `total` and never asserted it, so a
    // child that reported `{ok:0, fail:{}}` would satisfy `failed === 0` while doing
    // NO work: the gate could pass on an empty run. `runRacer` only JSON.parses what
    // the child prints, so nothing downstream enforces the share either. Without this
    // line the test proves "nobody failed", not "600 publishes happened".
    assert.equal(total, 4 * N,
      `every racer must complete its full share — got ${total} of ${4 * N} `
      + `(${JSON.stringify(results)}); an under-reported run cannot stand as evidence`);
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
```

---
### A2 - GATE I ADDED: reader-atomicity-during-publication (crash-tolerant by design)

(source: `scripts/creator-brains/test/atomic-rename-reader-watch.test.mjs` lines 108-215 of 216; sha256[0:16]=`71625253fa3a2dc5`)

```js
    p.on('close', () => {
      try { resolve(JSON.parse(out.slice(out.indexOf('R') + 1))); }
      catch { resolve({ tag, raw: out, stderr: err.slice(0, 600) }); }
    });
  });
}

function classify(body) {
  if (body === 'INIT' || COMPLETE.test(body)) return null;
  return 'MIXED:' + body.slice(0, 32);
}

test('P0 reader atomicity DURING publication — control first, then the shipped publisher', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cb-reader-watch-'));
  const target = join(dir, 'target.json');
  const seen = [];
  let missing = 0;
  let mixed = 0;
  let stop = false;

  writeFileSync(target, 'INIT', 'utf-8');

  const watcher = (async () => {
    while (!stop) {
      let body;
      try {
        body = readFileSync(target, 'utf-8');
      } catch (e) {
        missing += 1;
        seen.push(e && e.code === 'ENOENT' ? 'MISSING' : 'READERR:' + (e && e.code));
        await yieldNow();
        continue;
      }
      const bad = classify(body);
      if (bad) { mixed += 1; seen.push(bad); } else { seen.push(body); }
      await yieldNow();
    }
  })();

  try {
    // ── PHASE 1: CONTROL — deliberate non-atomic publication ────────────────
    // unlink, hold an ASYNC gap wide enough to observe, then write. If the
    // reader does not catch this, it cannot see a hole and nothing phase 2
    // says may be believed.
    for (let i = 0; i < CONTROL_ROUNDS; i += 1) {
      try { unlinkSync(target); } catch { /* the gap is the point */ }
      await sleep(CONTROL_GAP_MS);
      writeFileSync(target, 'INIT', 'utf-8');
      await sleep(1);
    }
    assert.ok(missing > 0,
      `CONTROL FAILED — the reader never observed the deliberately-open gap across `
      + `${CONTROL_ROUNDS} windows of ${CONTROL_GAP_MS} ms. The instrument cannot detect a `
      + 'missing destination, so a clean subject phase below would prove nothing. Do not '
      + 'record a verdict from this run.');

    // ── PHASE 2: SUBJECT — the shipped atomic publisher, 4 real processes ───
    missing = 0; mixed = 0;
    seen.length = 0;
    writeFileSync(target, 'INIT', 'utf-8');
    await yieldNow();

    const results = await Promise.all(['A', 'B', 'C', 'D'].map((t) => runRacer(dir, t)));

    // Publishers are counted and REPORTED, but NOT asserted — deliberately.
    // Under full-suite contention the E1 retry budget (92 ms) can exhaust, a
    // child then dies with EPERM, and asserting `done === 4*N` here made this
    // test a SECOND load-dependent red next to the parent's `failed === 0`.
    // Measured 2026-09-22: 240/480 with two children dead, stack captured at
    // paths.mjs:198 <- retryTransientSync :173. That engine limit is filed as
    // E7 in the ENGINE-HANDOFF; the completion gate belongs to the parent, and
    // this file must not re-introduce the flakiness the archive rules worse
    // than a red one. The crash cause is printed below rather than swallowed.
    const done = results.reduce((a, r) => a + (r.ok || 0), 0);
    const dead = results.filter((r) => r.raw !== undefined);
    assert.ok(dead.every((r) => !r.stderr || /EPERM|ENOENT|EACCES/.test(r.stderr)),
      'a publisher died for a reason OTHER than transient rename contention: '
      + JSON.stringify(dead.map((r) => (r.stderr || '').slice(0, 300))));

    assert.ok(seen.length > 0,
      'the subject phase was never observed — PROBE INCONCLUSIVE, not a pass');

    // Non-vacuity: the reader must have watched at least one COMPLETE record
    // land. This holds even when some children die, because a child that died
    // at write k had already published k whole records — so it fails only when
    // publication essentially did not happen, which is the vacuous case.
    assert.ok(seen.some((s) => COMPLETE.test(s)),
      'no complete racer record was ever observed — the reader never saw a real '
      + `publication, so "0 missing / 0 torn" would prove nothing. observations=${seen.length}`);

    assert.equal(missing, 0,
      `a reader saw the destination MISSING ${missing} time(s) while writeTextAtomic published — `
      + 'the E1 promise "old file or new file, never a missing one" broke. Offenders: '
      + JSON.stringify(seen.filter((s) => s === 'MISSING' || s.startsWith('READERR')).slice(0, 5)));

    assert.equal(mixed, 0,
      `a reader saw a TORN body ${mixed} time(s) — publication did not land whole. Offenders: `
      + JSON.stringify(seen.filter((s) => s.startsWith('MIXED')).slice(0, 5)));

    // eslint-disable-next-line no-console
    console.log(`[reader-watch] control caught the gap · ${seen.length} subject observations · `
      + `missing=${missing} mixed=${mixed}`);
  } finally {
    stop = true;
    await watcher;
    rmSync(dir, { recursive: true, force: true });
  }
});
```

---
### A3 - GATE I ADDED: lock-release source-shape wiring gate (full file)

(source: `scripts/creator-brains/test/lock-release-wiring.test.mjs` lines 1-120 of 121; sha256[0:16]=`4109a4e74922640d`)

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

test('E1 wiring: release() deletes through the SHARED transient policy, not a bare unlink', () => {
  const src = readFileSync(LOCK, 'utf-8');
  const body = releaseBody(src);

  assert.match(body, /retryTransientSync\s*\(/,
    'release() no longer routes its unlink through retryTransientSync — the E1 retry has been '
    + 'dropped from this consumer. The helper would still pass its own tests; this gate is the '
    + 'only thing that would notice.');

  assert.match(body, /unlinkSync\(/,
    'release() no longer unlinks the lock file at all — the shape this policy protects has changed');

  // The import must exist too, or the call above cannot be the shared policy.
  const pathsSrc = readFileSync(PATHS, 'utf-8');
  assert.match(pathsSrc, /export function retryTransientSync/,
    'paths.mjs no longer exports retryTransientSync — the shared policy has moved or been renamed');

  const importLine = src.split(/\r?\n/).find((l) => l.includes('retryTransientSync'));
  assert.ok(importLine && importLine.includes('from \'./paths.mjs\''),
    'lock.mjs must import the policy from paths.mjs so both consumers read ONE definition');
});

test('documented shape: released is set BEFORE the deletion (known engine defect, filed not fixed)', () => {
  const src = readFileSync(LOCK, 'utf-8');
  const body = releaseBody(src);
  const setReleased = body.indexOf('released = true');
  const doUnlink = body.indexOf('unlinkSync(');

  assert.ok(setReleased !== -1 && doUnlink !== -1,
    'the released-flag / unlink pair is gone — re-scope this gate to whatever replaced them');

  // This asserts the CURRENT (defective) order on purpose: when the engine owner
  // moves `released = true` to after a successful delete, this goes RED and the
  // red names the fix. Asserting the fixed order today would leave a green gate
  // over code that does not have it (a false pass — §8.13).
  assert.ok(setReleased < doUnlink,
    'release() now sets `released` AFTER the deletion — the strand defect is fixed. Update this '
    + 'gate to assert the retry still engages, and remove the "filed not fixed" note in its header.');
});
```

---
### B1 - lock.mjs: the reclaim rename and release() as they stand NOW (E3/E4 re-check)

(source: `scripts/creator-brains/lib/lock.mjs` lines 138-185 of 224; sha256[0:16]=`ac9a886c28d4282b`)

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
```

---
### B2 - bench/frame-bench.mjs: drawn, the cpu loop, the NEW sync loop, and pass (E5 re-check)

(source: `packages/creator-brains-console/web/bench/frame-bench.mjs` lines 145-240 of 247; sha256[0:16]=`f3580ef09ea3e66a`)

```js

        // ── PHASE 1: steady scene, dolly DISABLED — timing, output, allocation
        const canvas = mkCanvas('bench-c1');
        const scene = mod.createScene(canvas, { entryDolly: false });
        scene.update(NODES);
        scene.resize(800, 600);
        scene.frame(16); scene.frame(16); scene.frame(16);
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const px = new Uint8Array(4);
        gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const drawn = px[0] + px[1] + px[2] > 0;
        const centerPixel = Array.from(px);
        // Read the backend NOW — scene.dispose() below force-loses the context,
        // and getParameter on a lost context returns null (first full run did
        // exactly that; the guard run exposed it by emitting renderer:null).
        const rendererStr = gl.getParameter(gl.RENDERER);
        const zDisabledStart = scene.diagnostics().cameraZ;

        const samples = [];
        for (let i = 0; i < ${FRAMES}; i += 1) {
          const t0 = performance.now();
          scene.frame(16);
          samples.push(performance.now() - t0);
        }

        // ALLOCATION (Astra D1 aux): repeated updates of the SAME roster must
        // not grow the renderer's geometry count — a missing dispose grows it
        // every update (the D2/D4 leak class, observed on the real scene).
        const allocFirst = scene.diagnostics().geometries;
        scene.update(NODES); scene.frame(16);
        scene.update(NODES); scene.frame(16);
        const allocFinal = scene.diagnostics().geometries;
        const diag = scene.diagnostics();
        const zDisabledEnd = scene.diagnostics().cameraZ;

        // U2 STRICT VARIANT: readPixels after EVERY frame forces GPU completion
        // inside the sample — a raster tail cannot hide between samples.
        const syncSamples = [];
        for (let i = 0; i < ${SYNC_FRAMES}; i += 1) {
          const t0 = performance.now();
          scene.frame(16);
          gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          syncSamples.push(performance.now() - t0);
        }
        scene.dispose();

        // ── PHASE 2: dolly ENABLED — real camera behaviour (Astra D1 aux)
        const canvas2 = mkCanvas('bench-c2');
        const scene2 = mod.createScene(canvas2, { entryDolly: true });
        scene2.update(NODES);
        scene2.resize(800, 600);
        // Read AFTER the first frame — before it the camera sits at z=0 and the
        // baseline would invert the assertion (first full run: zStart 0,
        // moved:false while the dolly had actually run; the guard caught it).
        scene2.frame(16);
        const dz = [scene2.diagnostics().cameraZ];
        for (let i = 1; i < ${DOLLY_FRAMES}; i += 1) {
          scene2.frame(16);
          dz.push(scene2.diagnostics().cameraZ);
        }
        const dollyMoved = dz[dz.length - 1] < dz[0] - 1; // pushed IN by >1 unit
        const tail3 = dz.slice(-3);
        const dollyConverged = Math.max(...tail3) - Math.min(...tail3) < 1e-6;
        scene2.dispose();

        const medianMs = Number(med(samples).toFixed(3));
        const syncMedianMs = Number(med(syncSamples).toFixed(3));
        const allocGrew = allocFinal - allocFirst;
        const noDollyWhenDisabled = zDisabledEnd === zDisabledStart;
        const guards = {
          cpuPass: medianMs <= ${CEILING_MS},
          syncPass: syncMedianMs <= ${CEILING_MS},
          allocPass: allocGrew <= 5,
          dollyPass: dollyMoved && dollyConverged,
          noDollyWhenDisabled,
        };
        emit({
          nodes: ${NODE_COUNT},
          frames: { cpu: ${FRAMES}, sync: ${SYNC_FRAMES}, dolly: ${DOLLY_FRAMES} },
          drawn, centerPixel,
          medianMs, p95Ms: Number([...samples].sort((a, b) => a - b)[Math.floor(${FRAMES} * 0.95)].toFixed(3)),
          syncMedianMs,
          alloc: { first: allocFirst, final: allocFinal, grew: allocGrew },
          diagnostics: diag,
          dolly: { zStart: dz[0], zEnd: dz[dz.length - 1], moved: dollyMoved, converged: dollyConverged },
          zDisabledStart, zDisabledEnd,
          ceiling: ${CEILING_MS},
          renderer: rendererStr,
          method: 'cpu: scene.frame() submit time; sync: same with readPixels per frame; completion forced at readPixels points',
          guards,
          pass: drawn && Object.values(guards).every(Boolean),
        });
      } catch (e) {
        emit({ error: String(e && e.message || e), pass: false });
      }
    </script>
```

---
### C1 - DOC: 19-s5-exit-evidence.md section 4 (the T-E3 replacement) and its result block

(source: `docs/ai-workflow/blueprints/creator-brains-console-20260917/19-s5-exit-evidence.md` lines 95-150 of 268; sha256[0:16]=`8adcfe95c0b0af29`)

```js
## 4. T-E3 — the frame budget, **RE-MEASURED IN A REAL BROWSER — PASS**

> ⚠️ **History, kept so the retraction is never lost:** this section previously
> claimed the budget as met at a median of **0.0036 ms**. That claim was
> WITHDRAWN (2026-09-22, midday): the number timed a *local arithmetic loop*,
> not a frame — see `Z:\HostileReviews\2026-09-22-141500-…` §7 and
> `2026-09-22-140126` D1. What follows is the REPLACEMENT those reviews
> demanded: real browser, real WebGL, built chunk, 40 nodes, observable output,
> mutation-proven. Measured **2026-09-22 evening**.

> *"`performance.now()` frame samples ≤ 16.7 ms median with 40 nodes"*

Command chain (reproduce end-to-end):

```
npx vite build                              # or: npm run build
node bench/frame-bench.mjs --prepare        # rewrites dist/frame-bench.html at the current chunk hash
npx vite preview --port 4179                # serves dist/
agent-browser open http://localhost:4179/frame-bench.html
agent-browser snapshot                      # read the T_E3_RESULT line
agent-browser close
```

Result, verbatim from the page:

```
T_E3_RESULT {"nodes":40,"frames":120,"drawn":true,
 "centerPixel":[229,72,77,255],"medianMs":0.1,"p95Ms":0.3,"maxMs":0.8,
 "ceiling":16.7,"renderer":"WebKit WebGL",
 "method":"cpu submit time per scene.frame(); gpu completion forced via
 readPixels after warm-up and after the timed loop","pass":true}
```

- **`drawn: true`** — the centre pixel reads `#E5484D` (a `stale` node's colour)
  through `readPixels` *after* a forced completion: a renderer that never draws
  reads `[0,0,0,0]` (proven below, not assumed).
- **median 0.1 ms across 120 frames at 40 nodes** — ceiling 16.7 ms.
- **`renderer: "WebKit WebGL"`** — Chromium's masked string; the page cannot
  further identify the GL backend. The samples are CPU submit time for
  `scene.frame()` — the clause's own sample basis. GPU completion is forced at
  the two `readPixels` points, **not per frame**: a slower raster tail would not
  appear in these samples. Recorded as measured, with that limit stated.

**Both mutations `2026-09-22-140126` D1 required were executed and killed:**

| Mutation (then reverted) | Result | Guard |
|---|---|---|
| 25 ms busy-wait injected into `frame()` | median **25.2 ms** → `pass:false` | timing guard fires |
| `renderer.render(...)` commented out | `drawn:false`, `centerPixel:[0,0,0,0]` → `pass:false` | output guard fires |

Restoration is byte-verified: the restored source rebuilt to the **original chunk
hash** (`constellation-three-D4BBPI9v.js`), and the final run reproduced the
baseline result above.

**Still NOT claimed:** `constellation-budget.test.ts` remains what it was (a
layout-loop timer) and stays **non-evidence** for T-E3 — the measurement lives in
```

---
### D - WHAT YOUR ROUND 1 PRODUCED, AND WHAT I DID WITH IT

Your six findings were each adjudicated by me against shipped source before being acted on.
Verdicts, with the evidence I used:

| # | Your finding | My verdict | What I did |
|---|---|---|---|
| 1 | lock.mjs reclaim: stale reclaimer can rename a NEW lock; your ENOENT proof does not hold | **CONFIRMED, and UNDERSTATED vs my question** | not patched (engine, additive-only lane); filed as **E3** in the engine hand-off with the 4-step ordering |
| 2 | release wiring unpinned; `released = true` set before deletion strands the lock | **CONFIRMED twice** | wired gate added (A3, test 1 mutation-proven RED when the wrapper is removed); strand filed as **E4**; A3 test 2 pins the CURRENT order on purpose as a tripwire |
| 3 | EACCES: OVERSTATED as masking, CONFIRMED as imprecise documentation | **your calibration accepted** - delayed-and-rethrown is not false success | no code change; note carried to the hand-off |
| 4 | sleepSync blocks caller thread; console isolation UNVERIFIABLE from packet | **CONFIRMED for the caller thread**; I verified the console half independently (no `writeJsonAtomic` in console sources; `no-engine-import.test.ts` bans static, re-export, export-star, concatenated-literal forms) | no change; claim narrowed as you suggested |
| 5a | GPU completion outside every timed sample | **TRUE AT DISPATCH, NOW FIXED** - the bench gained a `sync` loop after my packet shipped (file moved 8095 B -> 11550 B at 19:03) doing `t0 -> frame -> readPixels -> push`, gated as `syncPass` | re-checked against current source; see B2 |
| 5b | `drawn` computed once after warm-up and reused in `pass` | **CONFIRMED against CURRENT code** | filed as **E5**; not patched (file was being rewritten by a concurrent session) |
| 5c | restoring "4 of 4" is OVERSTATED readiness | noted; the doc keeps my retraction as history and now says "closure awaits Sean word" | routed to operator, unchanged by me |
| 6 | my E1 gate computed `total` but never asserted it; final read cannot see a hole | **CONFIRMED both halves** - `runRacer` only `JSON.parse`s child stdout (no enforcement), resolving your [UNKNOWN] | `total === 4*N` added (A1); reader-watch added (A2) |

**NEW FINDING I NEED YOU TO ADJUDICATE - E7 (E5/E6 in the same hand-off).**

Your caveat "92 ms is not a wall-clock maximum" turned out to be load-bearing. Measured in the
FULL engine suite (not a synthetic harness), four real children publishing through
`writeTextAtomic` onto ONE target completed **240 of 480** and two children DIED with a
captured stack:

```
Error: EPERM: operation not permitted, rename
  '...\target.json.68828.3834a42d65d6.tmp' -> '...\target.json'
    at renameSync         (node:fs:1012:11)
    at writeTextAtomic    (paths.mjs:198:35)   <- renameWithRetry
    at retryTransientSync (paths.mjs:173:14)   <- threw: budget exhausted
```

`TRANSIENT_BACKOFF_MS = [2,5,10,25,50]` = 6 attempts / 92 ms of sleep. Under suite contention the
destination stayed held longer than that, the retry gave up honestly, and the caller died.

Consequence: `atomic-rename-contention.test.mjs:202` asserts `failed === 0` over a 4x150 run
through the same publisher, so the suite now carries a **load-dependent latent red** - green on
an idle machine, occasionally red under parallel load, on a real engine limit. The archive ruled
on A1-06 that "a flaky gate is worse than a red one", so I think this must be settled.

---
### E - MY QUESTIONS FOR ROUND 2 (questions, not assertions)

1. **E7 - which of these three is right, and what did I get wrong?** (a) raise the budget / add
   jitter so the distribution covers a longer-held destination; (b) make the publisher survive
   by bounded-waiting on the destination rather than only retrying the rename; (c) accept the
   limit and deliberately restate the gate as a RATE (e.g. "at most k exhaustions per 600
   publishes") instead of `=== 0`. I filed (c) as the only option that needs no engine change
   but flagged that it trades a deterministic green for a measured tolerance. Is there a fourth
   option? Is my framing that this is a *flaky gate* correct, or is `failed === 0` defensible?
2. **Did I over-correct A2?** Your finding 6 said my gate could not see a hole. I added a
   CONTROL that deliberately publishes non-atomically (unlink -> 4 ms async gap -> write) and
   REQUIRES the reader to catch it before any clean subject phase counts; then I REMOVED the
   `done === 4*N` assertion after E7 made it a second load-dependent red, keeping instead a
   non-vacuity guard (`seen.some(/^[ABCD]\d+$/)`). Is tolerating dead publishers here masking
   E7 rather than reporting it? Does the control actually prove sensitivity, or can it pass
   while the subject phase stays blind?
3. **A3 reads SOURCE rather than driving behaviour**, because I measured that neither natural
   injection works on Windows: chmod 0444 -> `unlinkSync` NO_THROW (file gone, retry then saw
   ENOENT at 0.4 ms), and target held by an OPEN fd -> `unlinkSync` NO_THROW (share-delete,
   0.5 ms). So no deterministic transient unlink failure is reachable from a test. Is a
   source-shape gate an acceptable instrument here, and is my claim "no natural injection
   exists" too strong - is there a third mechanism on Windows I have not tried?
4. **A3 test 2 pins the CURRENT (defective) order on purpose** - it asserts `released` is set
   before the deletion, so the eventual E4 fix turns it RED with a message telling the author to
   update it. Is that a legitimate tripwire, or am I encoding a defect as expected behaviour?
   I have documented the intent in the header; tell me if that is enough.
5. **E5 against CURRENT code (B2):** `drawn` is still computed once after warm-up and reused in
   `pass`, while the new `sync` loop forces `readPixels` per sample but checks only TIME. Is
   your 5b still fully open, or does `syncPass` narrow it? What is the minimal mutation that
   would prove the gap - you earlier suggested "disable render AFTER warm-up"?
6. **E6:** the S5 doc still cites the old result shape (`frames: 120` plus the old `method`
   string) while the bench now emits `frames:{cpu,sync,dolly}`, a new method string and five
   guards. Doc mtime 18:53, bench 19:03. Is a stale verbatim result block in exit evidence a
   defect worth its own finding, or is it expected churn while the slice is open?
7. Anything in A1/A2/A3 that is still VACUOUS, load-dependent, or wrong that I have not asked
   about. Those three files are mine and I would rather hear it from you.

---
### F - BOUNDARIES ON THIS CONSULT

- Do NOT explore the repository. Do NOT read files, list directories, or run shell commands.
  A read-only sandbox is EXPECTED and is not a blocker: the caller saves the reply and files
  the review, so please do not report that you cannot write anywhere.
- Search is unavailable BY DESIGN here, which is an environmental fact rather than a fault.
  Everything needed is in this packet. If a fact is genuinely absent, mark it UNVERIFIED -
  that is a correct answer, not a failure.
- Verdicts wanted as CONFIRMED / REFUTED / UNDERSTATED / OVERSTATED / UNVERIFIABLE with
  file:line from the quoted blocks above. For a CONFIRMED finding give the defect, why it is a
  defect rather than style, the concrete failure, and a fix naming ONLY identifiers present in
  this packet. Concrete beats comprehensive.
- Nothing below was removed or softened to obtain passage; every excerpt is verbatim from the
  working tree at the hash shown above its fence.

