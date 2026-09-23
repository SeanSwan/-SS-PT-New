/**
 * safeMigrateControlFlow.test.mjs
 * ==============================
 * Astra RT-4/F5 (2026-09-20).
 *
 * WHAT THIS REPLACES
 * ------------------
 * Every guard on safe-migrate.mjs before this file asserted on its SOURCE TEXT:
 * `expect(compact).toContain('if (!ALLOW_FAILURE) process.exit(1);')`. That is a
 * wiring check, and it was the only kind available — the file called main() at
 * module scope with no exports, so importing it executed the production
 * migration runner. The 2026-09-20 invocation guard removed that constraint.
 *
 * Astra's finding, in its own words:
 *
 *   "retain limited source checks as wiring checks, but execute the real runner
 *    control flow against intercepted database, child-process, and exit
 *    boundaries. Assert zero metadata writes on ordinary failure and assert that
 *    later migrations are not invoked."
 *
 * HOW
 * ---
 * tests/helpers/f5-runner-harness/ runs the real `main()` in a child process
 * with exactly two specifiers redirected — `sequelize` and `child_process` — so
 * the runner's own loop, branches, error classification and exit codes are the
 * ones under test. Everything else (discovery, `fs`, migration filenames) is
 * real. Each scenario is driven by scripted per-migration outcomes.
 *
 * WHY THE ASSERTIONS ARE BELIEVABLE
 * ---------------------------------
 * A behavioural test carries a different risk from a source ratchet: not
 * vacuity, but assertions that are not load-bearing. Two mechanisms cover it.
 *
 *   - `ran()` refuses any scenario where the runner did not print its banner, or
 *     where a named migration was not actually pending. A scenario that silently
 *     shrinks to zero pending migrations cannot pass.
 *   - the mutation self-check at the bottom drives deliberately broken copies of
 *     the runner and requires the headline assertions to go red, reproducing the
 *     real production symptom (nine migrations all reporting the first
 *     migration's error) rather than a synthetic one.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { runRunner } from '../helpers/f5-runner-harness/runRunner.mjs';
import { cleanupMutants, writeMutant } from '../helpers/f5-runner-harness/mutants.mjs';

/** Real, currently-executable migrations. See `pendingNotFound` in ran(). */
const M1 = '20240115000000-update-orientation-model.cjs';
const M2 = '20250107000000-create-clients-pii.cjs';
const M3 = '20250107000001-add-master-prompt-fields.cjs';
const THREE = [M1, M2, M3];

/** A failure the runner must treat as genuine. */
const GENUINE = { code: 1, stdout: '', stderr: 'ERROR: relation "orientations" does not exist' };

/** A failure the runner is allowed to reclassify: structural idempotency. */
const ALREADY_EXISTS = { code: 1, stdout: '', stderr: 'ERROR: relation "clients_pii" already exists' };

/**
 * Run a scenario and insist it produced a usable, non-vacuous result.
 *
 * Three separate ways this could silently prove nothing, each refused loudly:
 * no report at all, a runner that never executed, and a scenario whose
 * migration names are not pending — which would leave the loop with nothing to
 * do and every assertion below trivially satisfied.
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
    'the scenario names migrations the runner does not consider executable — '
    + 'the loop would have skipped them and the assertions would be vacuous. '
    + 'Update the M1/M2/M3 constants at the top of this file.',
  ).toEqual([]);

  expect(
    report.pendingCount,
    'the scenario did not leave the intended number of migrations pending',
  ).toBe(spec.pending.length);

  // When a mutant was requested, prove the mutant is what ran. Without this the
  // mutation self-check could pass while driving the pristine runner, and the
  // "assertion is load-bearing" verdict would be a verdict about nothing.
  if (options?.runnerPath) {
    expect(
      report.runnerPath,
      'the harness drove the real runner, not the mutant — the self-check proved nothing',
    ).toContain('mutant-');
  }

  return { result, report };
}

/** `INSERT INTO "SequelizeMeta"` targets, in order. */
const recordedAsApplied = (report) => report.inserts.map(i => i.replacements.name);

