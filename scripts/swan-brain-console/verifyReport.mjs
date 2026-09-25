/**
 * verifyReport — how a verification harness records and reports its verdict.
 * @module scripts/swan-brain-console/verifyReport
 *
 * WHY THIS IS A MODULE RATHER THAN FIVE LINES AT THE END OF EACH VERIFIER
 * The tally was inline in the verifiers, and inline it had a defect that no test could
 * reach: it computed `${results.length - failed.length}/${results.length}` and exited
 * `failed.length ? 1 : 0`. With an EMPTY result set that prints **`0/0 checks passed`** and
 * exits **0** — a green run that asserted nothing.
 *
 * Measured before fixing:
 *
 *     results = []  ->  "printed: [browser] 0/0 checks passed"
 *                       "exit code would be: 0 <- 0 means GREEN"
 *
 * That is the same defect as "not run ≠ pass", and the same family as a guard that cannot
 * reach its own assertion: the reporter is the last thing to run, so a harness that
 * silently stopped checking anything still reports success. It is unreachable today only
 * because the checks happen to be written out one by one; it becomes reachable the moment
 * a future refactor makes them conditional.
 *
 * A run that checked nothing is NOT a pass. `reportResults` returns a non-zero count for
 * the vacuous case so the caller's `process.exit` is correct without the caller knowing
 * this rule.
 *
 * `log` is injectable so the report is testable without capturing stdout.
 */

/** Format one result line. Exported so the format itself is testable. */
export function formatResult(r) {
  return `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`;
}

/**
 * Print every result, then a tally. Returns the number of failures the caller should
 * treat as fatal — which is 1 for a vacuous run, not 0.
 */
export function reportResults(results, label, { log = console.log } = {}) {
  const list = Array.isArray(results) ? results : [];
  const failed = list.filter((r) => !r.ok);

  for (const r of list) log(formatResult(r));

  /*
   * THE VACUITY GUARD. Zero results means the harness checked nothing — not that
   * everything passed. It must not read as a pass, and it must not exit 0.
   */
  const vacuous = list.length === 0;
  if (vacuous) {
    log('FAIL  (no checks ran)  — a harness that asserted nothing has not passed');
  }

  const passed = list.length - failed.length;
  log(`\n${label} ${passed}/${list.length} checks passed${vacuous ? ' — VACUOUS, treated as failure' : ''}`);

  return vacuous ? 1 : failed.length;
}
