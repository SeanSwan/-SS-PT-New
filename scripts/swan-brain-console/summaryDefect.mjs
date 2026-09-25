/**
 * summaryDefect — "is this summary usable as a count of what happened?"
 * @module scripts/swan-brain-console/summaryDefect
 *
 * WHY THIS IS ITS OWN MODULE
 * It was 62 lines inside `gateClassify.mjs`, and round 12 had to make it stricter. The
 * stricter version did not fit: `gateClassify.mjs` was at 290 of Rule 4's 300 lines, and a
 * guard that has to be loosened to fit is a guard that gets loosened. The split is by subject
 * — this module answers one question about a SUMMARY, and knows nothing about modes,
 * timestamps, gates, files or paths.
 *
 * THE ONE QUESTION
 * A summary is usable when every count it declares is a count, its arithmetic can be true,
 * and any case it did not evaluate is NAMED rather than silent. Silence is the thing ban 35
 * forbids reading as green: a gate that never ran and a gate that passed both leave a gap,
 * and the difference is whether the producer said so.
 *
 * ROUND 12 (2026-09-21) — TWO EARLY RETURNS LET A DECLARED NOT-RUN PASS.
 * `summaryDefect` returned before it looked at the un-run counters in two places: when
 * `total` was absent, and when the shortfall was zero. Astra (round 12, G02) executed the
 * shipped function and got `null` — meaning PASS — for all of:
 *
 *     { passed: 1, failed: 0, notRun: 99 }
 *     { passed: 1, failed: 0, total: 1, notRun: 99 }
 *
 * The first declares ninety-nine cases that have not run and was reported as a green gate
 * with `0d old`. The second declares more un-run cases than it has cases at all. Both are the
 * module's own failure mode, in the module's own file: a check whose scope was narrower than
 * its name. The counter validation now runs BEFORE either early return, and a malformed
 * counter is a defect rather than a number to skip.
 */
const notCount = (v) => !Number.isInteger(v) || v < 0;

/**
 * Summary fields that name cases inside a gate's own population that were DELIBERATELY not
 * evaluated — waived scope, by a decision. These excuse a shortfall.
 *
 * These exist so a shortfall can be told apart from silence. `{passed: 5, total: 500}` means
 * 495 cases neither passed nor failed and nobody said why; `{passed: 5, total: 7,
 * knownGaps: 2}` means the same 2 cases were named. The first is ban 35; the second is a
 * producer being honest. `gated` is deliberately absent: it counts the cases that WERE
 * evaluated, so it can never account for one that was not.
 *
 * ROUND 11 (2026-09-20) — THIS LIST HELD SIX FIELDS AND THREE OF THEM MEANT THE OPPOSITE.
 * `notRun`, `pending` and `blocked` were accepted here under a header reading "deliberately
 * NOT evaluated". They do not mean that: they mean the work HAS NOT HAPPENED YET. Because
 * they excused a shortfall, `{passed: 1, failed: 0, total: 100, notRun: 99}` classified as
 * `pass` and rendered as `1 passed, 0 failed` — with the 99 nowhere on screen, in the one
 * panel whose doctrine is that not run is not pass. They now live in AWAITING_COUNTERS.
 */
export const WAIVED_COUNTERS = Object.freeze(['knownGaps', 'excluded']);

/**
 * Summary fields naming cases that have NOT YET been evaluated. Recorded and reported, and
 * deliberately NOT accepted as a substitute for evidence.
 *
 * `skipped` sits here rather than with the waivers because a skip is something that happened
 * to a case which was supposed to run; only the producer knows whether that was a decision or
 * a failure, and the safe reading is the one that does not manufacture a green.
 */
export const AWAITING_COUNTERS = Object.freeze(['notRun', 'skipped', 'pending', 'blocked']);

/**
 * The union — the honest description of "a field that names un-run cases", kept because
 * callers legitimately want to REPORT all of them. It is NOT the excuse list: only
 * WAIVED_COUNTERS excuses a shortfall. A guard asserts the two sets are disjoint and that
 * this is exactly their union, so the distinction cannot quietly collapse back into one list.
 */
export const EXCLUSION_COUNTERS = Object.freeze([...WAIVED_COUNTERS, ...AWAITING_COUNTERS]);

/**
 * Is this summary usable as a count of what happened?
 *
 * Returns a reason string when it is NOT, and null when it is. Type-checking alone is not
 * enough, and that was this module's own bug: `Number.isFinite` accepts `failed: -1`, and
 * `{passed: 5, failed: 0, total: 500}` is three finite numbers describing 495 cases nobody
 * evaluated. Both were reported as `pass` — the module's own failure mode, in its own file.
 *
 * The check is deliberately NOT `total === passed + failed`. The real producer,
 * `docs/qa/AI-PLANNING-VALIDATION-LATEST.json`, reports `{total: 53, gated: 49, passed: 49,
 * failed: 0, knownGaps: 4}`: `total` counts the four known gaps that `gated` excludes, so
 * `passed + failed` (49) is legitimately less than `total` (53). A naive equality check would
 * reject a green gate, and a guard that fails a real gate is itself the defect.
 *
 * So the rule is: counts must be counts; `total` must not contradict them; and a shortfall
 * must be NAMED by the producer rather than left as silence.
 */
