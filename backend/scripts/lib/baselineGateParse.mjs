/**
 * baselineGateParse.mjs — pure parsers for the backend baseline gate.
 * ============================================================================
 *
 * WHY THIS MODULE EXISTS (the defect it was extracted to fix).
 *
 * `scripts/test-baseline-gate.mjs` is coach-gate's ONLY regression check for the backend: it is the
 * thing that decides whether a new failure is "standing noise" or a regression. It reads vitest's
 * console output and parses two things out of it — the failing FILES and the run TOTALS.
 *
 * It could not do either in CI, and had not been able to since at least 2026-09-24. Every
 * coach-gate backend run reported:
 *
 *     test-baseline-gate: the suite did not produce a summary — treating as FAILURE.
 *
 * which reads like "the suite broke". The suite was fine. The PARSER was blind.
 *
 * vitest colors its output when the environment says to, and GitHub Actions says to. The bytes it
 * actually emits are:
 *
 *     ^[[2m     Tests ^[[22m ^[[1m^[[31m20 failed^[[39m^[[22m^[[2m | ^[[22m...
 *
 * The old regex was `/Tests\s+(?:(\d+) failed \| )?(\d+) passed/`. It matches the CLEANED text —
 * `Tests  20 failed | 11189 passed` — and nothing else. Against the real bytes, `\s+` consumes the
 * single space after `Tests` and then demands a digit; the next byte is ESC (0x1B). No match. Same
 * for the FAIL-line parser: the raw line begins `^[[41m^[[1m FAIL `, so `/^\s*FAIL\s+/` cannot match
 * a line that does not start with `FAIL`.
 *
 * That second one is the dangerous half. Repairing only the totals parser would have turned a DEAD
 * gate into a LYING one: `failing` would be empty, every entry in the recorded baseline would look
 * like it had been fixed, and the gate would print "no new failures — safe to push" and exit 0 while
 * the suite was red. A gate that cannot read its input must fail closed, never open.
 *
 * Two consequences are designed in here:
 *   1. Every parser strips ANSI ITSELF. There is no "remember to clean the input first" step to
 *      forget, and no ordering dependency between the functions.
 *   2. `interpretRun` refuses to report "green" for any run whose evidence is self-contradictory —
 *      a non-zero exit or a non-zero failure count with zero parsed FAIL lines is reported as
 *      BLIND, which the caller treats exactly like a regression.
 *
 * The parsers are pure and dependency-free so they can be tested against the real CI bytes without
 * running 1327 test files — see tests/unit/baselineGateParse.test.mjs.
 */

/**
 * ANSI escape sequences. Two families matter for a test runner's output:
 *   - CSI: `ESC [ params final` — SGR color (`\x1b[41m`), erase-line (`\x1b[2K`), cursor moves.
 *   - OSC: `ESC ] ... BEL|ST`   — terminal hyperlinks, which some CI log wrappers inject.
 */
const ANSI_CSI = /\u001B\[[0-9;?]*[ -/]*[@-~]/g;
const ANSI_OSC = /\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)/g;

/**
 * Remove ANSI escapes and carriage returns, leaving the text a human would have seen.
 * Exported because the gate echoes captured output back to the log, and a stripped echo is
 * both readable and greppable.
 */
export function stripAnsi(input) {
  return String(input ?? '')
    .replace(ANSI_OSC, '')
    .replace(ANSI_CSI, '')
    .replace(/\r/g, '');
}

/**
 * Failing test FILES, not individual test names.
 *
 * Files are the stable unit: test names churn whenever someone renames a case, and a baseline keyed
 * on names would report spurious regressions on every refactor. Set semantics — vitest prints the
 * same FAIL line more than once when a file has multiple failures.
 */
export function parseFailingFiles(output) {
  const files = new Set();
  for (const line of stripAnsi(output).split('\n')) {
    const match = line.match(/^\s*FAIL\s+(\S+)/);
    if (match) files.add(match[1].replace(/\\/g, '/'));
  }
  return [...files].sort();
}

/**
 * The run totals line. Returns null when absent — the caller must treat null as UNKNOWN, not as
 * "no failures".
 *
 * Handles both shapes vitest emits:
 *   `Tests  20 failed | 11189 passed | 10 skipped (11219)`
 *   `Tests  11189 passed (11219)`                        ← all green, no "failed" clause
 */
export function parseTotals(output) {
  const match = stripAnsi(output).match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/);
  if (!match) return null;
  return { failed: Number(match[1] || 0), passed: Number(match[2]) };
}

/**
 * Compare this run against the recorded baseline.
 *   regressions — failing now, not in the baseline. This is the thing the gate exists to catch.
 *   fixed       — in the baseline, passing now. Not a failure, but must be surfaced: a baseline
 *                 nobody prunes becomes a place to hide new breakage behind old entries.
 */
export function diffBaseline(failingFiles, baselineFiles) {
  const known = new Set(baselineFiles);
  const failing = new Set(failingFiles);
  return {
    regressions: failingFiles.filter((file) => !known.has(file)),
    fixed: baselineFiles.filter((file) => !failing.has(file)),
  };
}

/**
 * Turn a finished run into a verdict the gate can act on, refusing to call a run "green" on
 * self-contradictory evidence.
 *
 * `blind: true` means the parser could not see what happened. The caller must fail closed. The three
 * triggers are deliberately narrow — each one is a contradiction, not a heuristic:
 *
 *   no-summary                 — vitest printed no totals line at all. Either the run died mid-flight
 *                                or the output format changed. Both are unknown, not success.
 *   failures-without-files     — the totals say N>0 tests failed but not one FAIL line was parsed.
 *                                The file parser is blind; the baseline diff would be meaningless.
 *   nonzero-exit-without-files — vitest exited non-zero but no FAIL line was parsed. A load-failure
 *                                (a file that cannot even import) exits non-zero and may print no
 *                                FAIL line in the shape we match, so this must never read as clean.
 */
export function interpretRun(output, exitCode) {
  const totals = parseTotals(output);
  const failing = parseFailingFiles(output);

  if (!totals) {
    return { totals: null, failing, blind: true, reason: 'no-summary' };
  }
  if (totals.failed > 0 && failing.length === 0) {
    return { totals, failing, blind: true, reason: 'failures-without-files' };
  }
  if (exitCode !== 0 && failing.length === 0) {
    return { totals, failing, blind: true, reason: 'nonzero-exit-without-files' };
  }
  return { totals, failing, blind: false, reason: null };
}
