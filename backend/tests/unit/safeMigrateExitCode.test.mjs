import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, '../../scripts/safe-migrate.mjs'), 'utf8');
const compact = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ');

/**
 * H-03 regression guard (hostile review seat 3, fixing pass).
 * UPDATED 2026-09-20 for the S1 contract (Astra A1-01/A1-02/A1-04).
 *
 * safe-migrate.mjs used to mark a FAILED migration as applied and exit 0, so a
 * deploy reported "Migrations completed successfully" while the migration had
 * not run. That is how 9 migrations came to be recorded as applied in
 * production while the tables they create (price_change_logs, CoachSignals) do
 * not exist — they can never re-run.
 *
 * render-start.mjs:95-100 already treats a migration failure as NON-fatal (it
 * starts the server anyway), so failing the run does not block a deploy; it
 * only stops the deploy log from lying.
 *
 * WHAT CHANGED HERE, AND WHY IT IS NOT A RELAXATION
 * -------------------------------------------------
 * The previous version of this file pinned the H-03 fix as a TWO-CALL pin: it
 * required exactly two `markAsCompleted(seq, migration)` sites, one under
 * `ALLOW_FAILURE` and one under the `already exists` reclassification. Both of
 * those paths have since been REMOVED — the reclassification because it cannot
 * tell "object 1 of 10 existed" from "the migration completed", and the
 * ALLOW_FAILURE hatch because it recorded failures as applied.
 *
 * The pin is therefore now ZERO, which is strictly stronger: no code path in
 * this file may record a migration as applied. A future agent who reintroduces
 * either path fails this guard, which is the point.
 */
