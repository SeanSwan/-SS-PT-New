#!/usr/bin/env node
/**
 * shot-diff — compare the rendered variants against COMMITTED baselines.
 * @module scripts/swan-brain-console/shot-diff
 *
 * WHY THIS EXISTS, AND WHY THE ORIGINAL REASON WAS WRONG (ruled D20)
 * The plan first justified this as "the highest-value remaining guard" against the
 * rail-reserve / layout-overlap class. That rationale was STALE: `gallery-verify.mjs` already
 * opens a `LAYOUT OVERLAP GUARD` for exactly that. The real gap is narrower and worse.
 * `gallery-verify.mjs` asserts the twenty variant digests are MUTUALLY UNIQUE, which catches
 * "two variants render identically" and is structurally blind to "all twenty changed together" —
 * a shared token shift produces twenty new digests that are still unique. Only a comparison
 * against a STORED REFERENCE catches that, which is what this script adds.
 *
 * THE COMPARATOR. No comparator dependency exists, and `toHaveScreenshot` needs Playwright Test's
 * runner, which a standalone script is not. Rather than add one, the pixel comparison runs IN THE
 * PAGE on a canvas — the same renderer that produced the screenshot. `maxDiffPixelRatio` is
 * implemented explicitly, and its threshold is a flag rather than a magic number.
 *
 * A MISSING BASELINE IS NOT A PASS. It is reported as `no_baseline` and fails the run unless
 * `--update` is passed, because "we have no reference for this variant" and "this variant
 * matches its reference" are different facts — the same distinction `gateHealth.mjs` exists
 * to enforce.
 *
 * THE FLEET IS THE DENOMINATOR, AND IT COMES FROM THE MANIFEST (round 11, finding F04). The
 * expected ids are read from `skeletons.ts` and reconciled against the DOM before a single
 * comparison is made, so a subset run cannot certify the full-fleet gate; the absent variants are
 * NAMED, the run exits non-zero, and the artifact carries `population.scope`. The reconciliation
 * itself lives in `fleetMeasure.mjs` and the reader in `fleetData.mjs`.
 *
 * THE PERSISTED ARTIFACT HAS A CONTRACT, AND IT IS THE READER'S
 * `--result` writes the artifact the workflow uploads and `gateHealth.mjs` reads by declaring
 * a gate at exactly that path. It is built by `buildRenderResult` in `renderResult.mjs` — not
 * inline — so a test can hand the real document to the real reader. Round 6 found why that
 * matters; the story is in that module's header.
 *
 * Run: node scripts/swan-brain-console/shot-diff.mjs [--url …] [--update] [--max-diff 0.002]
 *      [--result docs/qa/gate-results/three-worlds-render.json]
 * Requires the QA harness: npx vite --port 5199 --strictPort  (see the workflow).
 */
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  countFailures, buildRenderResult,
} from './renderResult.mjs';
// The expected population comes from the MANIFEST, never from the page being measured.
import { loadFleetIds } from './fleetData.mjs';
/*
 * WHAT LIVES WHERE, AND WHY (Rule 4 has forced six splits in this one script).
 *   `baselineComparison.mjs`  the PURE half — constants, argv, the per-variant decision. Pinned
 *                             exhaustively for free, which this file cannot be: it needs a browser.
 *   `renderAttempt.mjs`       WHEN the artifact is published and what it says mid-flight. The
 *                             ordering is the fix, so it had to be testable without a browser.
 *   `fleetMeasure.mjs`        the BROWSER half (round 15, Astra J03).
 *   `attemptLock.mjs`         ONE FILE, its holder and its stale modes (round 15, Astra K01).
 *   `baselineLock.mjs`        WHICH resources an attempt must hold, and in what order (round 16,
 *                             Astra L01) — a different subject from how one lock behaves.
 *   `exitCodes.mjs`           what each exit number means (round 16, Astra L03).
 * What is left here is the PROCESS contract: argv, the lock plan, the lifecycle, the fence.
 * Everything imported below is also RE-EXPORTED where it used to be public, so this module's
 * surface is unchanged by the splits.
 */
