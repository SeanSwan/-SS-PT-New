import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../../migrations');

/**
 * Migration-guard regression guard — M-10 (ported into the main tree) and the
 * H-02 ordering class (hostile review of the review, 2026-09-18).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * M-10 found that `migrationGuardTableNames.test.mjs` existed only in an
 * unmerged worktree and had never reached the shipped tree, so nothing
 * protected `main` against the repo's single most expensive recurring defect
 * class. This is the port.
 *
 * The ledger filed H-01 (the chain dies on migration #1 because it alters a
 * table no migration creates) and H-02 (the same migration references a table
 * created 13 months later), then dismissed H-02 with "Fix: covered by H-01's
 * guard." That is wrong, and this test is the proof: the H-02 *class* has eight
 * members, and H-01's guard only covers one of them. Four were genuinely
 * unguarded and killed any from-empty bootstrap the moment H-01's wall came
 * down — i.e. fixing H-01 alone MOVES the wall instead of removing it.
 *
 * WHAT IT PINS
 * ------------
 * 1. No migration may ALTER a table that no migration at-or-before it creates,
 *    unless it carries an explicit existence guard for that table.
 * 2. No migration may test a raw query result directly as a boolean after a
 *    `SELECT EXISTS` — Sequelize returns a rows ARRAY, so `if (!result)` is
 *    always false and the guard silently no-ops.
 *
 * Both are static, deterministic, and run in the default suite.
 */

const MIGRATION_FILE = /\.(cjs|js)$/;

/** Migrations the delegated runner can actually execute, in chain order. */
function chainFiles() {
  return readdirSync(migrationsDir)
    .filter(f => MIGRATION_FILE.test(f))
    .sort();
}

function read(name) {
  return readFileSync(join(migrationsDir, name), 'utf8');
}

