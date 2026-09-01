/**
 * Reading vitest's output — the part of the push gate that can be tested.
 * ============================================================================
 *
 * Split out of `test-baseline-gate.mjs` for one blunt reason: that file runs the suite at
 * import time. A test importing its parsers would have spawned vitest from inside vitest.
 * The parsers are pure string work and belong somewhere a test can reach without starting
 * anything.
 *
 * THE BUG THIS SPLIT EXISTS TO KEEP FIXED. vitest writes colour. Its summary is not
 * `Tests  6 failed | 9904 passed` but the same text wrapped in escape sequences, and its
 * file lines are not `FAIL path` but ` FAIL ` inside a red background. Both regexes below
 * originally anchored on literal text with no escapes in it, so against real output they
 * matched NOTHING: `parseTotals` returned null, the gate's "did not produce a summary"
 * branch fired, and it exited 1 on every tree it was ever run against.
 *
 * It failed CLOSED, which is exactly why it survived unnoticed. A gate stuck on FAIL is
 * indistinguishable from a red suite, and that suite IS red — so the wrong answer was the
 * expected one. The gate's own header warns that "a gate that cries wolf gets routed
 * around, and then it is not a gate". It had quietly become that gate.
 *
 * Measured against real captured output: raw gave 0 files and null totals; stripped gave
 * 35 files and { failed: 6, passed: 9904 }. BOTH parsers were blind, not just the one
 * whose failure was visible.
 */

/**
 * The escape character is matched explicitly. Stripping a bare bracket-digits-m would also
 * eat legitimate bracketed text, and these parsers read file paths.
 */
export function stripAnsi(text) {
  return String(text).replace(/\u001b\[[0-9;]*m/g, '');
}

/** Failing FILES, not individual test names — test names churn, files are stable. */
export function parseFailingFiles(out) {
  const files = new Set();
  for (const line of stripAnsi(out).split('\n')) {
    const m = line.match(/^\s*FAIL\s+(\S+)/);
    // Normalised to forward slashes: the baseline is committed and read on both platforms,
    // and a path recorded with backslashes looks like a regression to everyone else.
    if (m) files.add(m[1].replace(/\\/g, '/'));
  }
  return [...files].sort();
}

export function parseTotals(out) {
  const m = stripAnsi(out).match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/);
  return m ? { failed: Number(m[1] || 0), passed: Number(m[2]) } : null;
}

/**
 * Files that could not be LOADED because a declared dependency is absent, keyed to the
 * package that is missing.
 *
 * Unloadable and failing are different facts, and conflating them makes the gate cry wolf
 * about an `npm install`. A missing package is not a regression: no code changed, the test
 * did not run, and telling someone "do not push, fix these" for a file that never executed
 * sends them to read a test that is fine.
 *
 * It is also not something to record into the baseline. A baseline entry is a promise that
 * a file is expected to fail; an entry made because a package was missing that day becomes
 * a permanent excuse the moment the package comes back.
 */
export function parseMissingPackages(out) {
  const missing = new Map();
  // vitest GROUPS suites that failed for the same reason: six consecutive `FAIL` lines
  // followed by ONE error block. Attributing the package to the nearest preceding FAIL
  // therefore credits only the last file of each group, and the other five look like
  // ordinary regressions — which is precisely the wrong answer this parser exists to stop
  // the gate giving. Every file since the previous error block shares the error.
  let pending = [];
  for (const line of stripAnsi(out).split('\n')) {
    const f = line.match(/^\s*FAIL\s+(\S+)/);
    if (f) { pending.push(f[1].replace(/\\/g, '/')); continue; }
    const p = line.match(/Cannot find package '([^']+)'/);
    if (p) {
      for (const file of pending) if (!missing.has(file)) missing.set(file, p[1]);
      pending = [];
      continue;
    }
    // Any OTHER error ends the group without claiming it: those files failed for their own
    // reasons and must stay classified as regressions.
    if (/^\s*(?:Error|TypeError|SyntaxError|ReferenceError|AssertionError):/.test(line)) pending = [];
  }
  return missing;
}