import { BASELINE_DIR, summarize, parseArgs } from './baselineComparison.mjs';
import { runAttempt, attemptRecord, fileWriter, publishIfNewest } from './renderAttempt.mjs';
import { measureFleet } from './fleetMeasure.mjs';
import { acquireAttemptLock } from './attemptLock.mjs';
import { acquireAllLocks, lockPlanFor } from './baselineLock.mjs';
import { EXIT_ATTEMPT_FAILED, EXIT_NOT_STARTED, exitForCompletedRun } from './exitCodes.mjs';

/** The one write path for this gate's artifact. Shared with `renderAttempt.test.mjs`. */
const writeResult = fileWriter();

export {
  CHANNEL_DELTA, BASELINE_DIR, classifyComparison, summarize, parseArgs,
} from './baselineComparison.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

/**
 * The QA harness's own `<title>`, re-exported.
 *
 * REACHABILITY IS NOT IDENTITY. This script used to trust whatever answered on the port, and in
 * S4 that was wrong in practice: :5199 was occupied by a DIFFERENT worktree's dev server (a
 * theme-lens harness), so the run found zero `[data-world]` nodes and reported a confusing
 * selector timeout instead of "you are pointing at the wrong application".
 *
 * The check itself now lives in `fleetMeasure.mjs`, beside the browser work that needs it; the
 * marker itself lives in `harnessIdentity.mjs`, because `gallery-verify.mjs` navigates the same
 * harness and had no identity check at all. One marker, one place to drift from.
 */
export { HARNESS_TITLE } from './harnessIdentity.mjs';

/**
 * `DEFAULT_MAX_DIFF_PIXEL_RATIO` is the artifact's tolerance, so it lives beside the artifact
 * builder; `countFailures` and `buildRenderResult` are the artifact itself. They live in
 * `renderResult.mjs` — the interface to a different consumer (the console), which is a
 * different subject from driving a browser. Re-exported so this module's public surface is
 * unchanged.
 */
