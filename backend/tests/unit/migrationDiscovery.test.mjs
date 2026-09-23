import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, '../..');
const migrationsDir = join(backendDir, 'migrations');
const runnerSrc = readFileSync(join(backendDir, 'scripts/safe-migrate.mjs'), 'utf8');

/**
 * H-04 / M-01 regression guard (hostile review of the review, 2026-09-18).
 *
 * H-04: 38 files in backend/migrations/ look exactly like migrations and have
 * never run — `readdirSync` is non-recursive and the filter only accepts
 * `.cjs`/`.js`. The repo's own shadow-delta-audit.mjs:62-79 documents it.
 *
 * The ledger's prescribed remedy was "recurse (`readdirSync(dir, { recursive:
 * true })`) and include `.mjs`". THAT REMEDY IS WRONG, and this file exists
 * partly to stop a future agent from implementing it:
 *
 *   safe-migrate.mjs does not run migrations itself — it shells out to
 *   `sequelize-cli db:migrate --to <name>`. sequelize-cli 6.6.2 resolves
 *   migrations with
 *       pattern: /^(?!.*\.d\.ts$).*\.(cjs|js|cts|ts)$/
 *   (node_modules/sequelize-cli/lib/core/migrator.js) over a NON-RECURSIVE
 *   glob. It can never load a `.mjs` migration and can never load anything in
 *   `migrations/social/`.
 *
 *   Widening only the runner's own filter would therefore list 38 extra
 *   "pending" migrations that the delegated runner then fails one by one —
 *   and because H-03's fix now makes a failure exit non-zero, every Render
 *   deploy would go red reporting 38 migrations it is structurally incapable
 *   of running. Invisibility is the defect; the cure is visibility plus a
 *   ratchet, which is what the runner now does.
 */

/** sequelize-cli's real loader pattern, read from the installed package. */
function cliPatternFromInstalledPackage() {
  const p = join(backendDir, 'node_modules/sequelize-cli/lib/core/migrator.js');
  if (!existsSync(p)) return null;
  const m = readFileSync(p, 'utf8').match(/pattern:\s*(\/\^.*?\/)/);
  return m ? m[1] : null;
}

/** Mirror of the runner's classification, so we can pin the inert baseline. */
function classify() {
  const walk = (dir, prefix = '') => {
    const out = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name === 'helpers' || e.name === 'node_modules') continue;
        out.push(...walk(join(dir, e.name), rel));
      } else if (/\.(cjs|js|mjs|sql)$/.test(e.name)) {
        out.push(rel);
      }
    }
    return out.sort();
  };
  const all = walk(migrationsDir);
  const executable = all.filter(f => !f.includes('/') && /\.(cjs|js)$/.test(f));
  const inert = all.filter(f => !executable.includes(f));
  return { all, executable, inert };
}

const INERT_BASELINE = 38;

describe('migration discovery (H-04)', () => {
  it("classifies by sequelize-cli's real pattern, not the runner's filter", () => {
    // the runner must not simply widen its own execution filter
    expect(runnerSrc).toContain('isExecutableByCli');
    expect(runnerSrc).toContain('EXECUTABLE_EXT');
    // and it must discover recursively, so the orphans are visible
    expect(runnerSrc).toContain('withFileTypes: true');
    expect(runnerSrc).toContain('discoverMigrationFiles');
  });

  it('agrees with the pattern actually shipped in sequelize-cli', () => {
    const pattern = cliPatternFromInstalledPackage();
    if (!pattern) return; // package not installed in this checkout — skip

    // the installed tool's pattern must still exclude .mjs; if a future
    // sequelize-cli upgrade adds it, this assertion is the alarm bell that
    // says "re-evaluate H-04's remedy"
    const re = eval(pattern); // eslint-disable-line no-eval
    expect(re.test('20260101000000-thing.cjs')).toBe(true);
    expect(re.test('20260101000000-thing.mjs')).toBe(false);
  });

  it('reports the inert set loudly instead of silently ignoring it', () => {
    expect(runnerSrc).toContain('INERT MIGRATION FILE(S)');
    expect(runnerSrc).toContain('reportInertMigrations');
  });

  it('does not let the inert set grow past its known baseline', () => {
    const { inert } = classify();
    // Ratchet: shrinking is welcome, growing is a failure. A new file in
    // migrations/ that the runner cannot execute must be caught in review,
    // not discovered months later by an audit.
    expect(inert.length).toBeLessThanOrEqual(INERT_BASELINE);
    expect(inert.length).toBeGreaterThan(0); // baseline sanity
  });

  it('every inert file is inert for a stated reason', () => {
    const { inert } = classify();
    for (const f of inert) {
      const isSubdir = f.includes('/');
      const isNonCjs = /\.(mjs|sql)$/.test(f);
      expect(isSubdir || isNonCjs).toBe(true);
    }
  });
});

describe('migration runner failure attribution (M-01)', () => {
  it('stops at the first genuine failure instead of misattributing it N times', () => {
    // `--to` re-runs the whole pending chain, so every later invocation would
    // report the FIRST failure against an innocent migration.
    expect(runnerSrc).toContain('STOPPING: the runner delegates to');
    expect(runnerSrc).toContain('firstFailure');
  });

  it('no longer reclassifies ANY failure as "already applied"', () => {
    // SUPERSEDED 2026-09-20 (S1). This test used to slice the source between
    // `const ALREADY_APPLIED_PATTERNS` and `function isAlreadyAppliedError` and
    // assert that two data-conflict patterns were absent while `already exists`
    // was still allowed. That pinned the SURGICAL fix (delete two patterns)
    // rather than the contract.
    //
    // S1 deleted the classification entirely, so BOTH slice anchors vanished:
    // `indexOf` returned -1 for each, the slice became the empty string, and two
    // of the three assertions then passed VACUOUSLY while the third failed. A
    // guard whose anchors can disappear from under it is not a guard — which is
    // the same defect class this file exists to catch.
    //
    // Asserted on comment-stripped code, so the removal notes in the runner
    // (which necessarily name these symbols) cannot satisfy the check:
    const code = runnerSrc
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code, 'the error-text pattern list still exists').not.toContain('ALREADY_APPLIED_PATTERNS');
    expect(code, 'the error-text classifier still exists').not.toContain('isAlreadyAppliedError');
    // the specific call site that consulted the child's output for a verdict
    expect(code).not.toContain('isAlreadyAppliedError(result.combined)');
  });

  it('documents why STRICT is not enabled in the deploy path', () => {
    const renderStart = readFileSync(join(backendDir, 'scripts/render-start.mjs'), 'utf8');
    expect(renderStart).toContain('SWAN_MIGRATE_STRICT is deliberately');
    expect(renderStart).not.toContain("env: { ...process.env, SWAN_MIGRATE_STRICT: '1' }");
  });
});
