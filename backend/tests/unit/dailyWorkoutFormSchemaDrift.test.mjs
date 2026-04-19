/**
 * DailyWorkoutForm ↔ daily_workout_forms schema drift regression guard
 * =====================================================================
 * Phase 16.2 round 7 (2026-04-18).
 *
 * Lock the two classes of attribute-to-column mapping drift that broke
 * the canonical POST /api/workout-forms save path in rounds 5 and 7:
 *
 *   (1) Round 5 — missing columns: the model declared processingStartedAt /
 *       processingCompletedAt / formVersion / estimatedDuration but no
 *       migration ever created them. Fixed by migration
 *       20260418000001-add-processing-fields-to-daily-workout-forms.cjs.
 *
 *   (2) Round 7 — camelCase/snake_case timestamp drift: the model had
 *       `timestamps: true` without explicit `field:` mapping, so the
 *       auto-generated createdAt/updatedAt attributes queried quoted
 *       camelCase columns ("createdAt", "updatedAt") that don't exist
 *       in the snake_case live table. Fixed by adding explicit
 *       `createdAt` / `updatedAt` attribute definitions with
 *       `field: 'created_at' / 'updated_at'`.
 *
 * This test runs in two layers so both regression classes stay caught:
 *   - Source-level: lock the explicit timestamp `field:` mapping in the
 *     model. Quick, deterministic, no DB.
 *   - Attribute introspection: for every rawAttributes key, assert its
 *     resolved column (`field` or attribute name) matches a column that
 *     actually exists in the declared table, via a schema map we control.
 *     If someone adds a new model field with a snake_case DB column but
 *     forgets the `field:` mapping, or the column is never migrated,
 *     this test fails loudly.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import DailyWorkoutForm from '../../models/DailyWorkoutForm.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MODEL_FILE = resolve(__dirname, '../../models/DailyWorkoutForm.mjs');
const modelSource = readFileSync(MODEL_FILE, 'utf8');

/**
 * The authoritative snake_case DB columns that must exist on the live
 * daily_workout_forms table, taken from the direct information_schema
 * probe at 2026-04-18 (post Phase 16.2 round 6 migration). Update this
 * list when a new column is genuinely added via migration.
 */
const LIVE_DB_COLUMNS = new Set([
  'id',
  'session_id',
  'client_id',
  'trainer_id',
  'date',
  'session_deducted',
  'form_data',
  'total_points_earned',
  'mcp_processed',
  'submitted_at',
  'mcp_processed_at',       // legacy — not mapped by current model, kept for reference
  'processing_errors',
  'processing_started_at',
  'processing_completed_at',
  'form_version',
  'estimated_duration',
  'created_at',
  'updated_at',
  'trainer_notes',
  'client_summary',
]);

