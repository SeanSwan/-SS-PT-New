/**
 * Phase 16 (2026-04-16) — schema guard unit tests
 * ===================================================
 * Parallels `phase15ExerciseNoteGuard.test.mjs`. Asserts the fail-fast
 * contract of `assertPhase16WorkoutSessionIntensityNullable` against
 * three mocked DB states:
 *
 *   1. Table missing — fresh install, resolves OK with `table-missing`.
 *   2. Column nullable (`is_nullable='YES'`) — resolves OK with `status:'ok'`.
 *   3. Column still NOT NULL — throws with the Phase 16 actionable message.
 */
import { describe, it, expect, vi } from 'vitest';

import { assertPhase16WorkoutSessionIntensityNullable } from '../../core/schemaGuards/phase16WorkoutSessionIntensityNullGuard.mjs';

function makeFakeSequelize({ tables, isNullable }) {
  return {
    getQueryInterface: () => ({
      showAllTables: vi.fn().mockResolvedValue(tables),
    }),
    query: vi.fn().mockImplementation(async (sql) => {
      if (sql.includes('information_schema.columns')) {
        return [[{ is_nullable: isNullable }]];
      }
      return [[]];
    }),
  };
}

describe('Phase 16 schema guard', () => {
  it('resolves `table-missing` when workout_sessions does not exist', async () => {
    const sequelize = makeFakeSequelize({ tables: [], isNullable: null });
    const result = await assertPhase16WorkoutSessionIntensityNullable(sequelize);
    expect(result).toEqual({ status: 'table-missing' });
  });

  it('resolves `ok` when workout_sessions.intensity is nullable', async () => {
    const sequelize = makeFakeSequelize({
      tables: ['workout_sessions'],
      isNullable: 'YES',
    });
    const result = await assertPhase16WorkoutSessionIntensityNullable(sequelize);
    expect(result).toEqual({ status: 'ok' });
  });

  it('throws with PHASE_16_SCHEMA_GUARD_FAILED when column is still NOT NULL', async () => {
    const sequelize = makeFakeSequelize({
      tables: ['workout_sessions'],
      isNullable: 'NO',
    });
    await expect(
      assertPhase16WorkoutSessionIntensityNullable(sequelize),
    ).rejects.toMatchObject({
      code: 'PHASE_16_SCHEMA_GUARD_FAILED',
    });
  });

  it('throws actionable message naming the migration file when column not nullable', async () => {
    const sequelize = makeFakeSequelize({
      tables: ['workout_sessions'],
      isNullable: 'NO',
    });
    await expect(
      assertPhase16WorkoutSessionIntensityNullable(sequelize),
    ).rejects.toThrow(/20260416000001-allow-null-workout-session-intensity\.cjs/);
  });

  it('handles table-name entries as objects with .tableName field', async () => {
    const sequelize = makeFakeSequelize({
      tables: [{ tableName: 'workout_sessions' }],
      isNullable: 'YES',
    });
    const result = await assertPhase16WorkoutSessionIntensityNullable(sequelize);
    expect(result).toEqual({ status: 'ok' });
  });

  it('rejects non-Sequelize input', async () => {
    await expect(
      assertPhase16WorkoutSessionIntensityNullable(null),
    ).rejects.toThrow(/valid Sequelize instance/);
    await expect(
      assertPhase16WorkoutSessionIntensityNullable({}),
    ).rejects.toThrow(/valid Sequelize instance/);
  });
});