export function summaryDefect(s) {
  if (!s || typeof s !== 'object') return 'no usable summary { passed, failed }';

  if (notCount(s.passed) || notCount(s.failed)) {
    return `summary counts are not non-negative integers (passed: ${JSON.stringify(s.passed)}, `
      + `failed: ${JSON.stringify(s.failed)}) — an unusable count is not "zero failures"`;
  }

  /*
   * ROUND 12 (G02) — MALFORMED EXCLUSION COUNTERS ARE A DEFECT, NOT A NUMBER TO SKIP.
   * This used to fold every unusable counter to zero (`Number.isInteger(s[f]) && s[f] > 0 ?
   * s[f] : 0`), so `{total: 2, knownGaps: 1, notRun: -99}` reported the notRun field as
   * though it had never been written. A producer that emits a malformed counter has not
   * made a declaration this function can reconcile, and reading its silence as agreement is
   * the same mistake in a smaller place. Checked FIRST, so the message names the actual
   * problem rather than a downstream arithmetic symptom.
   */
  for (const field of EXCLUSION_COUNTERS) {
    if (s[field] !== undefined && notCount(s[field])) {
      return `"${field}" is not a non-negative integer (${JSON.stringify(s[field])}) — a `
        + 'malformed counter is not an absent one';
    }
  }

  const sumOf = (fields) => fields.reduce((n, field) => n + (s[field] ?? 0), 0);
  const waived = sumOf(WAIVED_COUNTERS);
  const awaiting = sumOf(AWAITING_COUNTERS);

  /*
   * ROUND 12 (G02) — THIS CHECK MOVED ABOVE THE `total === undefined` RETURN.
   * `total` is optional: the documented contract is `{ passed, failed }`, and requiring a
   * denominator would break every producer that does not report one. But "no denominator"
   * is not a licence to ignore a declaration the producer DID make. A summary that names
   * cases which have not run is not a pass, whether or not it also reports a total.
   */
  if (s.total === undefined) {
    if (awaiting > 0) {
      return `${awaiting} case(s) have not run yet (declared via `
        + `${AWAITING_COUNTERS.join('/')}) — a named not-run is still not a pass, and an `
        + 'absent "total" does not make it one';
    }
    return null;
  }

  if (notCount(s.total)) {
    return `"total" is not a non-negative integer (${JSON.stringify(s.total)})`;
  }

  const evaluated = s.passed + s.failed;
  if (evaluated > s.total) {
    return `"total" (${s.total}) is smaller than passed + failed (${evaluated}) — the arithmetic cannot be true`;
  }

  const shortfall = s.total - evaluated;

  /*
   * ROUND 11 — the arithmetic is checked in BOTH directions, over the WHOLE declaration.
   * Only `named < shortfall` was ever tested, so `{passed: 1, failed: 0, total: 2,
   * skipped: 999}` was accepted: a producer claiming to have skipped 999 cases out of 2. An
   * over-declaration is exactly as incoherent as a silent shortfall. Checked before the
   * awaiting rule so an incoherent declaration is reported as incoherent rather than as
   * "999 of 2 have not run".
   *
   * ROUND 12 (G02) — AND IT NOW RUNS BEFORE THE `shortfall === 0` RETURN. That return used
   * to end the function the moment a summary balanced, so `{total: 1, passed: 1, failed: 0,
   * notRun: 99}` — one case, ninety-nine declared un-run — was reported as a pass. A balanced
   * total says the EVALUATED cases add up; it says nothing about the ones the producer has
   * told us did not run.
   */
  if (waived + awaiting > shortfall) {
    return `only ${shortfall} case(s) of ${s.total} are unaccounted for, but `
      + `${waived + awaiting} are declared un-run — the arithmetic cannot be true`;
  }

  /*
   * ROUND 11 — naming a case that has not run does not make it run. This is the module's own
   * doctrine turned on itself: `notRun`, `pending`, `blocked` and `skipped` are still COUNTED
   * and still named in this message, but they no longer buy a pass.
   */
  if (awaiting > 0) {
    return `${awaiting} of ${s.total} cases have not run yet (declared via `
      + `${AWAITING_COUNTERS.join('/')}) — a named not-run is still not a pass`;
  }

  // Naming SOME of the gap is not naming the gap: 5 evaluated plus a declared 1 does not
  // account for a total of 20.
  if (waived < shortfall) {
    return `${shortfall} of ${s.total} cases are neither passed nor failed and no exclusion `
      + 'names them — unaccounted silence is not evidence of a pass';
  }
  return null;
}
