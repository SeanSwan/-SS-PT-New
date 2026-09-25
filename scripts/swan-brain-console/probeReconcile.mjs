/**
 * probeReconcile — the one line that reconciles the gate's two instruments.
 * @module scripts/swan-brain-console/probeReconcile
 *
 * WHY THIS IS A MODULE (round 28 D1, 2026-09-25 — sable).
 *
 * `verify-all.mjs` carries two instruments answering one question — "can this runner execute the
 * stages?" — and nothing compared them. `spawnCapability()` is a single sample taken before any
 * stage runs; the per-stage verdicts are the measurement. Neither instrument is wrong, and they can
 * disagree in BOTH directions:
 *
 *  - probe clean, a stage blocked. The probe spawns `node -e 'process.exit(0)'`. A suite may need
 *    something the probe never exercises — a working directory, a free port, a browser.
 *  - probe blocked, every stage passing. Four of this gate's six stages spawn no child at all, so a
 *    transient failure at start-up can contradict the very run it warns about.
 *
 * Both were reachable, and neither was compared, so the gate could print a capability warning and a
 * BLOCKED summary that disagree, in two vocabularies, leaving the reader to arbitrate between them.
 * That is the round-18 defect class one level up: a verdict that does not follow from its evidence.
 *
 * It lives in its own module for the round-21 reason rather than the round-28 one. `verify-all.mjs`
 * calls `main()` at module load, so nothing defined inside it can be driven from a test — the same
 * constraint that forced `classifyStageOutput` out of `run()`'s closure.
 */

/**
 * The reconciliation line to print, or `null` when the two instruments agree.
 *
 * Advisory stays advisory. This never reclassifies a stage and never gates the exit code: it names
 * which instrument to believe when they conflict, and the answer is always the per-stage one,
 * because that is the measurement and the probe is a sample.
 */
export function reconcileProbe(probeOk, blockedStages) {
  if (probeOk && blockedStages > 0) {
    return `the capability probe reported this runner able to spawn a child, but ${blockedStages} `
      + 'stage(s) could not execute — the per-stage cause above is authoritative; the probe is a '
      + 'single sample taken before any stage ran';
  }
  if (!probeOk && blockedStages === 0) {
    return 'the capability probe reported this runner unable to spawn a child, but every stage '
      + 'that ran passed — the probe is a single sample taken before any stage ran, and it is not '
      + 'the verdict';
  }
  return null;
}