describe('safe-migrate control flow, executed against intercepted boundaries (Astra F5)', () => {
  it('a genuine failure writes nothing to SequelizeMeta and stops the loop', () => {
    const { result, report } = ran({ pending: THREE, byTarget: { [M1]: GENUINE } });

    // The H-03 assertion, now behavioural rather than textual: the defect was
    // marking a failed migration as applied, and this is the set of writes that
    // would have shown it.
    expect(recordedAsApplied(report)).toEqual([]);

    // The M-01 assertion: `sequelize-cli db:migrate --to <name>` re-runs the
    // whole pending chain, so continuing after a failure reports M1's error
    // against every innocent migration behind it.
    expect(report.spawnTargets).toEqual([M1]);

    expect(result.status, 'a genuine failure must fail the run').toBe(1);
    expect(result.stdout).toContain('left PENDING');
  });

  it('refuses the emergency flag outright — no path records a failed migration', () => {
    // SUPERSEDED 2026-09-20 (S1). This test previously asserted that
    // SWAN_MIGRATE_ALLOW_FAILURE=1 recorded M1 as applied AND restored exit 0 —
    // i.e. it pinned the hatch as a FEATURE. The hatch is gone: it was the
    // mechanism that wrote production entries into SequelizeMeta for tables that
    // do not exist, and once recorded those migrations can never re-run.
    //
    // `ran()` is deliberately NOT used here. The refusal happens BEFORE the
    // connection, so the harness's stubbed boundaries are never reached and no
    // report is produced — and `ran()` requires one. Requiring a report would
    // make this test assert the opposite of the contract it protects.
    const result = runRunner(
      { pending: THREE, byTarget: { [M1]: GENUINE } },
      { extraEnv: { SWAN_MIGRATE_ALLOW_FAILURE: '1' } },
    );

    expect(result.status, 'the refusal must exit 2 (usage error), not 1').toBe(2);
    expect(result.stderr).toContain('REFUSING TO RUN');

    // The driver emits its report from an exit hook, so a report DOES exist even
    // on the refusal path — asserting `report === null` would have been wrong.
    // Assert on what it CONTAINS instead, which is the stronger claim: nothing
    // was written and no child was spawned, so the refusal really did happen
    // before the run could do anything.
    expect(result.report, 'the harness produced no report at all').not.toBeNull();
    expect(
      recordedAsApplied(result.report),
      'the refused run still wrote to SequelizeMeta',
    ).toEqual([]);
    expect(
      result.report.spawnTargets,
      'the refused run still delegated a migration',
    ).toEqual([]);
    expect(
      result.report.queryCount,
      'the refused run still issued a database query — it connected before refusing',
    ).toBe(0);
  });

  it('an "already exists" failure is NOT reclassified, and stops the loop', () => {
    // SUPERSEDED 2026-09-20 (S1). This test previously asserted the OPPOSITE:
    // that an ALREADY_EXISTS failure was recorded as applied and the loop
    // continued. That reclassification is what let a migration which stopped at
    // object 3 of 10 be recorded COMPLETE, with objects 4-10 never created.
    //
    // ALREADY_EXISTS is kept as the fixture precisely because it is the input
    // that used to be misclassified — the strongest case to pin.
    const { result, report } = ran({
      pending: THREE,
      byTarget: { [M1]: ALREADY_EXISTS },
    });

    expect(
      recordedAsApplied(report),
      'an "already exists" failure was recorded as applied',
    ).toEqual([]);
    expect(report.spawnTargets, 'the loop continued past a failure').toEqual([M1]);
    expect(result.status, 'a failure must fail the run').toBe(1);
    expect(result.stdout).toContain('left PENDING');
  });

  it('STRICT exits at the first failure without recording it', () => {
    const { result, report } = ran(
      { pending: THREE, byTarget: { [M1]: GENUINE } },
      { extraEnv: { SWAN_MIGRATE_STRICT: '1' } },
    );

    expect(recordedAsApplied(report)).toEqual([]);
    expect(report.spawnTargets).toEqual([M1]);
    expect(result.status).toBe(1);
    // Message updated by S1: STRICT no longer "refuses to mark as applied" —
    // nothing marks as applied any more. It stops at the first failure.
    expect(result.stderr).toContain('stopping at the first failed migration');
  });

  it('data-conflict errors are never reclassified as applied', () => {
    // S1 removed the reclassification entirely, so this now holds for a stronger
    // reason than the original tightening. The test is kept because these are the
    // exact errors that produced the §0 drift, and because it pins the BEHAVIOUR
    // (nothing recorded, run fails) rather than the absence of a pattern list —
    // the previous version of this test read the source text, which is the weaker
    // form.
    for (const [label, stderr] of [
      ['duplicate key value', 'ERROR: duplicate key value violates unique constraint "users_email_key"'],
      ['foreign key constraint', 'ERROR: insert or update on table "x" violates foreign key constraint "y_fkey"'],
    ]) {
      const { result, report } = ran({
        pending: THREE,
        byTarget: { [M1]: { code: 1, stdout: '', stderr } },
      });

      expect(recordedAsApplied(report), `${label} was reclassified as applied`).toEqual([]);
      expect(result.status, `${label} did not fail the run`).toBe(1);
    }
  });

  it('an all-clear run delegates every pending migration and writes nothing', () => {
    const { result, report } = ran({ pending: THREE });

    expect(report.spawnTargets).toEqual(THREE);
    expect(recordedAsApplied(report)).toEqual([]);
    expect(result.status).toBe(0);
  });

  it('nothing pending means nothing is delegated', () => {
    const { result, report } = ran({ pending: [] });

    expect(report.spawnCount).toBe(0);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No pending migrations');
  });
});

