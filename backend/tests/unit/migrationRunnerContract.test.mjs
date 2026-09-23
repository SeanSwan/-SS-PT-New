import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { isMissingMetadataRelation } from '../../scripts/safe-migrate.mjs';
import { judgeVitestOutput } from '../../scripts/acceptance-gate.mjs';
import { runRunner } from '../helpers/f5-runner-harness/runRunner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, '../..');
const source = readFileSync(join(backendDir, 'scripts/safe-migrate.mjs'), 'utf8');
/** Comment-stripped. A call site or a construction cannot live in a comment. */
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** Real, currently-executable migrations (same fixture set as the F5 control-flow suite). */
const M1 = '20240115000000-update-orientation-model.cjs';
const M2 = '20250107000000-create-clients-pii.cjs';
const M3 = '20250107000001-add-master-prompt-fields.cjs';
const THREE = [M1, M2, M3];
const GENUINE = { code: 1, stdout: '', stderr: 'ERROR: relation "orientations" does not exist' };
const ALREADY_EXISTS = { code: 1, stdout: '', stderr: 'ERROR: relation "clients_pii" already exists' };

/**
 * Run a scenario AND require the harness to prove it ran. Without the two guards
 * below, a scenario the runner silently ignored would satisfy an assertion for
 * the wrong reason — the vacuity failure mode Astra's F5 exists to close. Same
 * shape as the F5 control-flow suite's helper of the same name.
 *
 * NOT used for the refusal case (5): main() refuses before it prints its banner,
 * so `sawBanner` is legitimately false there. That case asserts on the report's
 * CONTENTS instead.
 */
function ran(spec, options) {
  const result = runRunner(spec, options);
  const report = result.report;

  expect(
    report,
    `the harness produced no report (exit ${result.status}, signal ${result.signal}).\n${result.stderr}`,
  ).not.toBeNull();
  expect(
    report.sawBanner,
    'the runner never printed its banner — main() did not run, so nothing below was exercised',
  ).toBe(true);
  expect(
    report.pendingNotFound,
    'the scenario names migrations the runner does not consider executable, so the loop would have skipped them and these assertions would be vacuous',
  ).toEqual([]);

  return { result, report };
}

/**
 * S1 — RUNNER TRUTH AND LIFECYCLE: the contract test.
 * ==================================================
 * Twelve top-level cases, covering the three S1 fixes plus the acceptance gate
 * that certifies them.
 *
 * WHY THE GATE IS TESTED HERE (cases 10-12): N-1 established that this slice's
 * own acceptance command was a false-green generator — `node --test` on a vitest
 * file exits 0 having executed nothing. A slice whose instrument cannot fail is
 * not gated, so the instrument is part of the contract. These three cases test
 * `judgeVitestOutput` DIRECTLY, with no subprocess, so they cannot inherit the
 * defect they exist to catch.
 *
 * SCOPE, STATED HONESTLY: this file covers the S1 decisions "reject
 * completion-by-text", "reject failure bypass", "stop on first failure" and
 * "preserve --to". It does NOT cover "unified target" (Astra A1-03 — parent and
 * delegated child configuration) or "bounded lifecycle" (A1-05 — spawn `error`
 * handler, deadline, stdio closure). Both remain open; S1 is therefore PARTIAL,
 * and neither the runner nor this suite should be read as closing them.
 */
