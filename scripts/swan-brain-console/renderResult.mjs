/**
 * renderResult — the artifact the render gate persists, and the contract for reading it.
 * @module scripts/swan-brain-console/renderResult
 *
 * WHY THIS IS SEPARATE FROM `shot-diff.mjs`
 * Two subjects. `shot-diff.mjs` drives a browser, measures pixels, and decides each variant;
 * this module owns the one thing that leaves the process — the JSON written to
 * `docs/qa/gate-results/three-worlds-render.json` — and the interface that file has with the
 * console that reads it. Splitting them is also what brought `shot-diff.mjs` back under
 * Rule 4's 300 lines, which the Rule 4 guard caught.
 *
 * THE DEFECT THIS FILE EXISTS TO MAKE IMPOSSIBLE (round 6, finding F2)
 * `shot-diff.mjs` used to build the document inline and wrote `generatedAt` plus
 * `{pass, fail, no_baseline, …}`. `gateHealth.mjs` declares a gate at exactly that path and
 * reads `timestamp` plus `{passed, failed}`. Producer and consumer had each been tested
 * against their OWN contract, and the interface between them was tested by nobody — so a
 * PERFECT twenty-variant render run was reported `unreadable` by the console, permanently,
 * and the console's own render gate could never be green however well it ran.
 *
 * The fix is not "add the missing keys to one side". It is to make the document a value that
 * both sides can be handed in a test. `shot-diff.test.mjs` builds it here and feeds it to the
 * real reader, so the interface is asserted rather than assumed.
 *
 * BOUNDS: pure. No I/O, no browser, no clock of its own (`now` is passed in).
 */

/** Default tolerance: 0.2% of pixels may differ before a variant is called changed. */
export const DEFAULT_MAX_DIFF_PIXEL_RATIO = 0.002;

/**
 * The CLOSED set of row statuses this gate's producer can write.
 *
 * ROUND 14 (Astra J01). `summary.failed` was reconciled against the rows, but the rows'
 * statuses themselves were never checked against anything: a row whose `status` was a typo
 * (`psas`) or a word from another system (`pending`, `ok`) was neither malformed nor a failure,
 * so a summary that claimed it as a pass was accepted. Astra reached `2 passed, 0 failed,
 * 2/2 evaluated` from a document whose second row said `psas`.
 *
 * THE SHORTFALL RULE ALREADY CATCHES MOST OF THIS, AND THAT IS WHY THE GAP SURVIVED.
 * `summaryDefect` refuses a summary with cases it cannot account for, and an unrecognised
 * status is exactly such a case — so `{variants:[{status:'pass'},{status:'pending'}],
 * summary:{passed:1,failed:0,total:2}}` is already `unreadable`. But the shortfall rule asks
 * what the SUMMARY says, and a summary that claims the row as a pass leaves no shortfall. The
 * only thing that can disagree with a summary claiming a status is the status itself.
 *
 * WHY THIS IS A LIST AND NOT A REGEX. Every member is emitted by a named producer:
 *   pass / fail / no_baseline / unreadable   `classifyComparison` (baselineComparison.mjs)
 *   written                                  `shot-diff.mjs`'s `--update` branch
 *   fail                                     also `populationFailureRows` and
 *                                            `buildAttemptFailure`'s `attempt-aborted` row
 * A regex over "looks like a word" would readmit exactly the typos this exists to catch.
 *
 * The relation to `countFailures` is asserted in `gateIdentity.contract.test.mjs`: the three
 * failure statuses are a subset of this list, and `pass`/`written` are the two that are not.
 */
export const ROW_STATUSES = Object.freeze([
  'pass', 'fail', 'no_baseline', 'unreadable', 'written',
]);

/**
 * How many variants this run FAILED on, by this gate's own definition.
 *
 * One expression, two consumers: the process exit code in `shot-diff.mjs`, and the `failed`
 * count in the persisted artifact. They used to be written twice — the artifact did not
 * carry a failure count at all — and a console showing green while CI exits 1 is the worst
 * outcome this subsystem can produce, so the number is computed once and read from here.
 *
 * A missing baseline and an unreadable comparison both count: "we have no reference for this
 * variant" and "this variant matches its reference" are different facts (see the header of
 * `shot-diff.mjs`). An `--update` run cannot fail, because it compared nothing.
 */
export function countFailures(summary, { update = false } = {}) {
  if (update) return 0;
  return summary.fail + summary.no_baseline + summary.unreadable;
}

/**
 * Reconcile the population a run MEASURED against the population the fleet DECLARES.
 *
 * THE DEFECT THIS EXISTS TO MAKE IMPOSSIBLE (round 11, finding F04)
 * `shot-diff.mjs` took its id list exclusively from the DOM and rejected only the ZERO case.
 * So a filtered harness URL produced a run whose denominator WAS its numerator: the missing
 * variant vanished from the measurement AND from the total, `failed` stayed 0, and the run
 * stamped `gate: 'three-worlds-render'` and classified as a PASS. A subset certified the
 * full-fleet gate, and nothing in the artifact recorded that anything was absent.
 *
 * A gate named for the fleet must be able to state that it saw the fleet. So the expected
 * set is supplied INDEPENDENTLY (from the manifest, never from the page), and any deviation
 * is a failure of the run rather than a smaller run.
 *
 * `duplicates` is a separate axis on purpose: a variant mounted twice is not "extra coverage",
 * it is two screenshots racing to write one baseline file, and the second silently wins.
 *
 * BOUNDS: pure. No I/O, no clock.
 */
