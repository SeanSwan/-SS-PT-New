/**
 * ============================================================================
 * FILE: workoutPlanIdentityBackfillMigration.test.mjs
 * PURPOSE: Lock the deploy-time identity repair migration to data-only behavior.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Loads the real CommonJS migration, executes its ESM
 * backfill bridge, and prevents premature non-null enforcement.
 * HOW IT FITS IN THE APP: Nullable schema expansion -> data repair deployment ->
 * live parity proof -> separate contract deployment.
 * KEY DECISIONS: Migration down is intentionally non-destructive; it never erases
 * valid identity data and does not change column nullability.
 * NASM PROTOCOL CONTEXT: Historic prescriptions are repaired before downstream
 * receipts or PDF derivatives rely on their identity.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationPath = resolve(
  backendRoot,
  'migrations/20260715011000-backfill-workout-plan-content-identity.cjs',
);

describe('WorkoutPlan identity data migration', () => {
  it('runs the bounded repair bridge without enforcing the contract early', async () => {
    const migration = require(migrationPath);
    const source = readFileSync(migrationPath, 'utf8');
    const sequelize = {
      QueryTypes: { SELECT: 'SELECT', UPDATE: 'UPDATE' },
      transaction: vi.fn(async (operation) => operation({ id: 'migration-tx' })),
      query: vi.fn(async (sql) => {
        if (sql.includes('COUNT(*)')) return [{ count: 0 }];
        return [];
      }),
    };

    const result = await migration.up({ sequelize });

    expect(result).toEqual({
      batches: 0,
      repaired: 0,
      verified: 0,
      pendingInvalid: 0,
    });
    expect(source).toContain('backfillWorkoutPlanContentIdentity');
    expect(source).toContain('batchSize: 100');
    expect(source).not.toContain('changeColumn');
    expect(source).not.toContain('allowNull: false');
  });

  it('keeps rollback data-preserving', async () => {
    const migration = require(migrationPath);
    const queryInterface = {
      removeColumn: vi.fn(),
      sequelize: { query: vi.fn() },
    };

    await expect(migration.down(queryInterface)).resolves.toBeUndefined();
    expect(queryInterface.removeColumn).not.toHaveBeenCalled();
    expect(queryInterface.sequelize.query).not.toHaveBeenCalled();
  });
});