describe('S1 — migration runner contract', () => {
  // ---- 1-3: completion is never inferred from error text --------------------

  it('1. no error-text completion classification exists in the runner', () => {
    // A1-01. The pattern list read as six specific patterns and was measured to
    // be one unrestricted pattern plus five unreachable siblings.
    expect(code, 'the pattern list still exists').not.toContain('ALREADY_APPLIED_PATTERNS');
    expect(code, 'the error-text classifier still exists').not.toContain('isAlreadyAppliedError');
    // The failure path must not consult the child's output for a verdict at all.
    expect(code).not.toContain('result.combined)');
  });

  it('2. no code path can record a failed migration as applied', () => {
    // A1-01/A1-02. Pinned at ZERO: two paths were sanctioned before S1 (the
    // ALLOW_FAILURE hatch and the "already exists" reclassification); both are
    // gone. A reintroduced third path raises this count.
    const writes = [...code.matchAll(/INSERT\s+INTO\s+"?SequelizeMeta"?/gi)];
    expect(
      writes.length,
      'the runner writes to SequelizeMeta again — a failed migration can be recorded as applied',
    ).toBe(0);
  });

  it('3. the metadata write helper is gone, not merely unused', () => {
    // Dead code that looks like a remedy is worse than absent code: A1-03 names
    // exactly this failure (the unused getSequelize() read as the answer to the
    // parent/child configuration split). The adoption path (S3/S4) must bring its
    // own recorder, after catalog verification.
    expect(code).not.toContain('function markAsCompleted');
    expect(code).not.toContain('markAsCompleted(');
  });

  // ---- 4-5: the failure bypass is refused, before connecting ----------------

  it('4. refuses SWAN_MIGRATE_ALLOW_FAILURE before the connection is constructed', () => {
    // A1-02. ORDERING is the property, so a presence check is not enough — a
    // refusal placed after the connection would satisfy presence and still allow
    // a half-run. Anchored to the actual construction via regex, because prose in
    // this file mentions `new Sequelize` and the dead getSequelize() helper
    // contains two more.
    expect(code).toContain("process.env.SWAN_MIGRATE_ALLOW_FAILURE === '1'");
    expect(code).toContain('REFUSING TO RUN');
    const refusal = source.indexOf('REFUSING TO RUN');
    const construction = source.match(/seq\s*=\s*new Sequelize\(/);
    expect(construction, 'no connection construction found').toBeTruthy();
    expect(
      refusal,
      'the refusal is placed after the connection is constructed',
    ).toBeLessThan(construction.index);
  });

  it('5. the refusal is behavioural: exit 2, with no query and no child spawned', () => {
    // The source ordering above proves where the refusal is WRITTEN; this proves
    // it runs there. The harness's stubs record queries and spawns, so "nothing
    // happened" is measurable rather than assumed. Note the driver emits its
    // report from an exit hook, so a report EXISTS on the refusal path — the
    // assertion is on its contents, not its presence.
    const result = runRunner(
      { pending: THREE, byTarget: { [M1]: GENUINE } },
      { extraEnv: { SWAN_MIGRATE_ALLOW_FAILURE: '1' } },
    );

    expect(result.status, 'the refusal must exit 2 (usage error), not 1').toBe(2);
    expect(result.stderr).toContain('REFUSING TO RUN');
    expect(result.report, 'no harness report at all').not.toBeNull();
    expect(result.report.queryCount, 'the refused run still issued a database query').toBe(0);
    expect(result.report.spawnTargets, 'the refused run still delegated a migration').toEqual([]);
  });

  // ---- 6-7: unreadable history is not empty history ------------------------

  it('6. an unreadable migration history stops the run instead of reading as empty', () => {
    // A1-04, the highest-impact fix in S1: a bare catch made all 312 migrations
    // look pending on a permission failure or a dropped connection.
    expect(code).toContain('isMissingMetadataRelation');
    expect(code).toContain('{ ok: false, error: err }');
    expect(code).toContain('if (!history.ok)');
    // The catch-all shape must be gone.
    expect(
      code,
      'a catch block still returns an empty Set, so an unreadable history reads as an empty one',
    ).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*return new Set\(\)/);
  });

  it('7. only the confirmed absence of the metadata relation is treated as uninitialised', () => {
    // The predicate is exported precisely so permission-denied and
    // connection-loss are testable as INDEPENDENT cases — the review's own
    // requirement, and impossible to satisfy through a live database alone.
    // A fresh database: legitimate.
    expect(isMissingMetadataRelation({ parent: { code: '42P01' } })).toBe(true);
    expect(isMissingMetadataRelation({ code: '42P01' })).toBe(true);
    expect(isMissingMetadataRelation({ message: 'relation "SequelizeMeta" does not exist' })).toBe(true);

    // NOT a fresh database — every one of these must stop the run.
    expect(
      isMissingMetadataRelation({ message: 'permission denied for table SequelizeMeta' }),
      'a permission failure was read as a fresh database',
    ).toBe(false);
    expect(
      isMissingMetadataRelation({ message: 'Connection terminated unexpectedly' }),
      'a dropped connection was read as a fresh database',
    ).toBe(false);
    expect(
      isMissingMetadataRelation({ message: 'relation "users" does not exist' }),
      'the absence of a DIFFERENT relation was read as an absent metadata table',
    ).toBe(false);
    expect(isMissingMetadataRelation(undefined)).toBe(false);
  });

  // ---- 8-9: stop on first failure; preserve --to ---------------------------

  it('8. a genuine failure stops the chain at the first failure and exits 1', () => {
    // The M-01 mechanism: `--to` re-runs the whole pending chain, so continuing
    // after a failure reports migration #1's error against every innocent
    // migration behind it — the §0 production shape.
    const { result, report } = ran({
      pending: THREE,
      byTarget: { [M1]: GENUINE, [M2]: GENUINE, [M3]: GENUINE },
    });

    expect(report.spawnTargets, 'the loop continued past the first failure').toEqual([M1]);
    expect(result.status, 'a genuine failure must fail the run').toBe(1);
    expect(result.stdout).toContain('left PENDING');
  });

  it('9. an "already exists" failure is treated as a failure and stops the chain', () => {
    // The strongest fixture: this is the input the old classifier reclassified as
    // SUCCESS. It must now behave exactly like any other failure — and note this
    // also proves `--to` is still the delegation target, since the spawn is
    // observable.
    const { result, report } = ran({
      pending: THREE,
      byTarget: { [M1]: ALREADY_EXISTS },
    });

    expect(report.spawnTargets, 'the loop continued past an "already exists" failure').toEqual([M1]);
    expect(result.status, 'an "already exists" failure must fail the run').toBe(1);
    expect(result.stdout).toContain('left PENDING');
  });

  // ---- 10-12: the acceptance instrument itself ----------------------------

  it('10. the acceptance gate refuses the node --test false-green signature', () => {
    // THE N-1 SIGNATURE, verbatim from a real `node --test` run of a vitest file.
    // `# suites 0` with `# tests 1` means the FILE was counted as the only test.
    const tap = [
      'TAP version 13',
      '# Subtest: tests/unit/migrationGuardTableNames.test.mjs',
      'ok 1 - tests/unit/migrationGuardTableNames.test.mjs',
      '1..1',
      '# tests 1',
      '# suites 0',
      '# pass 1',
      '# fail 0',
    ].join('\n');

    const verdict = judgeVitestOutput(tap, 0, 5);
    expect(verdict.ok, 'the gate accepted a TAP run as evidence').toBe(false);
    expect(verdict.reason).toMatch(/TAP/);
    expect(verdict.reason).toMatch(/zero cases executed/);
  });

  it('11. the acceptance gate refuses a run in which every case was skipped', () => {
    // The second false-green shape, and the one a naive fix misses: under the
    // CORRECT runner, a name filter that deselects everything still exits 0.
    // Measured: `npx vitest run <file> -t ZZZ` → `Tests 5 skipped (5)`, exit 0.
    const verdict = judgeVitestOutput('      Tests  5 skipped (5)', 0, 5);
    expect(verdict.ok, 'the gate accepted a run where nothing executed').toBe(false);
    expect(verdict.reason).toMatch(/SKIPPED/);

    // and an empty file, run for real, reports zero passed
    expect(judgeVitestOutput('      Tests  0 passed (0)', 0, 12).ok).toBe(false);
    // and a run that produced no summary at all cannot be verified
    expect(judgeVitestOutput('RUN v4.0.18\n ✓ file (5 tests)', 0, 5).ok).toBe(false);
  });

  it('12. the acceptance gate strips ANSI and requires an exact case count', () => {
    // Vitest colourises its summary EVEN WHEN stdout IS NOT A TTY, so the real
    // captured line begins with ESC[2m, not with whitespace, and each number is
    // individually wrapped. A `^\s*Tests` anchor never matches it — the first
    // version of the gate reported "no summary line" on a run that printed one.
    const realAnsiLine =
      '\u001b[2m      Tests \u001b[22m \u001b[1m\u001b[32m5 passed\u001b[39m\u001b[22m\u001b[90m (5)\u001b[39m';

    expect(judgeVitestOutput(realAnsiLine, 0, 5).ok, 'the ANSI summary was not parsed').toBe(true);

    // An exact match is required in both directions.
    expect(judgeVitestOutput(realAnsiLine, 0, 6).ok, 'a count mismatch was accepted').toBe(false);
    expect(judgeVitestOutput('      Tests  12 passed (12)', 0, 12).ok).toBe(true);
    // A failing case fails the gate even if the passed count happens to match.
    expect(judgeVitestOutput('      Tests  11 passed | 1 failed (12)', 1, 11).ok).toBe(false);
    // A non-zero exit is never a pass.
    expect(judgeVitestOutput('      Tests  12 passed (12)', 1, 12).ok).toBe(false);
  });
});