export function reconcilePopulation({ expected = [], measured = [] } = {}) {
  const declared = new Set(expected);
  const counts = new Map();
  for (const id of measured) counts.set(id, (counts.get(id) ?? 0) + 1);

  const missing = expected.filter((id) => !counts.has(id));
  const unexpected = [...counts.keys()].filter((id) => !declared.has(id)).sort();
  const duplicates = [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id).sort();
  const ok = missing.length === 0 && unexpected.length === 0 && duplicates.length === 0;

  const parts = [];
  if (missing.length) parts.push(`${missing.length} declared variant(s) never rendered: ${missing.join(', ')}`);
  if (unexpected.length) parts.push(`${unexpected.length} undeclared variant(s) rendered: ${unexpected.join(', ')}`);
  if (duplicates.length) parts.push(`${duplicates.length} variant(s) mounted more than once: ${duplicates.join(', ')}`);

  return {
    ok,
    // `full-fleet` and `ok` agree by construction, so a reader cannot find a "full-fleet
    // subset". Anything else is named for what it is: a strict subset, or a mismatch.
    scope: ok ? 'full-fleet' : (missing.length > 0 && unexpected.length === 0 ? 'subset' : 'mismatch'),
    expected: expected.length,
    measured: measured.length,
    missing,
    unexpected,
    duplicates,
    detail: ok
      ? `all ${expected.length} declared variants rendered exactly once`
      : parts.join('; '),
  };
}

/**
 * The failed rows a population mismatch contributes to a run. Empty when the run covered the
 * fleet.
 *
 * ONE expression, two consumers — the same discipline as `countFailures`. `shot-diff.mjs`
 * pushes these into its result list, so the process exit code AND the artifact's `failed`
 * count both see the mismatch without either of them needing to understand `population`. The
 * suite calls this same function, so the test cannot stay green while the script does
 * something else.
 */
export function populationFailureRows(population) {
  if (!population || population.ok) return [];
  return [{ id: 'fleet-population', status: 'fail', detail: population.detail }];
}

/**
 * The population half of a run, decided in ONE place.
 *
 * WHY THIS IS A FUNCTION AND NOT FOUR LINES INSIDE `main()`
 * A suite can pin `reconcilePopulation` perfectly while `shot-diff.mjs` quietly stops calling
 * it — the helper would be correct and the gate would still be blind. That is the defect class
 * this whole round is about: a check whose scope is narrower than its name. So the decision,
 * including the refusal branch, is a pure function that the script calls and the suite calls,
 * and `main()` is left with nothing to get wrong.
 *
 * Returns `{ population, rows, refusal }`:
 *   `rows`     failed result rows to add to the run (empty when the fleet was covered)
 *   `refusal`  a message when the run must NOT proceed, else null
 *
 * The refusal exists only for `--update`. A partial baseline set is a WRONG REFERENCE — this
 * subsystem's own doctrine calls that worse than no reference, because it looks authoritative
 * and fails every future comparison for the wrong reason. In compare mode the same population
 * is a gate failure, not a reason to stop: reporting it is the whole point.
 */
export function planPopulation({ expected = [], measured = [], update = false } = {}) {
  const population = reconcilePopulation({ expected, measured });
  if (population.ok) return { population, rows: [], refusal: null };
  if (update) {
    return {
      population,
      rows: [],
      refusal: `refusing to record baselines for a population that is not the fleet — ${population.detail}`,
    };
  }
  return { population, rows: populationFailureRows(population), refusal: null };
}

/**
 * Build the artifact this gate persists, and which the workflow uploads.
 *
 * `timestamp` and `summary.passed`/`summary.failed` are the READER's vocabulary. The
 * render-specific buckets (`pass`, `no_baseline`, `written`, `unreadable`) stay alongside,
 * because they are what tells an operator WHY a variant failed. `generatedAt` is gone: it was
 * a second name for the same instant, and one name is one place to drift from.
 *
 * `population` is the reconciliation above, carried so the artifact states what it covered.
 * It is informational: the FAILURE is enforced upstream by a synthetic failed row, because a
 * reader that only understands `summary.failed` must not be able to miss it.
 *
 * `attempt` (round 14, Astra H03) records WHICH attempt produced this artifact, and is written
 * only when the caller supplies one. It is what lets a reader — human or agent — tell a
 * completed run from the `in-progress` artifact published at the start of a run that then died.
 * See `renderAttempt.mjs` for the lifecycle; this module only carries the field.
 */
export function buildRenderResult({
  results,
  summary,
  maxDiffPixelRatio = DEFAULT_MAX_DIFF_PIXEL_RATIO,
  update = false,
  now = new Date(),
  population = null,
  attempt = null,
} = {}) {
  return {
    gate: 'three-worlds-render',
    timestamp: now.toISOString(),
    maxDiffPixelRatio,
    mode: update ? 'update' : 'compare',
    ...(attempt ? { attempt } : {}),
    ...(population ? { population } : {}),
    summary: {
      ...summary,
      total: summary.total,
      passed: summary.pass,
      failed: countFailures(summary, { update }),
    },
    variants: results,
  };
}
