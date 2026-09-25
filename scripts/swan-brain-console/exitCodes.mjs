/**
 * exitCodes — the one place this subsystem says what a number means.
 * @module scripts/swan-brain-console/exitCodes
 *
 * WHY THIS IS A MODULE AND NOT FOUR `return` STATEMENTS
 * `shot-diff.mjs` had its exit codes inline, and round 16 (Astra L03) added a fourth. The codes
 * are not decoration: they are the only thing CI branches on, and the whole point of having four
 * rather than the usual two is that "the gate is red" and "I could not tell you about the gate"
 * must be distinguishable. When they were inline, the distinction lived in comments at four
 * separate `return`s — which is exactly how two of them drifted into meaning the same thing in an
 * earlier round.
 *
 * Rule 4 is the proximate reason this is a file (the codes plus their reasoning pushed
 * `shot-diff.mjs` past 300) and it is the smaller reason. The larger one is that a test can now
 * name the contract instead of grepping for a literal, and `README`-surface documentation for CI
 * has one source rather than four.
 *
 * THE FOUR CODES, AND WHY 3 EXISTS
 *   0  the comparison ran and every variant passed
 *   1  the comparison ran and at least one variant failed — THE GATE IS RED
 *   2  an attempt started and died (a thrown measurement, a refused publication)
 *   3  NO ATTEMPT RAN. Busy on a lock, or superseded by a newer attempt. Nothing was measured.
 *
 * 2 and 3 are the pair that used to be one number. Collapsing them means a CI job sees "failure"
 * for a run that never started — and the natural response to a red gate is to look at what
 * changed, when the correct response to a busy gate is to wait and re-run. A distinct code is
 * cheaper than a log-parsing convention, and it cannot be forgotten in one of the two branches.
 */

/** The gate is green: the comparison ran, and nothing failed. Only compare mode can return this. */
export const EXIT_OK = 0;

/** The gate is RED: the comparison ran and at least one variant failed. */
export const EXIT_GATE_RED = 1;

/** An attempt started and died. The artifact on disk records the failure. */
export const EXIT_ATTEMPT_FAILED = 2;

/**
 * No attempt ran — busy on a resource, or superseded by a newer attempt.
 *
 * Deliberately NOT 2. The caller must be able to tell "try again later" from "the gate is red"
 * without reading the log; see the module header.
 */
export const EXIT_NOT_STARTED = 3;

/**
 * The code for a completed run, from its summary and mode.
 *
 * `--update` can never return `EXIT_OK`: a written baseline is a SUCCESSFUL UPDATE, not a passing
 * COMPARISON, so a green exit would let CI mistake a fresh reference set for a verified gate.
 * `countFailures` is passed in rather than imported so this module stays a vocabulary and does
 * not acquire a dependency on the comparison — the same reason `publishIfNewest` takes `read`.
 */
export function exitForCompletedRun({ summary, update = false, countFailures }) {
  if (typeof countFailures !== 'function') {
    throw new Error('exitForCompletedRun needs countFailures — the vocabulary must not guess the count');
  }
  if (update) return EXIT_GATE_RED;
  return countFailures(summary, { update }) ? EXIT_GATE_RED : EXIT_OK;
}

/** The operator-facing name of a code, so a log line and a CI rule cannot disagree. */
export const EXIT_MEANINGS = Object.freeze({
  0: 'ok — the comparison ran and passed',
  1: 'gate-red — the comparison ran and failed, or a baseline was updated',
  2: 'attempt-failed — an attempt started and died; the artifact records it',
  3: 'not-started — no attempt ran (busy on a lock, or superseded by a newer attempt)',
});
