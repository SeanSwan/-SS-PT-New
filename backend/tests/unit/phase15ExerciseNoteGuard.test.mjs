/**
 * Phase 15.1 — exerciseNote schema guard unit tests
 * ===================================================
 * Locks the fail-fast contract for
 * `backend/core/schemaGuards/phase15ExerciseNoteGuard.mjs`. The guard
 * is the operational safety net that prevents the backend from booting
 * against a DB where `workout_logs."exerciseNote"` does not yet exist.
 *
 * Cases covered:
 *   1. passes when the column is present
 *   2. throws with an actionable error when the column is missing
 *   3. passes silently when workout_logs itself is absent (fresh install)
 *   4. rethrows introspection errors (so ops see the real cause)
 *   5. rejects clearly when called without a Sequelize instance
 */
import { describe, it, expect, vi } from 'vitest';
import { assertPhase15ExerciseNoteColumn } from '../../core/schemaGuards/phase15ExerciseNoteGuard.mjs';

function makeFakeSequelize({ tables, describeResult, describeError, showAllError }) {
  const queryInterface = {
    showAllTables: vi.fn(async () => {
      if (showAllError) throw showAllError;
      return tables;
    }),
    describeTable: vi.fn(async () => {
      if (describeError) throw describeError;
      return describeResult;
    }),
  };
  return {
    getQueryInterface: () => queryInterface,
    __queryInterface: queryInterface,
  };
}

describe('Phase 15.1 — assertPhase15ExerciseNoteColumn', () => {
  it('returns ok when workout_logs.exerciseNote is present', async () => {
    const sequelize = makeFakeSequelize({
      tables: ['workout_logs', 'workout_sessions', 'users'],
      describeResult: {
        id: { type: 'INTEGER' },
        sessionId: { type: 'UUID' },
        exerciseName: { type: 'STRING' },
        notes: { type: 'TEXT' },
        exerciseNote: { type: 'TEXT' },
      },
    });

    const result = await assertPhase15ExerciseNoteColumn(sequelize);

    expect(result).toEqual({ status: 'ok', column: 'present' });
    expect(sequelize.__queryInterface.showAllTables).toHaveBeenCalledTimes(1);
    expect(sequelize.__queryInterface.describeTable).toHaveBeenCalledWith('workout_logs');
  });

  it('throws with an actionable Phase 15 error when exerciseNote is missing', async () => {
    const sequelize = makeFakeSequelize({
      tables: ['workout_logs', 'workout_sessions'],
      describeResult: {
        id: { type: 'INTEGER' },
        sessionId: { type: 'UUID' },
        exerciseName: { type: 'STRING' },
        notes: { type: 'TEXT' },
        // no exerciseNote field → drift case
      },
    });

    await expect(assertPhase15ExerciseNoteColumn(sequelize)).rejects.toThrow(
      /workout_logs\.exerciseNote column missing/,
    );
  });

  it('error includes the specific migration filename and sequelize-cli command', async () => {
    const sequelize = makeFakeSequelize({
      tables: ['workout_logs'],
      describeResult: { id: { type: 'INTEGER' }, sessionId: { type: 'UUID' } },
    });

    let caught;
    try {
      await assertPhase15ExerciseNoteColumn(sequelize);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught.message).toContain('20260415000001-add-exercise-note-to-workout-logs.cjs');
    expect(caught.message).toContain('npx sequelize-cli db:migrate');
    expect(caught.code).toBe('PHASE_15_SCHEMA_GUARD_FAILED');
  });

  it('passes silently when workout_logs table does not exist (fresh install)', async () => {
    const sequelize = makeFakeSequelize({
      tables: ['users', 'body_measurements'],
      describeResult: null,
    });

    const result = await assertPhase15ExerciseNoteColumn(sequelize);

    expect(result).toEqual({ status: 'table-missing' });
    // describeTable should NOT have been called — we short-circuit on
    // missing table so a fresh-install bootstrap is legitimate.
    expect(sequelize.__queryInterface.describeTable).not.toHaveBeenCalled();
  });

  it('rethrows when showAllTables itself fails', async () => {
    const sequelize = makeFakeSequelize({
      showAllError: new Error('connection refused'),
    });

    await expect(assertPhase15ExerciseNoteColumn(sequelize)).rejects.toThrow('connection refused');
  });

  it('rethrows when describeTable fails after seeing workout_logs in the list', async () => {
    const sequelize = makeFakeSequelize({
      tables: ['workout_logs'],
      describeError: new Error('permission denied for relation workout_logs'),
    });

    await expect(assertPhase15ExerciseNoteColumn(sequelize)).rejects.toThrow(
      'permission denied',
    );
  });

  it('accepts Sequelize showAllTables rows in { tableName } object form (older dialects)', async () => {
    const sequelize = makeFakeSequelize({
      tables: [
        { tableName: 'workout_logs' },
        { tableName: 'users' },
      ],
      describeResult: {
        id: { type: 'INTEGER' },
        exerciseNote: { type: 'TEXT' },
      },
    });

    const result = await assertPhase15ExerciseNoteColumn(sequelize);
    expect(result.status).toBe('ok');
  });

  it('rejects clearly when called without a sequelize instance', async () => {
    await expect(assertPhase15ExerciseNoteColumn(null)).rejects.toThrow(
      /Sequelize instance is required/,
    );
    await expect(assertPhase15ExerciseNoteColumn({})).rejects.toThrow(
      /Sequelize instance is required/,
    );
  });
});
