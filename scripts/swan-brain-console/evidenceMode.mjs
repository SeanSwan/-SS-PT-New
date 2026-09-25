/**
 * evidenceMode — what a producer's `mode` field does and does not prove.
 * @module scripts/swan-brain-console/evidenceMode
 *
 * WHY THIS IS SEPARATE FROM `gateClassify.mjs`
 * Two subjects. `gateClassify.mjs` owns the six-state judgement over a whole artifact
 * (freshness, coherence, failure counts); this module owns ONE question — "did this run
 * compare anything against a reference?" — which is the question that decides whether an
 * otherwise-perfect green result is evidence at all. The split also made room for the
 * artifact-contract requirement (Astra round 13, H02), which had to land inside Rule 4's
 * 300 lines and could not have, had the mode reasoning stayed inline.
 *
 * The split is by subject, not by line count: nothing here reads a file, knows a path, has
 * heard of a gate, or knows what a summary looks like.
 *
 * THE TWO FAILURES THIS FILE EXISTS TO MAKE IMPOSSIBLE, IN ORDER
 *
 * ROUND 12 (2026-09-21) — THE DENYLIST WAS THE DEFECT, AND ASTRA (G01) EXECUTED IT.
 * `NON_EVIDENCE_MODES` is a list of things that are NOT evidence, and the shipped rule was
 * "if the mode is not in that list, it is evidence". That makes every unrecognised mode
 * evidence by default. Astra ran the shipped classifier and got `status: "pass"` for
 * `mode: "preview"`, for `mode: 123`, and for a document with NO mode field at all — each
 * rendering as `1 passed, 0 failed, 0d old`, a green gate. The doctrine is that a pass
 * requires a result that is REAL, and "I have never heard of this producer's mode" is not
 * evidence that its run was real.
 *
 * ROUND 13 (2026-09-21) — `String()` COERCION DEFEATED THE FIX (Astra H01).
 * Round 12's repair read `String(doc?.mode ?? '').trim().toLowerCase()` and then tested
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
 * WHY AN ABSENT MODE IS STILL ACCEPTED, AND MUST BE
 * `docs/qa/AI-PLANNING-VALIDATION-LATEST.json` — the one gate in this repository with a
 * committed result — **has no `mode` field at all**, and it is a genuine green gate
 * (`{total: 53, gated: 49, passed: 49, failed: 0, knownGaps: 4}`). Requiring a mode would
 * have rejected the only real gate in the repo, and this subsystem already states the rule
 * that forbids that: a guard that fails a real gate is itself the defect. Absent mode means
 * the producer declared none; the documented contract is `{passed, failed}`.
 *
 * Astra's proposed remedy for G01 was "require a producer-specific, recognized evidence mode
 * before classification". That is the right instinct and the wrong instruction — it would
 * have broken the real gate. The distinction that matters is PRESENT-BUT-UNRECOGNISED, not
 * ABSENT. Recorded here because the difference is the whole fix.
 *
 * WHY A SHORT ALLOWLIST IS THE RIGHT ERROR TO MAKE
 * The two mistakes are not symmetric, and that asymmetry is the whole argument. If the list
 * is too SHORT, a real gate is classified `not_evidence` — loud, visible, and impossible to
 * mistake for a pass; the operator sees the unrecognised mode named in the detail and adds
 * it. If the list is too LONG, a simulated or unknown run is classified `pass` — silent, and
 * indistinguishable from a real green. The old denylist made the second mistake by
 * construction. This makes the first, on purpose.
 *
 * `compare` is the only evidence mode this tree's own producer emits (`renderResult.mjs`
 * writes `mode: update ? 'update' : 'compare'`). `live` is included because it is the mode
 * the existing gate fixtures declare for a real run, and because it is the ordinary word for
 * "this ran against the real system". A producer that declares a new real mode must add it
 * here — deliberately, with a reviewer looking at it.
 *
 * BOUNDS: pure. One already-parsed value in, a verdict or null out. No I/O, no clock.
 */

/**
 * Values of `mode` that mean "this run did not compare anything against a reference".
 *
 * `update` belongs here even though nothing about it is simulated, and that is the point:
 * `shot-diff.mjs --update` REWRITES the committed baselines and exits 0. A written baseline
 * is a successful update, not a passing comparison — the script says so in its own comment,
 * and CI refuses to run it for exactly that reason. An artifact left behind by one must
 * never be read as a green comparison, whatever its counts say.
 *
 * ROUND 14 (2026-09-21) — `in-progress` ADDED FOR Astra round-13 finding H03.
 * `renderAttempt.mjs` publishes an attempt artifact BEFORE it measures anything, so that a
 * previous run's green stops being the console's answer the instant a new attempt starts. That
 * artifact declares `mode: "in-progress"`, and this list is what makes it impossible to read
 * as evidence. It is the same verdict as `mock` for a different reason: a mock run never
 * compared, an in-progress run has not finished trying. Both prove nothing about today, and
 * neither may be rendered green — which is the whole point of publishing it early.
 */
export const NON_EVIDENCE_MODES = Object.freeze([
  'mock', 'simulated', 'dry-run', 'dryrun', 'fixture', 'update', 'in-progress',
]);

/** Values of `mode` that mean "this run DID compare against a reference". See the header. */
export const EVIDENCE_MODES = Object.freeze(['compare', 'live']);

/**
 * Decide whether a declared `mode` prevents this document from being evidence.
 *
 * Returns `{ detail }` when it does, or `null` when the document's mode is either absent or
 * a recognised evidence mode. The CALLER supplies the status, because the same refusal is
 * `not_evidence` in the eval classifier and would be a different state anywhere else — this
 * function knows only the question it was asked.
 *
 * PROPERTY PRESENCE, NOT COERCED TEXT. See the header for the four values `String()` used to
 * smuggle through. `undefined` is the only value that means "no mode was declared".
 */
export function modeDefect(doc) {
  const declared = doc?.mode;
  if (declared === undefined) return null;
  if (typeof declared !== 'string') {
    return {
      detail: `"mode" is declared but is not a string (${JSON.stringify(declared)}) — `
        + 'a malformed declaration is not the absence of one',
    };
  }
  const mode = declared.trim().toLowerCase();
  if (mode === '') {
    return { detail: '"mode" is declared but empty — an empty declaration is not the absence of one' };
  }
  if (NON_EVIDENCE_MODES.includes(mode)) {
    return {
      detail: `mode "${mode}" — this run did not compare against a reference, so it proves `
        + 'nothing about the real system',
    };
  }
  if (!EVIDENCE_MODES.includes(mode)) {
    return {
      detail: `mode "${mode}" is not a recognised evidence mode (known: `
        + `${EVIDENCE_MODES.join('/')}) — a producer mode this module cannot interpret is `
        + 'not evidence that a real comparison happened',
    };
  }
  return null;
}