describe('DailyWorkoutForm — Phase 16.2 round 7 timestamp mapping (source-level)', () => {
  it('declares explicit createdAt attribute mapped to created_at', () => {
    // Lock the specific round 7 fix. A future refactor that removes
    // this mapping would re-introduce the `column "createdAt" does not
    // exist` 500 on the canonical save path.
    expect(modelSource).toMatch(
      /createdAt\s*:\s*\{[\s\S]{0,200}field\s*:\s*['"]created_at['"]/,
    );
  });

  it('declares explicit updatedAt attribute mapped to updated_at', () => {
    expect(modelSource).toMatch(
      /updatedAt\s*:\s*\{[\s\S]{0,200}field\s*:\s*['"]updated_at['"]/,
    );
  });

  it('keeps timestamps: true so Sequelize still manages the timestamps', () => {
    // Defense against an accidental `timestamps: false` refactor that
    // would silently stop populating the columns on write.
    expect(modelSource).toMatch(/timestamps\s*:\s*true/);
  });
});

describe('DailyWorkoutForm — user FK targets (Phase 16.2 round 11)', () => {
  // Round 11 (2026-04-18): retargeted `daily_workout_forms.client_id` and
  // `daily_workout_forms.trainer_id` FKs from legacy lowercase `users`
  // (9 rows, missing all modern accounts) to canonical `"Users"` (17 rows,
  // the real auth table called out in CLAUDE.md).
  //
  // Path A data repair (Sean's ruling): the first migration attempt failed
  // because 57 daily_workout_forms rows referenced client_id=6 — Sean's
  // legacy "SwanStudios" client-role account in lowercase users. His
  // canonical admin account in "Users" is id=5. The migration now remaps
  // those 57 rows to client_id=5 before retargeting the FK.
  //
  // Lock the shape of the migration so a future refactor can't regress.

  it('migration exists and references "Users" (quoted PascalCase) for both FKs', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../migrations/20260418000003-retarget-daily-workout-forms-user-fks.cjs'),
      'utf8',
    );
    expect(mig).toMatch(/REFERENCES\s+"Users"\s*\(\s*id\s*\)/);
    // Both FK names must be in the spec table.
    expect(mig).toMatch(/daily_workout_forms_client_id_fkey/);
    expect(mig).toMatch(/daily_workout_forms_trainer_id_fkey/);
  });

  it('includes the Path A client_id=6 -> client_id=5 remap with audit trail', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../migrations/20260418000003-retarget-daily-workout-forms-user-fks.cjs'),
      'utf8',
    );
    // Audit log before update (row count)
    expect(mig).toMatch(/COUNT\(\*\)::int[\s\S]{0,200}WHERE client_id = \$\{LEGACY_CLIENT_ID\}/);
    // Actual remap
    expect(mig).toMatch(
      /UPDATE daily_workout_forms SET client_id = \$\{CANONICAL_CLIENT_ID\} WHERE client_id = \$\{LEGACY_CLIENT_ID\}/,
    );
    // Constants set to the ruled values
    expect(mig).toMatch(/const\s+LEGACY_CLIENT_ID\s*=\s*6/);
    expect(mig).toMatch(/const\s+CANONICAL_CLIENT_ID\s*=\s*5/);
  });

  it('refuses remap in environments where the canonical target isn\'t Sean\'s account', () => {
    // Safety invariant: if "Users".id=5 doesn't exist OR doesn't have
    // Sean's email in this environment, the migration must abort before
    // touching any data. Prevents blind remap in fresh installs or
    // environments seeded differently.
    const mig = readFileSync(
      resolve(__dirname, '../../migrations/20260418000003-retarget-daily-workout-forms-user-fks.cjs'),
      'utf8',
    );
    expect(mig).toMatch(/const\s+SEAN_EMAIL\s*=\s*['"]loveswanstudios@protonmail\.com['"]/);
    expect(mig).toMatch(/Refusing remap[\s\S]{0,100}does not exist/);
    expect(mig).toMatch(/Refusing remap[\s\S]{0,200}expected \$\{SEAN_EMAIL\}/);
  });

  it('verifies zero orphans against "Users" on both client_id and trainer_id BEFORE retargeting', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../migrations/20260418000003-retarget-daily-workout-forms-user-fks.cjs'),
      'utf8',
    );
    // Both invariant checks must be present (positive locks).
    expect(mig).toMatch(
      /SELECT DISTINCT client_id[\s\S]{0,300}NOT EXISTS \(SELECT 1 FROM "Users"/,
    );
    expect(mig).toMatch(
      /SELECT DISTINCT trainer_id[\s\S]{0,300}NOT EXISTS \(SELECT 1 FROM "Users"/,
    );
    expect(mig).toMatch(/Refusing FK retarget[\s\S]{0,200}missing from "Users"/);
  });

  it('down() refuses rollback when post-remap state can\'t safely revert', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../migrations/20260418000003-retarget-daily-workout-forms-user-fks.cjs'),
      'utf8',
    );
    expect(mig).toMatch(/rollback refused/i);
    // Must check BOTH columns against lowercase users on rollback
    expect(mig).toMatch(
      /FROM daily_workout_forms dwf[\s\S]{0,400}client_id IS NOT NULL[\s\S]{0,300}FROM users u/,
    );
  });
});