describe('safe-migrate fails the run on a genuine failure (H-03)', () => {
  it('never records a failed migration as applied — zero write paths', () => {
    // NON-VACUOUS AS OF 2026-09-20 (Astra RT-4). An earlier assertion here was
    // VACUOUS and could never fail:
    //
    //   expect(compact).not.toContain('// Mark as done anyway to ...')
    //
    // `compact` is a COMMENT-STRIPPED copy, so asserting it does not contain a
    // comment string was unsatisfiable-as-a-test. The one assertion written to
    // catch the H-03 regression could not catch it.
    //
    // Now: asserted on `source` (comments intact) for the historical marker, and
    // on the CALL SITES for the live property.
    expect(source).not.toContain('// Mark as done anyway to prevent blocking future deploys');

    // Matched against `compact` (comment-stripped), NOT `source`. A CALL SITE
    // CANNOT LIVE IN A COMMENT, so comments must not be able to satisfy — or trip
    // — a code assertion. (The first version of this check used `source` and
    // reported 1 call site: the runner's own removal note, which names the call
    // syntax. Asserting a code property against text that includes prose is how a
    // guard reports a phantom.)
    const calls = [...compact.matchAll(/markAsCompleted\s*\(\s*seq\s*,\s*migration\s*\)/g)];

    // Pinned at exactly ZERO. Two paths were sanctioned before S1; both are gone.
    // The comment on line 161 of the runner explains where they went, and the
    // adoption path (S3/S4) must bring its own recorder rather than reviving this
    // one.
    expect(
      calls.length,
      'a markAsCompleted(seq, migration) path exists — a failed migration can be recorded as applied',
    ).toBe(0);

    // And the write helper itself must be gone, so there is nothing to call.
    expect(compact).not.toContain('function markAsCompleted');
  });

  it('leaves a failed migration pending so it can be fixed and re-run', () => {
    expect(compact).toContain('left PENDING — not marked as applied');
  });

  it('exits non-zero when anything failed, with no override', () => {
    // S1: the `if (!ALLOW_FAILURE)` guard is gone — the exit is unconditional.
    expect(compact).toContain('ERROR: ${failed} migration(s) failed.');
    expect(compact).toContain('They were NOT marked as applied — fix them and re-run.');
    expect(compact).toContain('process.exit(1);');
    expect(
      compact,
      'the exit is still conditional on ALLOW_FAILURE — a failed run can still exit 0',
    ).not.toContain('if (!ALLOW_FAILURE) process.exit(1);');
  });

  it('refuses SWAN_MIGRATE_ALLOW_FAILURE before any connection is made', () => {
    // SOURCE ORDER IS THE ASSERTION. "Refuse before connecting" is an ordering
    // requirement, so a presence check would be satisfied by a refusal placed
    // after the connection — which is exactly the half-run this prevents.
    expect(compact).toContain("process.env.SWAN_MIGRATE_ALLOW_FAILURE === '1'");
    expect(compact).toContain('REFUSING TO RUN: SWAN_MIGRATE_ALLOW_FAILURE=1 is set.');

    // Anchored to an ACTUAL CONSTRUCTION, as a regex — not to the bare phrase
    // "new Sequelize". Two separate traps had to be cleared here:
    //
    //   1. The file contains a dead `getSequelize()` helper (unreferenced —
    //      flagged by Astra A1-03) whose two `new Sequelize` calls sit earlier in
    //      the file than main()'s, so a file-wide search found the dead helper.
    //   2. Anchoring to main() was not enough either: a COMMENT inside main(),
    //      sitting above the refusal, mentions `new Sequelize` in prose. A bare
    //      substring search matched that comment and reported the ordering
    //      backwards.
    //
    // This is the second time in this file that prose satisfied a code-shaped
    // assertion. Hence the regex on `seq = new Sequelize(`, which prose cannot
    // produce and the dead helper does not contain.
    const mainAt = source.indexOf('async function main()');
    const refuseAt = source.indexOf('REFUSING TO RUN');
    const connectMatch = source.match(/seq\s*=\s*new Sequelize\(/);
    expect(mainAt, 'no main() found').toBeGreaterThan(-1);
    expect(refuseAt, 'no refusal site found').toBeGreaterThan(mainAt);
    expect(connectMatch, 'no connection construction found').toBeTruthy();
    expect(
      refuseAt,
      'the ALLOW_FAILURE refusal appears AFTER the connection is constructed — it can connect before refusing',
    ).toBeLessThan(connectMatch.index);

    // And the hatch must not survive as a live branch anywhere.
    expect(
      compact,
      'an ALLOW_FAILURE branch still exists in the failure path',
    ).not.toContain('if (ALLOW_FAILURE) { await markAsCompleted');
  });

  it('refuses the flag at runtime, exiting 2 without attempting a connection', () => {
    // BEHAVIOURAL, not a source check. The source ordering above proves the
    // refusal is written before the connection; this proves it actually runs
    // there. SAFETY: DATABASE_URL is overridden to a dead local port, so the run
    // can only ever reach 127.0.0.1:1 — never the production host in .env.
    // dotenv does not override an already-set variable, so this value wins.
    const result = spawnSync('node', ['scripts/safe-migrate.mjs', 'production'], {
      cwd: join(__dirname, '../..'),
      env: {
        ...process.env,
        DATABASE_URL: 'postgres://127.0.0.1:1/none',
        SWAN_MIGRATE_ALLOW_FAILURE: '1',
      },
      encoding: 'utf8',
      timeout: 20_000,
    });

    expect(result.error, 'the runner could not be spawned at all').toBeUndefined();
    expect(result.status, 'the refusal must exit 2 (usage error), not 1').toBe(2);
    expect(result.stderr).toContain('REFUSING TO RUN');
    expect(
      result.stdout,
      'the run attempted a connection before refusing — "before connecting" is the requirement',
    ).not.toContain('Database connection failed');
  });

  it('treats an unreadable migration history as a stop, not as an empty history', () => {
    // S1 (Astra A1-04). The old getExecutedMigrations() caught EVERY error and
    // returned an empty Set, so a permission failure or a dropped connection made
    // all 312 migrations look pending.
    expect(compact).toContain('isMissingMetadataRelation');
    expect(compact).toContain('{ ok: false, error: err }');
    expect(compact).toContain('if (!history.ok)');
    expect(compact).toContain('CANNOT READ MIGRATION HISTORY — refusing to run.');
    // The catch-all shape must be gone: no `catch { return new Set() }`.
    expect(
      compact,
      'a catch block still returns an empty Set, so an unreadable history reads as an empty one',
    ).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*return new Set\(\)/);
  });

  it('preserves the STRICT path (fails fast at the first failure)', () => {
    expect(compact).toContain("process.env.SWAN_MIGRATE_STRICT === '1'");
    // The message changed with S1: STRICT no longer "refuses to mark as applied"
    // (nothing marks as applied any more) — it stops at the first failure.
    expect(compact).toContain('SWAN_MIGRATE_STRICT=1 — stopping at the first failed migration.');
    expect(
      compact,
      'the stale STRICT message is still present — it describes a reclassification that no longer exists',
    ).not.toContain('SWAN_MIGRATE_STRICT=1 — refusing to mark a failed migration as applied.');
  });

  it('cites a render-start.mjs line range that actually contains the non-fatal catch', () => {
    // VERIFIED CITATION, NOT AN ASSERTED LITERAL (2026-09-20).
    //
    // This used to be `expect(source).toContain('render-start.mjs:87-90')`. That
    // proved only that the comment existed. The catch had already moved to
    // :95-100, so the test was pinning a stale line number in another file and
    // stayed green while doing it — the guard asserting something adjacent to
    // the property it exists to protect.
    //
    // Now the cited range is read out of the comment and the code is looked for
    // INSIDE it. The test fails when either side moves: if the comment's range
    // goes stale, or if the catch leaves the range.
    const renderStart = readFileSync(join(__dirname, '../../scripts/render-start.mjs'), 'utf8');
    const cited = source.match(/render-start\.mjs:(\d+)-(\d+)/);
    expect(cited, 'safe-migrate.mjs no longer cites a render-start.mjs line range').toBeTruthy();

    const [, from, to] = cited;
    const slice = renderStart.split(/\r?\n/).slice(Number(from) - 1, Number(to)).join('\n');
    expect(
      slice,
      `render-start.mjs:${from}-${to} does not contain the non-fatal migration catch`,
    ).toContain('Migration failure is non-fatal');
  });

  it('still reaches main() when invoked as the CLI entry point', () => {
    // Astra RT-4/F5 (2026-09-20). Until 2026-09-20 this file called main() at
    // module scope with no guard, so any `import()` executed the production
    // runner. The guard added on 2026-09-20 fixes that — but the guard's
    // failure direction is dangerous: a FALSE NEGATIVE stops migrations running
    // in production, which is the exact drift class H-07 is about.
    //
    // So the direction that matters is pinned here, by invoking the file the way
    // render-start.mjs does and asserting main() produced its banner. A/B proven
    // 2026-09-20 in native Node: the pre-guard file printed this banner when
    // merely IMPORTED; the guarded file prints it only when invoked.
    //
    // Not an import test: vitest cannot transform this file (it lives under
    // scripts/ and is outside the include globs), and vitest is not the shipped
    // runtime anyway. The shipped path is `node scripts/safe-migrate.mjs`.
    //
    // SAFETY: DATABASE_URL is overridden to a dead local port, so the run can
    // only ever reach 127.0.0.1:1 — never the production host in .env. dotenv
    // does not override an already-set variable, so this value wins. The banner
    // is printed BEFORE the connection attempt, which is what is asserted.
    const result = spawnSync('node', ['scripts/safe-migrate.mjs', 'production'], {
      cwd: join(__dirname, '../..'),
      env: { ...process.env, DATABASE_URL: 'postgres://127.0.0.1:1/none' },
      encoding: 'utf8',
      timeout: 20_000,
    });

    expect(result.error, 'the runner could not be spawned at all').toBeUndefined();
    expect(
      result.stdout,
      'the invocation guard suppressed main() — migrations would not run in production',
    ).toContain('Safe Migration Runner');
  });

  it('keeps the module-scope invocation guarded', () => {
    // A WIRING CHECK, kept deliberately alongside the behavioural test above so
    // that removing the guard fails on a clean assertion rather than by setting
    // off a real migration run inside the test process.
    expect(source).toContain('if (invokedDirectly) {');
    expect(
      source,
      'the guard must compare import.meta.url to pathToFileURL(process.argv[1]) exactly — '
      + 'a suffix match could be defeated by a differently-cased invocation path',
    ).toContain('import.meta.url === pathToFileURL(process.argv[1]).href');
  });
});
