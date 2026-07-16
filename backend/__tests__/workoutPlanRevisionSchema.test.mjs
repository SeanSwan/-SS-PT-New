/**
 * ============================================================================
 * FILE: workoutPlanRevisionSchema.test.mjs
 * PURPOSE: Lock the additive WorkoutPlan revision-schema rollout contract.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Verifies model mappings, nullable expand semantics,
 * migration idempotency, and reversible column order without using a live DB.
 * HOW IT FITS IN THE APP: Sequelize migration/model -> deploy contract -> writers.
 * KEY DECISIONS: Mocked query-interface calls prove exact deploy-time behavior.
 * NASM PROTOCOL CONTEXT: Revision identity protects the prescribed program that
 * workout completion and progress evidence must reference.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationPath = resolve(
  backendRoot,
  'migrations/20260715010000-add-workout-plan-revision-columns.cjs'
);

const loadMigration = () => {
  try {
    return require(migrationPath);
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') return null;
    throw error;
  }
};

const sequelizeTypes = {
  INTEGER: 'INTEGER',
  STRING: (length) => ({ type: 'STRING', length })
};

// SECTION: Expand-phase schema contract
// PURPOSE: Prove the rollout stays additive, nullable, and idempotent.
// WHY: Old and new app instances must coexist until every writer is migrated.
describe('WorkoutPlan revision schema expansion', () => {
  it('maps nullable revision identity fields without breaking legacy rows', () => {
    const model = readFileSync(resolve(backendRoot, 'models/WorkoutPlan.mjs'), 'utf8');
    const migration = loadMigration();

    const revisionBlock = model.slice(
      model.indexOf('contentRevision: {'),
      model.indexOf('contentHash: {')
    );
    const hashBlock = model.slice(
      model.indexOf('contentHash: {'),
      model.indexOf('progressNotes: {')
    );

    expect(migration).not.toBeNull();
    expect(revisionBlock).toContain("field: 'content_revision'");
    expect(revisionBlock).toContain('allowNull: true');
    expect(revisionBlock).toContain('defaultValue: 1');
    expect(revisionBlock).toContain('validate: { min: 1 }');
    expect(hashBlock).toContain("field: 'content_hash'");
    expect(hashBlock).toContain('allowNull: true');
    expect(hashBlock).toContain('validate: { is: /^[a-f0-9]{64}$/ }');
  });

  it('adds only missing expand-phase columns with nullable rollout semantics', async () => {
    const migration = loadMigration();
    expect(migration).not.toBeNull();
    if (!migration) return;

    const addColumn = vi.fn();
    const queryInterface = {
      describeTable: vi.fn().mockResolvedValue({ id: {} }),
      addColumn
    };

    await migration.up(queryInterface, sequelizeTypes);

    expect(addColumn).toHaveBeenCalledTimes(2);
    expect(addColumn).toHaveBeenNthCalledWith(
      1,
      'workout_plans',
      'content_revision',
      expect.objectContaining({ type: 'INTEGER', allowNull: true, defaultValue: 1 })
    );
    expect(addColumn).toHaveBeenNthCalledWith(
      2,
      'workout_plans',
      'content_hash',
      expect.objectContaining({ type: { type: 'STRING', length: 64 }, allowNull: true })
    );
  });

  it('is idempotent in both migration directions', async () => {
    const migration = loadMigration();
    expect(migration).not.toBeNull();
    if (!migration) return;

    const addColumn = vi.fn();
    await migration.up({
      describeTable: vi.fn().mockResolvedValue({ content_revision: {}, content_hash: {} }),
      addColumn
    }, sequelizeTypes);
    expect(addColumn).not.toHaveBeenCalled();

    const removeColumn = vi.fn();
    await migration.down({
      describeTable: vi.fn().mockResolvedValue({ content_revision: {}, content_hash: {} }),
      removeColumn
    });
    expect(removeColumn.mock.calls).toEqual([
      ['workout_plans', 'content_hash'],
      ['workout_plans', 'content_revision']
    ]);
  });
});