describe('DailyWorkoutForm — session_id FK target (Phase 16.2 round 10)', () => {
  // Round 10 (2026-04-18): the live `daily_workout_forms.session_id` FK
  // had drifted from the originally-intended `workout_sessions` (snake_case,
  // 14 rows, active) to the legacy `WorkoutSessions` (PascalCase, 0 rows,
  // empty). Every client self-log save 500'd with:
  //
  //   insert or update on table "daily_workout_forms" violates foreign
  //   key constraint "daily_workout_forms_session_id_fkey"
  //
  // Fixed by migration 20260418000002-retarget-daily-workout-forms-
  // session-fk.cjs. This test source-level-locks the migration's forward
  // target so a future refactor that drops or rewrites it is caught.

  it('retarget migration exists and points session_id at workout_sessions', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../migrations/20260418000002-retarget-daily-workout-forms-session-fk.cjs'),
      'utf8',
    );
    // Constraint name is declared as a template interpolation const at the
    // top of the file; the reference target is literal SQL.
    expect(mig).toMatch(/const\s+CONSTRAINT_NAME\s*=\s*['"]daily_workout_forms_session_id_fkey['"]/);
    expect(mig).toMatch(/REFERENCES\s+workout_sessions\s*\(\s*id\s*\)/);
  });

  it('retarget migration drops the prior constraint before re-creating it (idempotent)', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../migrations/20260418000002-retarget-daily-workout-forms-session-fk.cjs'),
      'utf8',
    );
    // Template uses `${CONSTRAINT_NAME}` interpolation; lock the shape.
    expect(mig).toMatch(/DROP CONSTRAINT IF EXISTS\s+"\$\{CONSTRAINT_NAME\}"/);
  });

  it('down() has a safe-rollback precheck that refuses to orphan FKs', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../migrations/20260418000002-retarget-daily-workout-forms-session-fk.cjs'),
      'utf8',
    );
    // The precheck must count rows whose session_id is in workout_sessions
    // but NOT in WorkoutSessions, and refuse rollback if any exist.
    expect(mig).toMatch(/NOT EXISTS[\s\S]{0,150}FROM "WorkoutSessions"/);
    expect(mig).toMatch(/rollback refused/i);
  });
});

describe('DailyWorkoutForm — rawAttributes ↔ live column mapping', () => {
  it('createdAt attribute resolves to DB column "created_at"', () => {
    expect(DailyWorkoutForm.rawAttributes.createdAt?.field).toBe('created_at');
  });

  it('updatedAt attribute resolves to DB column "updated_at"', () => {
    expect(DailyWorkoutForm.rawAttributes.updatedAt?.field).toBe('updated_at');
  });

  it('every model attribute maps to a column that exists on the live table', () => {
    // Round 5 regression class lock. For each attribute on the model,
    // the effective DB column name (explicit `field:` if present,
    // otherwise the JS attribute name) must exist on the live table.
    // This catches:
    //   - a new model field whose migration was forgotten
    //   - a rename on one side that wasn't mirrored on the other
    const attrs = DailyWorkoutForm.rawAttributes;
    const problems = [];
    for (const [jsName, spec] of Object.entries(attrs)) {
      const dbColumn = spec.field || jsName;
      if (!LIVE_DB_COLUMNS.has(dbColumn)) {
        problems.push(`${jsName} → ${dbColumn} (not on live table)`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('all non-timestamp attributes with camelCase names declare an explicit field: mapping', () => {
    // Anti-regression for the round 7 drift class. Any attribute whose
    // JS name differs from its DB column MUST declare `field:`. If
    // someone adds `newFooBar` without `field: 'new_foo_bar'`, the
    // generated SELECT will ask for a column that doesn't exist and
    // the save path 500s.
    const attrs = DailyWorkoutForm.rawAttributes;
    const problems = [];
    for (const [jsName, spec] of Object.entries(attrs)) {
      const effectiveColumn = spec.field || jsName;
      const isCamel = /[A-Z]/.test(jsName);
      // If the JS name is camelCase, the effective column must be
      // different from the JS name (i.e. explicit field: mapping).
      if (isCamel && effectiveColumn === jsName) {
        problems.push(`${jsName} has no field: mapping — will query quoted "${jsName}"`);
      }
    }
    expect(problems).toEqual([]);
  });
});
