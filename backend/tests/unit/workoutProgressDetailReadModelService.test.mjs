/**
 * workoutProgressDetailReadModelService tests
 * ==========================================
 * Locks the client progress chart read model to canonical WorkoutLog rows
 * while preserving legacy DailyWorkoutForm JSON as a no-log fallback.
 */

import { describe, expect, it } from 'vitest';

import {
  buildProgressDetailedAnalysisRows,
} from '../../services/workoutProgressDetailReadModelService.mjs';

describe('workoutProgressDetailReadModelService', () => {
  it('prefers canonical WorkoutLog rows over matching stale DailyWorkoutForm formData', () => {
    const result = buildProgressDetailedAnalysisRows({
      forms: [{
        id: 'form-1',
        sessionId: 'session-1',
        date: '2026-05-02',
        formData: {
          estimatedDuration: 20,
          overallIntensity: 1,
          exercises: [{
            exerciseName: 'Squat',
            sets: [{ reps: 10, weight: 10, rpe: 5 }],
          }],
        },
      }],
      workoutSessions: [{
        id: 'session-1',
        date: '2026-05-02T18:30:00.000Z',
        duration: 45,
        intensity: 8,
        logs: [
          { exerciseName: 'Squat', setNumber: 1, reps: 5, weight: 100, rpe: 8 },
          { exerciseName: 'Squat', setNumber: 2, reps: 5, weight: 105, rpe: 9 },
        ],
      }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      date: '2026-05-02',
      sessionId: 'session-1',
      source: 'workout_logs',
      formData: {
        estimatedDuration: 45,
        overallIntensity: 8,
        exercises: [{
          exerciseName: 'Squat',
          sets: [
            { reps: 5, weight: 100, rpe: 8 },
            { reps: 5, weight: 105, rpe: 9 },
          ],
        }],
      },
    });
  });

  it('keeps legacy formData rows when no canonical WorkoutLog rows exist', () => {
    const result = buildProgressDetailedAnalysisRows({
      forms: [{
        id: 'form-legacy',
        date: '2026-05-01',
        formData: {
          exercises: [{
            exerciseName: 'Pull Up',
            sets: [{ reps: 4, weight: 0, rpe: 7 }],
          }],
        },
      }],
      workoutSessions: [],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'form-legacy',
      date: '2026-05-01',
      source: 'daily_workout_forms',
      formData: {
        exercises: [{
          exerciseName: 'Pull Up',
          sets: [{ reps: 4, weight: 0, rpe: 7 }],
        }],
      },
    });
  });

  it('drops sessionless legacy formData on dates already covered by canonical logs', () => {
    const result = buildProgressDetailedAnalysisRows({
      forms: [{
        id: 'stale-form',
        date: '2026-05-03',
        formData: {
          exercises: [{
            exerciseName: 'Bench Press',
            sets: [{ reps: 10, weight: 50 }],
          }],
        },
      }],
      workoutSessions: [{
        id: 'session-3',
        date: '2026-05-03T12:00:00.000Z',
        logs: [
          { exerciseName: 'Bench Press', setNumber: 1, reps: 5, weight: 100 },
        ],
      }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'session:session-3',
      source: 'workout_logs',
    });
  });
});
