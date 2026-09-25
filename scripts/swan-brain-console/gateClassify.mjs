/**
 * gateClassify — what a gate result MEANS, with no idea where gates are declared.
 * @module scripts/swan-brain-console/gateClassify
 *
 * WHY THIS IS SEPARATE FROM `gateHealth.mjs`
 * Two subjects, and only one of them is about counting. `gateHealth.mjs` owns the registry
 * (which gates exist, what declares each one) and assembles the report; this module owns the
 * single judgement "given a parsed result file, what is it?" Keeping them together pushed
 * `gateHealth.mjs` to 338 lines, past Rule 4's 300 — and the Rule 4 guard caught it, which is
 * the guard working. The split is by subject, not by line count: nothing here reads a file,
 * or knows a path.
 *
 * ROUND 13 CORRECTED A CLAIM IN THIS HEADER. It used to end "...or has heard of a gate." That
 * stopped being true when the artifact contract became a required argument (Astra H02): the
 * classifier is now handed a gate's DECLARED ARTIFACT SHAPE and refuses anything that does not
 * match it. What is still true, and is the point of the sentence, is that this module has never
 * heard of the REGISTRY — it does not know which gates exist, which paths belong to them, or
 * that `gateHealth.mjs` exists. It receives one contract, about one document, and judges it.
 * `gateIdentity.mjs` owns the contracts; this module only enforces the one it is given.
 *
 * THE ONE JUDGEMENT IT MAKES
 * Exactly one of six states is `pass`, and `pass` requires a result that is real, fresh,
 * admissible for the gate whose path supplied it, and has zero failures. Every branch below
 * exists to stop something that is NOT that from being read as it — because from the artifact
 * side, a gate that never ran and a gate that passed are the same thing: silence.
 *
 * ORDER IS THE ARGUMENT, in both classifiers. See `classifyEval` for the reasoning.
 *
 * BOUNDS: pure functions over an already-parsed value and an already-resolved contract. No
 * I/O, no clock (`now` is passed in), no registry, no paths.
 */

/*
 * ROUND 12 — the summary/counter vocabulary moved to its own module, by subject, so the
 * stricter checks round 12 required would fit inside Rule 4. Re-exported below so
 * `gateHealth.mjs`'s re-export chain and every existing importer keep working unchanged.
 *
 * ROUND 13 — the same pressure hit twice more, and for the same reason. The mode reasoning
 * moved to `evidenceMode.mjs` and the artifact-contract requirement to `gateIdentity.mjs`,
 * because H01 and H02 both had to land inside Rule 4 and neither could have while every
 * subject still lived in this file. Re-exported for the same reason as before: an importer
 * should not have to know that a subject moved.
 */
import { summaryDefect } from './summaryDefect.mjs';
import { modeDefect } from './evidenceMode.mjs';
import { admissibilityDefect } from './gateIdentity.mjs';

export {
  summaryDefect, WAIVED_COUNTERS, AWAITING_COUNTERS, EXCLUSION_COUNTERS,
} from './summaryDefect.mjs';
export { modeDefect, NON_EVIDENCE_MODES, EVIDENCE_MODES } from './evidenceMode.mjs';

const DAY_MS = 86_400_000;

/**
 * How far a result's timestamp may sit in the FUTURE before it stops being evidence.
 *
 * Round 11 (2026-09-20). Freshness had an upper age bound and NO lower one, so a result
 * dated 2099 classified as `pass` with `ageDays: -26401` — and the console would have shown
 * `1 passed, 0 failed, -26401d old` as a green gate, for decades. A future-dated result is
 * not "very fresh"; it is a result whose clock is wrong, and the module's own rule is that
 * `pass` requires a result that is REAL.
 *
 * The allowance is a day rather than zero because a clock correction of seconds or minutes
 * is ordinary and must not turn a genuine green gate into a non-pass. Beyond it, the
 * timestamp is not describing the run we are being asked to trust.
 */
export const FUTURE_SKEW_DAYS = 1;

/*
 * ROUND 13 — `EVIDENCE_MODES` / `NON_EVIDENCE_MODES` and the whole argument for the
 * allowlist now live in `evidenceMode.mjs`, beside the `modeDefect` function that reads
 * them. They are re-exported above, so nothing that imported them from here had to change.
 * The reasoning did not move because it was wrong; it moved because the artifact-contract
 * requirement below had to land inside Rule 4, and this was the largest subject in the file.
 */