export {
  DEFAULT_MAX_DIFF_PIXEL_RATIO, countFailures, buildRenderResult,
} from './renderResult.mjs';

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const baselineDir = join(REPO, BASELINE_DIR);

  // ONE PATH, COMPUTED ONCE. If the lifecycle and the success branch computed it separately and
  // diverged, a completed run would leave the in-progress artifact here and write the result
  // elsewhere — and the console would report `not_evidence` for a gate that had just passed.
  const resultPath = opts.result ? join(REPO, opts.result) : null;

  /*
   * THE LOCKS ARE TAKEN BEFORE THE LIFECYCLE, AND RELEASED IN THE `finally` BELOW
   * (round 15, Astra K01; extended round 16, Astra L01). The locks are held across the baseline
   * writes as well as the result publication, because the baseline is a side effect of the
   * attempt and an unguarded side effect is what K01 is about.
   *
   * ROUND 16 (Astra L01) — THE RESOURCE SET IS DERIVED FROM THE MODE, NOT FROM A FALLBACK.
   * `resultPath ?? baselineDir` locked ONE path, so two `--update` runs with different `--result`
   * values held two different locks over one shared baseline directory. `lockPlanFor` names every
   * resource the mode writes, in a fixed order; `acquireAllLocks` takes all or none. The
   * reasoning is in `baselineLock.mjs`, beside the resource model.
   *
   * ROUND 16 (Astra L03) — AND NO MANIFEST READ HAPPENS ABOVE THIS LINE. An earlier draft resolved
   * the fleet ids here, beside the plan, which put a `skeletons.ts` read OUTSIDE the guarded region
   * and resurrected round 15's K03: make the manifest unreadable, run, and the process dies with
   * the previous green artifact untouched and still the console's answer. `lifecycleEntry.test.mjs`
   * caught it. The plan is mode-derived and manifest-independent; the manifest stays inside the
   * lifecycle, where `loadFleetIds()` is awaited.
   *
   * `main()` RETURNS its exit code rather than calling `process.exit` in the body. That is not
   * tidiness: `process.exit` terminates the process immediately and does NOT unwind, so a
   * `finally` that released the locks would never run and every red exit would leak them.
   */
  const plan = lockPlanFor({ update: opts.update, resultPath });
  const lock = await acquireAllLocks({
    resources: plan.resources, acquire: acquireAttemptLock, label: 'shot-diff',
  });
  if (!lock.ok) {
    /*
     * BUSY IS NOT FAILED, AND IT IS NOT PUBLISHED (Astra K01; round 16, L01).
     *
     * A run that never started must not be recorded as an attempt that ran and died: the holder's
     * own in-progress artifact is already on disk and is the correct answer, and overwriting it
     * with our failure is the K01 defect one level up. The refusal names the RESOURCE, because
     * with two locks "held" is not an answer — an operator needs to know which one was taken.
     * `EXIT_NOT_STARTED` is a distinct code precisely so this is not reported as a red gate.
     */
    console.error(`[shot-diff] not started: ${plan.resources.length > 1 ? `[${lock.name}] ` : ''}${lock.reason}`);
    return EXIT_NOT_STARTED;
  }

  try {
    /*
     * ROUND 14 (2026-09-21) — THE ATTEMPT LIFECYCLE WRAPS THE WHOLE RUN (Astra H03).
     *
     * The artifact used to be published only after the browser work completed, so every failure
     * path left the process before reaching the write — and a green artifact from the PREVIOUS
     * run stayed on disk, fresh and stamped `mode: "compare"`, and the console reported PASS for
     * a gate whose latest attempt had died. `runAttempt` publishes an in-progress artifact before
     * this thunk is invoked, and a terminal failure if it throws, so the previous success stops
     * being the answer the moment a new attempt starts.
     *
     * ROUND 15 (Astra K03) — `loadFleetIds()` IS INSIDE THE LIFECYCLE, AND THE OLD COMMENT HERE
     * WAS WRONG. It argued the manifest read was "a configuration failure, not an attempt, and
     * there is nothing yet for the previous artifact to be superseded by". Astra executed the
     * consequence: seed a fresh PASS, make the manifest unreadable, run — the process exits, the
     * previous artifact is UNTOUCHED, and the console reports PASS for a gate the operator just
     * asked to verify. That is H03 exactly: **the file is lying about now.** A run that was
     * requested and could not start is a failed attempt, and the artifact must say so. The
     * manifest is still read before the browser starts — the ordering F04 requires — but it is
     * now read inside the guarded region, so a throw publishes a terminal failure.
     */
    const attempt = await runAttempt({
      resultPath,
      write: writeResult,
      update: opts.update,
      run: async () => measureFleet({
        opts, baselineDir, expectedIds: await loadFleetIds(),
      }),
    });

    if (attempt.outcome === 'not-started') {
      /*
       * ROUND 16 (Astra L03) — A REFUSED START IS NOT A FAILURE, AND IT MEASURED NOTHING. The
       * fence refused this attempt's in-progress publish because the artifact on disk belongs to
       * a NEWER attempt, so `runAttempt` returned BEFORE invoking the thunk: no browser work, no
       * comparison, and no baseline writes. See `renderAttempt.mjs` for why the old shape did all
       * three anyway. Publishing a failure here would overwrite the newer attempt's state, and
       * `EXIT_ATTEMPT_FAILED` would tell CI the gate is red on a run that never looked at a pixel.
       */
      console.error(`[shot-diff] not started: the artifact at ${opts.result} belongs to a NEWER attempt — ${attempt.superseded}`);
      return EXIT_NOT_STARTED;
    }

    if (attempt.outcome === 'failed') {
      console.error(`[shot-diff] ${String(attempt.error && attempt.error.message ? attempt.error.message : attempt.error)}`);
      // A failed attempt is a FAILED GATE. The artifact on disk already says so.
      return EXIT_ATTEMPT_FAILED;
    }

    const { results, population } = attempt.value;
    const summary = summarize(results);
    for (const r of results) console.log(`${r.status.toUpperCase().padEnd(12)} ${r.id}  — ${r.detail}`);
    console.log(`\n[shot-diff] ${JSON.stringify(summary)}`);
    if (population) console.log(`[shot-diff] population: ${population.scope} — ${population.detail}`);

    if (resultPath) {
      /*
       * ROUND 14 (Astra J02) — THE SUCCESS PUBLISH GOES THROUGH THE SAME FENCE AS THE LIFECYCLE.
       *
       * This write is the one Astra's schedule used: attempt A starts, attempt B starts and fails,
       * A finishes and writes its green here — and the console reports PASS for a gate whose newest
       * attempt died. `publishIfNewest` refuses when the artifact on disk was started by a NEWER
       * attempt, so A cannot overwrite B.
       *
       * A refusal is NOT a pass. This attempt did not publish, so its result is not the console's
       * answer, and exiting 0 would claim a green gate that was never written.
       */
      const refused = publishIfNewest({
        resultPath,
        write: writeResult,
        doc: buildRenderResult({
          results,
          summary,
          maxDiffPixelRatio: opts.maxDiffPixelRatio,
          update: opts.update,
          population,
          attempt: attemptRecord({ attemptId: attempt.attemptId, startedAt: attempt.startedAt }),
        }),
      });
      if (refused) {
        console.error(`[shot-diff] refusing to publish ${opts.result}: ${refused}`);
        return EXIT_ATTEMPT_FAILED;
      }
      console.log(`[shot-diff] wrote ${opts.result}`);
    }

    // A written baseline is a successful UPDATE, not a passing COMPARISON. Only a run in
    // compare mode can exit 0, so `--update` can never be mistaken for a green gate. The rule
    // lives in `exitCodes.mjs` so this file and CI cannot drift on what the numbers mean.
    return exitForCompletedRun({ summary, update: opts.update, countFailures });
  } finally {
    /*
     * Released on EVERY path, including both red exits above. `release` is a no-op if this
     * process no longer holds the resource, and each handle is bound to the TOKEN of the
     * acquisition that created it (round 16, Astra L07), so a re-entrant or reclaimed lock
     * cannot be unlinked out from under its real owner.
     *
     * The `catch` is load-bearing and it is DELIBERATELY LOUD. A throw here would replace the
     * `finally`'s arrival with a rejection, so `main()`'s promise would reject, the entry point
     * would print the error and exit 2 — and the REAL exit code (1 for a failed comparison, 3
     * for busy) would be lost. That is not a hypothetical: it is the difference between "the gate
     * is red" and "something went wrong", which is the one distinction CI acts on. So a release
     * failure is reported and the exit code survives — an unreleased lock is a visible, bounded
     * problem, and a misreported exit code is a silent, wrong one.
     */
    try {
      lock.release();
    } catch (err) {
      console.error(`[shot-diff] WARNING: releasing ${plan.resources.length} lock(s) failed: ${String(err && err.message ? err.message : err)}`);
    }
  }
}

/*
 * Start only when this file is the entry point, so importing the pure helpers for a test
 * does not launch a browser.
 *
 * `pathToFileURL` and NOT a hand-built `file://` string. Manual construction mishandles
 * spaces, `#`, `?` and non-ASCII path segments — and this comparison fails SILENTLY when it
 * is wrong: the script simply does nothing and exits 0, which is indistinguishable from a
 * clean pass. (This file briefly contained exactly that hand-rolled version.)
 */
const isEntryPoint = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  /*
   * ROUND 15 (Astra K01) — THE EXIT CODE COMES FROM `main()`, WHICH HAS ALREADY RELEASED THE LOCK
   * IN ITS `finally`. `process.exit` does not unwind, so it must not be called inside `main()`:
   * a red exit there would skip the release and leave the resource locked for the next attempt.
   */
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`[shot-diff] ${String(err && err.message ? err.message : err)}`);
      process.exit(2);
    },
  );
}