/** Tables created by each file (earliest wins), keyed by file. */
function tablesCreatedBy(files) {
  const byFile = new Map();
  for (const f of files) {
    const src = read(f);
    const names = new Set();
    for (const m of src.matchAll(/createTable\(\s*['"`]([A-Za-z0-9_]+)['"`]/g)) {
      names.add(m[1]);
    }
    byFile.set(f, names);
  }
  return byFile;
}

/** Tables a file ALTERs via queryInterface helpers. */
function tablesAlteredBy(src) {
  const names = new Set();
  const re = /(?:changeColumn|addColumn|removeColumn|addIndex|addConstraint|removeConstraint|renameColumn)\(\s*['"`]([A-Za-z0-9_]+)['"`]/g;
  for (const m of src.matchAll(re)) names.add(m[1]);
  return names;
}

/**
 * Does this file carry a real existence guard for `table`?
 * Accepts either queryInterface.tableExists('T') or an information_schema /
 * pg_tables probe that names T.
 */
function hasExistenceGuardFor(src, table) {
  const quoted = `['"\`]${table}['"\`]`;
  if (new RegExp(`tableExists\\(\\s*${quoted}`).test(src)) return true;
  const probes = /information_schema\.tables|pg_tables/i.test(src);
  if (!probes) return false;
  // the probe must actually name this table
  return new RegExp(`(?:table_name|tablename)\\s*=\\s*${quoted}`, 'i').test(src);
}

/**
 * KNOWN DEBT REGISTER — the violations that exist at the time this guard
 * landed (2026-09-18). It is asserted EXACTLY, which means:
 *
 *   - adding a new violation  -> test FAILS (the invariant is now protected)
 *   - fixing one of these     -> test FAILS until the entry is removed here
 *     (deliberate: the register must stay a true statement, not drift into
 *      a permanent excuse)
 *
 * WHY 23 AND NOT 0
 * ----------------
 * The register is FOUR table families, not two. Counted from the array below
 * (19 + 2 + 1 + 1 = 23) rather than restated from memory:
 *
 *   `"Users"` 19 · `"Gamifications"` 2 · `"SocialLikes"` 1 · `"messages"` 1
 *
 * CORRECTED 2026-09-20 (S0 of the migrations-reconciliation package). This
 * paragraph previously read "22 of the 23 alter `"Users"`, and the 23rd alters
 * `"SocialLikes"`" — false on both counts: the `"Users"` family is 19, and
 * there are THREE non-`"Users"` families, not one. Raised as A1-08 of the
 * hostile review and confirmed by parsing this array. The register itself is
 * unchanged: it is a ratchet, and a wrong comment is not licence to shrink it.
 * (Deriving these counts from the array at test time is S2 scope.)
 *
 * None of them is created by ANY migration. They work in production only because the
 * production repair path creates missing tables from the models at boot:
 * `startup.mjs:207-214` calls `syncDatabaseSafely()`, which runs
 * `createMissingTables()` -> `createTablesInOrder(models)`
 * (`backend/utils/productionDatabaseSync.mjs:41-53`, `:313-324`) over every
 * model `getModels()` returns.
 *
 * CORRECTED 2026-09-20 (Astra RT-1). This comment previously cited
 * `backend/core/startup.mjs:202` as the mechanism. That line is the OTHER
 * branch: `sync({ alter: true })` there is gated on
 * `!isProduction && AUTO_SYNC === 'true'`, so it never runs in production.
 * The citation named a development-only call as the production schema
 * authority — which is exactly the "two schema authorities" problem M-02
 * filed, in its most literal form: models/User.mjs declares
 * `tableName: '"Users"'`, while the only migration that creates a
 * user table (20250212060728-create-user-table.cjs:337) creates lowercase
 * `users`. In PostgreSQL `"Users"` and `users` are DIFFERENT TABLES.
 *
 * Fixing this is not a 23-file guard sweep — it is the schema-authority
 * decision (M-02): either a migration creates `"Users"`, or sync stops being
 * the authority. Guarding them blind would hide the question rather than
 * answer it. See the review ledger §12 for the full write-up.
 */
const KNOWN_UNGUARDED = [
  '20250107000001-add-master-prompt-fields.cjs alters "Users", which no migration at or before it creates',
  '20250709000000-add-stripe-customer-id-to-users.cjs alters "Users", which no migration at or before it creates',
  '20251229000000-add-missing-user-columns.cjs alters "Users", which no migration at or before it creates',
  '20260117000002-add-universal-schedule-fields.cjs alters "Users", which no migration at or before it creates',
  '20260212000001-add-force-password-change.cjs alters "Users", which no migration at or before it creates',
  '20260212000002-add-banner-photo.cjs alters "Users", which no migration at or before it creates',
  '20260222000001-add-is-onboarding-complete.cjs alters "Users", which no migration at or before it creates',
  '20260228100001-add-measurement-schedule-fields.cjs alters "Users", which no migration at or before it creates',
  '20260302050000-gamification-bootstrap.cjs alters "Users", which no migration at or before it creates',
  '20260308000002-add-reaction-types.cjs alters "SocialLikes", which no migration at or before it creates',
  '20260314000001-add-client-source-to-users.cjs alters "Users", which no migration at or before it creates',
  '20260315000001-add-achievement-roles-rewards-privacy.cjs alters "Users", which no migration at or before it creates',
  '20260315000002-fix-missing-user-achievement-columns.cjs alters "Users", which no migration at or before it creates',
  '20260322000002-add-chart-visibility-to-users.cjs alters "Users", which no migration at or before it creates',
  '20260323000000-add-streak-freeze-fields.cjs alters "Gamifications", which no migration at or before it creates',
  '20260328120000-add-aegis-hud-needs.cjs alters "Gamifications", which no migration at or before it creates',
  '20260406000001-create-e2ee-tables.cjs alters "messages", which no migration at or before it creates',
  '20260502000000-add-can-generate-workout-plans-to-users.cjs alters "Users", which no migration at or before it creates',
  '20260510000001-add-banner-object-position.cjs alters "Users", which no migration at or before it creates',
  '20260524000100-expand-banner-crop-controls.cjs alters "Users", which no migration at or before it creates',
  '20260524000200-add-banner-frame-height.cjs alters "Users", which no migration at or before it creates',
  '20260525000100-add-banner-presentation-presets.cjs alters "Users", which no migration at or before it creates',
  '20260526000100-add-client-soft-delete-retention-columns.cjs alters "Users", which no migration at or before it creates',
];

describe('migration guards: no ALTER before CREATE without a guard (H-02 class)', () => {
  const files = chainFiles();
  const created = tablesCreatedBy(files);

  it('has a chain to check', () => {
    expect(files.length).toBeGreaterThan(300);
  });

  it('audits the same set the runner executes, rather than re-deriving the rule', () => {
    // `chainFiles()` says it returns "Migrations the delegated runner can actually
    // execute". That claim held only by coincidence: the runner computes its
    // executable set from `EXECUTABLE_EXT` plus a non-recursive check
    // (backend/scripts/safe-migrate.mjs:211-217), and this file re-derives the same
    // rule by hand. Two copies agree until someone edits one — which is the drift
    // this guard exists to catch, in the one area where drift is most expensive.
    //
    // Note the scope assertion above is a loose lower bound (>300) and cannot
    // detect a divergence: it passes whether the guard audits 312 files or the
    // runner's 351. So the relationship is pinned here instead of assumed.
    const runner = readFileSync(join(__dirname, '../../scripts/safe-migrate.mjs'), 'utf8');

    expect(
      runner,
      'the runner no longer declares the same extension rule this guard re-derives',
    ).toContain(`EXECUTABLE_EXT = ${String(MIGRATION_FILE)};`);

    expect(
      runner,
      'the runner no longer rejects nested paths, so "what the runner executes" is no longer the same set',
    ).toContain("relPath.includes('/')");
  });

  it('names the real production schema-repair path, not the development-only sync', () => {
    // WIRING CHECK, NOT A BEHAVIOURAL ONE (Astra RT-1, 2026-09-20).
    //
    // This guard tolerates 23 unguarded ALTERs on the grounds that production
    // repairs missing tables from the models. Its comment used to cite
    // `startup.mjs:202` as that mechanism — but that call is gated to
    // non-production, so the citation named a development-only sync as the
    // production schema authority. These assertions keep the corrected citation
    // honest. They prove wiring only; they do not execute a boot.
    const startup = readFileSync(join(__dirname, '../../core/startup.mjs'), 'utf8');
    const prodSync = readFileSync(join(__dirname, '../../utils/productionDatabaseSync.mjs'), 'utf8');

    expect(
      startup,
      'the development sync is no longer non-production-gated — re-check which branch production takes',
    ).toContain("if (!isProduction && process.env.AUTO_SYNC === 'true')");

    expect(
      startup,
      'the production branch no longer calls syncDatabaseSafely, so the comment above names a path that does not run',
    ).toContain('await syncDatabaseSafely();');

    expect(
      prodSync,
      'createMissingTables is gone, so "production creates missing tables from the models" is no longer true',
    ).toContain('const createMissingTables = async () => {');
  });

  it('does not grow the register of unguarded ALTER-before-CREATE migrations', () => {
    const unguarded = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const src = read(file);

      // tables created by this file or any earlier file
      const available = new Set();
      for (let j = 0; j <= i; j++) {
        for (const t of created.get(files[j]) || []) available.add(t);
      }

      for (const table of tablesAlteredBy(src)) {
        if (available.has(table)) continue; // created in time — fine
        if (hasExistenceGuardFor(src, table)) continue; // absent-table path handled
        unguarded.push(`${file} alters "${table}", which no migration at or before it creates`);
      }
    }

    // Exact match in both directions: a new violation fails, and a fix must
    // also update the register so it never becomes a permanent excuse.
    expect(unguarded.sort()).toEqual([...KNOWN_UNGUARDED].sort());
  });
});

describe('migration guards: a query result is never used directly as a boolean', () => {
  it('no SELECT EXISTS guard silently no-ops', () => {
    const broken = [];

    for (const file of chainFiles()) {
      const src = read(file);
      if (!/SELECT\s+EXISTS/i.test(src)) continue;

      const lines = src.split(/\r?\n/);
      lines.forEach((line, idx) => {
        const m = line.match(/if\s*\(\s*!?\s*([A-Za-z_$][\w$]*)\s*\)/);
        if (!m) return;
        const varName = m[1];
        if (!/exist|check|table|found|has/i.test(varName)) return;

        // find where it was assigned
        let assigned = null;
        const assignRe = new RegExp(`(?:const|let|var)\\s*\\[?\\s*${varName.replace(/\$/g, '\\$')}\\s*\\]?\\s*=`);
        for (let j = idx; j >= Math.max(0, idx - 40); j--) {
          if (assignRe.test(lines[j])) { assigned = lines[j]; break; }
        }
        if (!assigned) return;

        // A raw rows array is always truthy. Correct shapes index into it:
        //   const [rows] = await query(...)  ->  rows[0].exists
        //   result.rows[0]
        const isRawRows = /const\s+[A-Za-z_$][\w$]*\s*=\s*await/.test(assigned);
        if (!isRawRows) return;

        const correct = /\[\s*0\s*\]/.test(line) || /\.rows/.test(line);
        if (!correct) {
          broken.push(`${file}:${idx + 1} — "${line.trim()}"`);
        }
      });
    }

    expect(broken).toEqual([]);
  });
});
