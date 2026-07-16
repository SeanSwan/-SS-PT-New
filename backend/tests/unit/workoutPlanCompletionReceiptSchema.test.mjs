/**
 * ============================================================================
 * FILE: workoutPlanCompletionReceiptSchema.test.mjs
 * PURPOSE: Lock the immutable completion-receipt model and database contract.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Verifies model fields, physical column names, uniqueness,
 * FK retention policy, positive-value checks, and rollback behavior.
 * HOW IT FITS IN THE APP: Sequelize model and migration stay schema-identical.
 * KEY DECISIONS: User/plan/form deletion cascades for privacy; session deletion
 * preserves receipt evidence with a nullable link; updates are forbidden.
 * NASM PROTOCOL CONTEXT: Completion history is immutable prescription evidence.
 */

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationPath = resolve(
  backendRoot,
  'migrations/20260715012000-create-workout-plan-completion-receipts.cjs',
);

const loadModel = async () => {
  try {
    return (await import('../../models/WorkoutPlanCompletionReceipt.mjs')).default;
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  }
};

const loadMigration = () => {
  try {
    return require(migrationPath);
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') return null;
    throw error;
  }
};

describe('WorkoutPlanCompletionReceipt schema', () => {
  it('maps the immutable model to the authoritative snake-case columns', async () => {
    const model = await loadModel();
    expect(model).not.toBeNull();
    expect(model.tableName).toBe('workout_plan_completion_receipts');
    expect(model.options.updatedAt).toBe(false);
    expect(model.options.hooks).toMatchObject({
      beforeUpdate: [expect.any(Function)],
      beforeBulkUpdate: [expect.any(Function)],
      beforeDestroy: [expect.any(Function)],
      beforeBulkDestroy: [expect.any(Function)],
    });
    expect(model.rawAttributes.workoutPlanId.type.key).toBe('UUID');
    expect(model.rawAttributes).toMatchObject({
      workoutPlanId: { field: 'workout_plan_id', allowNull: false },
      clientId: { field: 'client_id', allowNull: false },
      dayKey: { field: 'day_key', allowNull: false },
      assignmentId: { field: 'assignment_id', allowNull: false },
      occurrenceIndex: { field: 'occurrence_index', allowNull: false },
      scheduledDate: { field: 'scheduled_date', allowNull: false },
      prescribedRevision: { field: 'prescribed_revision', allowNull: false },
      prescribedHash: { field: 'prescribed_hash', allowNull: false },
      exerciseSnapshot: { field: 'exercise_snapshot', allowNull: false },
      dailyWorkoutFormId: { field: 'daily_workout_form_id', allowNull: false },
      workoutSessionId: { field: 'workout_session_id', allowNull: true },
      idempotencyKey: { field: 'idempotency_key', allowNull: false },
      completedAt: { field: 'completed_at', allowNull: false },
      createdAt: { field: 'created_at', allowNull: false },
    });
    expect(model.options.indexes.map((index) => index.name)).toEqual(expect.arrayContaining([
      'workout_plan_completion_receipts_idempotency_unique',
      'workout_plan_completion_receipts_daily_form_unique',
      'idx_workout_plan_completion_receipts_plan_revision',
      'idx_workout_plan_completion_receipts_client_date',
    ]));
  });

  it('creates constraints and indexes in one transaction', async () => {
    const migration = loadMigration();
    expect(migration).not.toBeNull();
    const transaction = { id: 'receipt-schema-tx' };
    const createTable = vi.fn();
    const addIndex = vi.fn();
    const query = vi.fn().mockResolvedValue([[], {}]);
    const queryInterface = {
      createTable,
      addIndex,
      sequelize: {
        query,
        transaction: vi.fn(async (operation) => operation(transaction)),
      },
    };
    const Sequelize = {
      UUID: 'UUID', UUIDV4: 'UUIDV4', INTEGER: 'INTEGER', DATEONLY: 'DATEONLY',
      JSONB: 'JSONB', DATE: 'DATE', STRING: (size) => `STRING(${size})`,
      CHAR: (size) => `CHAR(${size})`, fn: (name) => name,
    };

    await migration.up(queryInterface, Sequelize);

    expect(createTable).toHaveBeenCalledWith(
      'workout_plan_completion_receipts',
      expect.objectContaining({
        workout_plan_id: expect.objectContaining({
          type: 'UUID',
          references: { model: 'workout_plans', key: 'id' },
        }),
        client_id: expect.objectContaining({ references: { model: 'Users', key: 'id' } }),
        daily_workout_form_id: expect.objectContaining({ references: { model: 'daily_workout_forms', key: 'id' } }),
        workout_session_id: expect.objectContaining({ onDelete: 'SET NULL' }),
      }),
      { transaction },
    );
    expect(addIndex).toHaveBeenCalledTimes(4);
    expect(query.mock.calls.map(([sql]) => sql).join('\n')).toContain('CHECK (occurrence_index > 0)');
    expect(query.mock.calls.map(([sql]) => sql).join('\n')).toContain('CHECK (prescribed_revision > 0)');
  });

  it('drops only the receipt table on rollback', async () => {
    const migration = loadMigration();
    expect(migration).not.toBeNull();
    const transaction = { id: 'receipt-schema-down-tx' };
    const dropTable = vi.fn();
    const queryInterface = {
      dropTable,
      sequelize: { transaction: vi.fn(async (operation) => operation(transaction)) },
    };

    await migration.down(queryInterface);

    expect(dropTable).toHaveBeenCalledWith('workout_plan_completion_receipts', { transaction });
  });
});