/** Whole days between an ISO timestamp and `now`, or null when unparseable. */
function ageInDays(iso, now) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const days = (now - t) / DAY_MS;
  /*
   * Round 11 (2026-09-20). `Math.floor` on a small negative is -1, so a result one SECOND
   * in the future reported `ageDays: -1` and the operator-facing detail read "-1d old".
   * Floor away from zero on both sides instead: a few seconds of clock skew reads as 0.
   */
  return days < 0 ? -Math.floor(-days) : Math.floor(days);
}

/**
 * Classify an eval-style result.
 *
 * ORDER IS THE ARGUMENT, AND ROUND 13 ADDED A STEP AT THE FRONT.
 *
 * ADMISSIBILITY IS CHECKED FIRST (Astra H02). Before asking what a result MEANS, ask whether
 * it is this gate's result at all. A foreign or self-contradictory document has no meaning to
 * report, and answering the later questions about it produces a confident green about a file
 * that was never evidence about this gate — which is exactly what Astra reproduced.
 *
 * Simulation is checked before freshness, because a mock run is "not evidence" whether it is
 * old or new, and reporting an old mock as merely `stale` would suggest that running it again
 * would help. Coherence is checked before freshness, because a summary that cannot be counted
 * cannot be aged into meaning. Freshness is checked before failure count, because a stale
 * green result is not a pass — it is the exact shape that let six-month-old numbers be read
 * as current.
 *
 * `contract` IS REQUIRED, AND ITS ABSENCE IS A REFUSAL RATHER THAN A DEFAULT.
 * Round 13's H02 was a check whose scope was narrower than its name: the reader consulted the
 * artifact's own claims and never its identity. Making the contract an optional fourth
 * parameter would have preserved the bypass — every existing caller would have kept the old
 * permissive behaviour silently, and the new check would have applied only where someone
 * remembered to ask for it. So it is required, and `admissibilityDefect` returns a refusal
 * when it is missing. `gateHealth.mjs` is the only production caller and supplies
 * `artifactContract(gate.id)`.
 */