/**
 * safe-migrate.mjs is CRLF-only (457 CRLF, 0 lone LF as of 2026-09-20). Anchors
 * written with a bare `\n` silently fail to match, so the line ending is read
 * from the source rather than assumed — and `writeMutant` throws if the result
 * is unchanged, which is what turned this into a visible failure the first time
 * it happened instead of a mutation test running against a pristine copy.
 */
const eolOf = (src) => (src.includes('\r\n') ? '\r\n' : '\n');

describe('mutation self-check — the assertions above are load-bearing', () => {
  afterAll(() => cleanupMutants());

  it('reintroducing the H-03 defect makes the zero-writes assertion fail', () => {
    // The defect, verbatim: record a genuinely failed migration as applied.
    // Anchored on `failed++;`, which is unique in the file.
    //
    // REWRITTEN 2026-09-20 (S1). This mutant used to inject
    // `await markAsCompleted(seq, migration);` — but S1 DELETED that helper, so
    // the mutant became a call to an undefined function. It threw instead of
    // writing, `recordedAsApplied` stayed empty, and the self-check failed with
    // "the H-03 mutation was not detected". The mutation harness had silently
    // stopped testing the thing it exists to test — which is exactly the failure
    // mode `mutation-proof-harness` documents.
    //
    // The defect is therefore injected as the write itself, inline. It must match
    // the stub's interceptor, which records queries matching
    // /INSERT\s+INTO\s+"SequelizeMeta"/i (stubs/sequelize.mjs:33).
    const mutant = writeMutant((src) => {
      const eol = eolOf(src);
      return src.replace(
        `${eol}      failed++;${eol}`,
        `${eol}      failed++;${eol}`
        + `      await seq.query('INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT DO NOTHING', { replacements: { name: migration } });${eol}`,
      );
    });

    const { report } = ran({ pending: THREE, byTarget: { [M1]: GENUINE } }, { runnerPath: mutant });

    // The first test's `expect(recordedAsApplied(report)).toEqual([])` would now
    // fail, and this is the write that would have failed it.
    expect(
      recordedAsApplied(report),
      'the H-03 mutation was not detected — the zero-writes assertion is not load-bearing',
    ).toEqual([M1]);
  });

  it('removing the M-01 break reproduces the production symptom', () => {
    // Every pending migration failing is the §0 production shape: nine different
    // migrations all reporting `relation "orientations" does not exist`, because
    // `--to` re-runs the chain from the first unapplied migration.
    const scenario = {
      pending: THREE,
      byTarget: { [M1]: GENUINE, [M2]: GENUINE, [M3]: GENUINE },
    };

    const pristine = ran(scenario);
    expect(pristine.report.spawnTargets, 'pristine runner must stop at the first failure').toEqual([M1]);

    const mutant = writeMutant((src) => {
      const eol = eolOf(src);
      return src.replace(`${eol}      break;${eol}`, eol);
    });
    const broken = ran(scenario, { runnerPath: mutant });

    expect(
      broken.report.spawnTargets,
      'the M-01 mutation was not detected — the stop-at-first-failure assertion is not load-bearing',
    ).toEqual(THREE);
  });
});