export function classifyEval(doc, now, staleAfterDays, contract) {
  /*
   * ROUND 13 (2026-09-21) — ADMISSIBILITY BEFORE MEANING (Astra H02).
   *
   * The refusal is returned with the document's age, because "this is not your gate's
   * artifact, and it is 3 days old" is more useful to an operator than either fact alone.
   */
  const inadmissible = admissibilityDefect(contract, doc);
  if (inadmissible) {
    return {
      status: inadmissible.status,
      detail: inadmissible.detail,
      ageDays: ageInDays(doc?.timestamp, now),
    };
  }
  /*
   * ROUND 11 (2026-09-20) — `.trim()` IS LOAD-BEARING, AND ITS ABSENCE WAS A FALSE PASS.
   * This read `String(doc?.mode ?? '').toLowerCase()`, so `"Mock"` and `"MOCK"` were caught
   * but `" mock "` and `"\tmock\n"` were not: the comparison is exact, and lowercasing does
   * not remove whitespace. A producer whose mode field carried a stray space — the kind of
   * thing a YAML or CSV round-trip produces — had its simulated run classified as REAL
   * EVIDENCE and reported green. The denylist only works if it sees the value it is denying.
   */
  /*
   * ROUND 13 (2026-09-21) — PROPERTY PRESENCE, NOT COERCED TEXT (Astra H01).
   *
   * Round 12's fix read `String(doc?.mode ?? '').trim().toLowerCase()` and then tested
   * `mode !== ''`. That distinguishes "normalised to empty" from "non-empty", which is NOT the
   * distinction that matters. Astra executed the shipped classifier and got `pass` for four
   * DECLARED-but-malformed values, because `String()` coerces every one of them:
   *
   *     mode: null         -> String(null ?? '')  = ''        -> read as ABSENT  -> pass
   *     mode: ""           -> ''                              -> read as ABSENT  -> pass
   *     mode: []           -> String([])          = ''        -> read as ABSENT  -> pass
   *     mode: ["compare"]  -> String(['compare']) = 'compare' -> IN THE ALLOWLIST -> pass
   *
   * The last is the sharpest: an ARRAY was accepted as evidence that a real comparison
   * happened. A `mode` that is PRESENT must be a nonempty STRING before it is normalised or
   * looked up. Only `undefined` — the property genuinely not declared — means "no mode", and
   * that case must keep working, because the one gate in this repository with a committed
   * result declares no mode at all.
   *
   * The rule itself now lives in `evidenceMode.mjs` with the allowlist it reads, so the four
   * values above and the list that must refuse them cannot drift apart in different files.
   */
  const badMode = modeDefect(doc);
  if (badMode) {
    return {
      status: 'not_evidence',
      detail: badMode.detail,
      ageDays: ageInDays(doc?.timestamp, now),
    };
  }

  const s = doc?.summary;
  const defect = summaryDefect(s);
  if (defect) return { status: 'unreadable', detail: defect, ageDays: null };

  const ageDays = ageInDays(doc?.timestamp, now);
  if (ageDays === null) {
    return { status: 'unreadable', detail: 'missing or unparseable "timestamp"', ageDays: null };
  }
  /*
   * ROUND 11 — freshness had an upper bound and no lower one, so a result dated 2099 was
   * "fresh" for the next seventy years and the panel rendered it green. A timestamp ahead of
   * now does not describe a run that has happened.
   */
  /*
   * ROUND 12 (G05) — THE DECISION USES RAW MILLISECONDS; ONLY THE DISPLAY ROUNDS.
   *
   * `ageDays` floors to whole days, and this comparison used the floored value. The effective
   * allowance was therefore not `FUTURE_SKEW_DAYS` but `FUTURE_SKEW_DAYS + 1`: a result 47
   * hours ahead floored to `-1` and sat INSIDE a one-day allowance. Astra executed the shipped
   * classifier at a fixed clock and measured PASS at 47h and `unreadable` at 48h — so the
   * stated allowance was, in practice, nearly doubled. The boundary is now exact.
   */
  const ageMs = now - Date.parse(doc?.timestamp); // positive = in the past
  if (ageMs < -FUTURE_SKEW_DAYS * DAY_MS) {
    const aheadDays = (-ageMs / DAY_MS).toFixed(1);
    return {
      status: 'unreadable',
      detail: `timestamp is ${aheadDays} day(s) in the FUTURE (allowed skew `
        + `${FUTURE_SKEW_DAYS}d) — a result dated ahead of now cannot be evidence about today`,
      ageDays,
    };
  }
  /*
   * ROUND 13 (2026-09-21) — THE STALE BOUNDARY USES RAW MILLISECONDS TOO (Astra H05).
   *
   * Round 12 fixed only the FUTURE side of this comparison. The stale side still compared the
   * floored `ageDays`, so a nominal 14-day limit accepted almost 15 days: Astra executed the
   * shipped classifier and measured `pass` at 359 hours old (displaying `14d old`), turning
   * `stale` only at 360. Rounding is now confined to the DISPLAY on both sides.
   */
  if (ageMs > staleAfterDays * DAY_MS) {
    return {
      status: 'stale',
      detail: `result is ${ageDays} days old (limit ${staleAfterDays}) — not evidence about today`,
      ageDays,
    };
  }
  if (s.failed > 0) {
    return { status: 'fail', detail: `${s.failed} of ${s.total ?? '?'} failed`, ageDays };
  }
  if (!(s.passed > 0)) {
    return { status: 'unreadable', detail: 'summary reports zero passes — nothing was verified', ageDays };
  }
  /*
   * ROUND 11 — the coverage rides in the detail. A gate that waived part of its population and
   * a gate that evaluated all of it both read `pass`, and the operator could not tell them
   * apart: `49 passed, 0 failed` rendered identically for 49 of 49 and for 49 of 53. How much
   * of the gate actually ran is the number this panel exists to show.
   */
  const coverage = s.total === undefined ? '' : `, ${s.passed + s.failed}/${s.total} evaluated`;
  return { status: 'pass', detail: `${s.passed} passed, 0 failed${coverage}, ${ageDays}d old`, ageDays };
}

/**
 * Classify the shadow-window file.
 *
 * `until` is a date, and a date in the past is a finding rather than a footnote: past it,
 * the shadowed gates block again automatically, and `_review_at_expiry` says the window
 * must be reviewed. Reporting a lapsed window as `pass` would hide a change in what
 * blocks a merge, which is the single most consequential thing this file controls.
 */
export function classifyWindow(doc, now) {
  const until = Date.parse(doc?.until);
  if (!Number.isFinite(until)) {
    return { status: 'unreadable', detail: 'no parseable "until" — the window has no end', ageDays: null };
  }
  if (until < now) {
    const days = Math.floor((now - until) / DAY_MS);
    return {
      status: 'fail',
      detail: `shadow window expired ${days} day(s) ago — these gates block again; review at expiry`,
      ageDays: days,
    };
  }
  const open = Math.floor((until - now) / DAY_MS);
  return { status: 'pass', detail: `window open for ${open} more day(s)`, ageDays: null };
}
