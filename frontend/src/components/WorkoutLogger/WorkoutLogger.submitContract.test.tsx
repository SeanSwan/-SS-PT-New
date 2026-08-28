/**
 * Phase 16 (2026-04-16) — WorkoutLogger submit-contract behavioral test
 * ======================================================================
 * T10 per the Phase 16 pinned plan. Codex Round 3 gap: source-text
 * locks alone can pass even if a regression coerces untouched ratings
 * back to numbers during hand-off or serialization without
 * reintroducing any of the literal `5` seeds.
 *
 * This test closes that gap at the level that matters — what actually
 * goes on the wire when the user submits. The pinned wire contract:
 *
 *   - Untouched overallIntensity → body.overallIntensity is absent
 *   - Explicit 7 → body.overallIntensity === 7
 *   - Untouched set.rpe → set object has no rpe key
 *   - Explicit rpe 8 → set object has rpe: 8
 *   - Untouched set.formQuality → set object has no formQuality key
 *   - Explicit formQuality 5 → set object has formQuality: 5
 *   - Untouched exercise.formRating → exercise object has no formRating key
 *   - Explicit formRating 4 → exercise object has formRating: 4
 *
 * Strategy: the payload builder extracted to `workoutLoggerSubmitPayload.ts`
 * is the single choke point every submit flows through. Testing it
 * directly gives deterministic behavioral coverage without the
 * brittleness of mounting the full 700-line WorkoutLogger with its
 * NASM protocol state, offline queue, ghost pre-fill, and auth
 * context. The WorkoutLogger source-text test (T7) independently
 * verifies this utility is the one actually called from handleSubmit.
 */
import { describe, it, expect } from 'vitest';
import { buildWorkoutFormSubmitBody } from './workoutLoggerSubmitPayload';
import type { ExerciseEntry } from '../../services/nasmApiService';

// ─────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────

function makeSet(overrides: Partial<ExerciseEntry['sets'][0]> = {}) {
  return {
    setNumber: 1,
    weight: 135,
    reps: 10,
    rpe: null,
    tempo: '2-0-2',
    restTime: 60,
    formQuality: null,
    notes: '',
    ...overrides,
  };
}

function makeExercise(overrides: Partial<ExerciseEntry> = {}): ExerciseEntry {
  return {
    exerciseId: 'ex-bench-1',
    exerciseName: 'Bench Press',
    sets: [makeSet()],
    formRating: null,
    painLevel: 0,
    performanceNotes: '',
    ...overrides,
  };
}

const BASE_PARAMS = {
  clientId: 42,
  date: '2026-04-16',
  sessionNotes: 'Solid session',
};

// ─────────────────────────────────────────────────────────────
// Case A: all rating fields untouched → omitted on the wire
// ─────────────────────────────────────────────────────────────

describe('T10 Phase 16 — WorkoutLogger submit wire contract: omission', () => {
  it('omits overallIntensity when untouched (null)', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
    });
    expect('overallIntensity' in body).toBe(false);
  });

  it('omits overallIntensity when undefined (mount-initial state)', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: undefined,
    });
    expect('overallIntensity' in body).toBe(false);
  });

  it('omits set.rpe when untouched on every set', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise({ sets: [makeSet(), makeSet({ setNumber: 2 })] })],
      overallIntensity: null,
    });
    for (const set of body.exercises[0].sets) {
      expect('rpe' in set).toBe(false);
    }
  });

  it('omits set.formQuality when untouched on every set', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise({ sets: [makeSet(), makeSet({ setNumber: 2 })] })],
      overallIntensity: null,
    });
    for (const set of body.exercises[0].sets) {
      expect('formQuality' in set).toBe(false);
    }
  });

  it('omits exercise.formRating when untouched on every exercise', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [
        makeExercise(),
        makeExercise({ exerciseId: 'ex-squat-1', exerciseName: 'Squat' }),
      ],
      overallIntensity: null,
    });
    for (const ex of body.exercises) {
      expect('formRating' in ex).toBe(false);
    }
  });

  it('ANTI-REGRESSION: no phantom 5/3 values anywhere in the serialized body', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/"overallIntensity"\s*:\s*5/);
    expect(serialized).not.toMatch(/"rpe"\s*:\s*5/);
    expect(serialized).not.toMatch(/"formQuality"\s*:\s*3/);
    expect(serialized).not.toMatch(/"formRating"\s*:\s*3/);
  });
});

// ─────────────────────────────────────────────────────────────
// Case B: user-picked values pass through unchanged
// ─────────────────────────────────────────────────────────────

describe('T10 Phase 16 — WorkoutLogger submit wire contract: preservation', () => {
  it('preserves overallIntensity when explicitly set to 7', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: 7,
    });
    expect(body.overallIntensity).toBe(7);
  });

  it('preserves set.rpe when explicitly set to 8', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise({ sets: [makeSet({ rpe: 8 })] })],
      overallIntensity: null,
    });
    expect(body.exercises[0].sets[0].rpe).toBe(8);
  });

  it('preserves set.formQuality when explicitly set to 5', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise({ sets: [makeSet({ formQuality: 5 })] })],
      overallIntensity: null,
    });
    expect(body.exercises[0].sets[0].formQuality).toBe(5);
  });

  it('preserves exercise.formRating when explicitly set to 4', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise({ formRating: 4 })],
      overallIntensity: null,
    });
    expect(body.exercises[0].formRating).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────
// Case C: mixed — some sets rated, others not, within same exercise
// ─────────────────────────────────────────────────────────────

describe('T10 Phase 16 — WorkoutLogger submit wire contract: mixed states', () => {
  it('per-set rating independence — set 1 rated, set 2 untouched', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [
        makeExercise({
          sets: [
            makeSet({ setNumber: 1, rpe: 9, formQuality: 4 }),
            makeSet({ setNumber: 2 /* untouched */ }),
          ],
        }),
      ],
      overallIntensity: null,
    });
    const sets = body.exercises[0].sets;
    expect(sets[0].rpe).toBe(9);
    expect(sets[0].formQuality).toBe(4);
    expect('rpe' in sets[1]).toBe(false);
    expect('formQuality' in sets[1]).toBe(false);
  });

  it('user rates session 7 but leaves all set-level ratings untouched', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: 7,
    });
    expect(body.overallIntensity).toBe(7);
    expect('rpe' in body.exercises[0].sets[0]).toBe(false);
    expect('formRating' in body.exercises[0]).toBe(false);
  });

  it('user rates sets but leaves session-level intensity untouched', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [
        makeExercise({
          formRating: 4,
          sets: [makeSet({ rpe: 8, formQuality: 5 })],
        }),
      ],
      overallIntensity: null,
    });
    expect('overallIntensity' in body).toBe(false);
    expect(body.exercises[0].sets[0].rpe).toBe(8);
    expect(body.exercises[0].sets[0].formQuality).toBe(5);
    expect(body.exercises[0].formRating).toBe(4);
  });

  it('carries a schedule-origin session id without overloading DailyWorkoutForm.sessionId', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
      scheduledSessionId: '314',
    });

    expect(body.scheduledSessionId).toBe('314');
    expect('sessionId' in body).toBe(false);
  });

  it('carries the selected training-location equipment profile when one is chosen', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
      equipmentProfileId: 77,
    });

    expect(body.equipmentProfileId).toBe(77);
  });

  it('omits training-location equipment profile when none is chosen', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
      equipmentProfileId: null,
    });

    expect('equipmentProfileId' in body).toBe(false);
  });

  it('carries sanitized non-billable planned assignment metadata when loading today from a plan', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:homework',
        planId: 'plan-6m',
        assignmentType: 'homework',
        source: 'workout_plan',
        isBillable: false,
        shouldDeductSession: false,
        title: 'Coach Homework Lower Body',
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Lower Body',
        exerciseCount: 2,
        firstExerciseName: 'Goblet Squat',
      },
    });

    expect(body.plannedAssignment).toEqual({
      assignmentId: 'plan-6m:w4:d2:homework',
      assignmentKey: 'plan-6m:w4:d2:homework',
      planId: 'plan-6m',
      assignmentType: 'homework',
      source: 'workout_plan',
      isBillable: false,
      shouldDeductSession: false,
      title: 'Coach Homework Lower Body',
      weekNumber: 4,
      dayNumber: 2,
      dayLabel: 'Lower Body',
      exerciseCount: 2,
      firstExerciseName: 'Goblet Squat',
    });
  });

  it('does not combine schedule-origin logging with non-billable planned assignment metadata', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
      scheduledSessionId: '314',
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:homework',
        planId: 'plan-6m',
        assignmentType: 'homework',
        source: 'workout_plan',
        isBillable: false,
        shouldDeductSession: false,
        weekNumber: 4,
        dayNumber: 2,
      },
    });

    expect(body.scheduledSessionId).toBe('314');
    expect(body.plannedAssignment).toBeUndefined();
  });

  it('carries scheduled trainer-session plan metadata for backend cursor verification', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
      scheduledSessionId: '314',
      plannedAssignment: {
        assignmentKey: 'plan-6m:w4:d2:trainer_session',
        planId: 'plan-6m',
        assignmentType: 'trainer_session',
        source: 'workout_plan',
        isBillable: true,
        shouldDeductSession: true,
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Trainer Floor Session',
      },
    });

    expect(body.plannedAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w4:d2:trainer_session',
      planId: 'plan-6m',
      assignmentType: 'trainer_session',
      source: 'workout_plan',
      isBillable: true,
      shouldDeductSession: true,
      weekNumber: 4,
      dayNumber: 2,
      dayLabel: 'Trainer Floor Session',
    });
  });

  it('drops incomplete planned assignment metadata instead of sending a bypassable no-deduction flag', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise()],
      overallIntensity: null,
      plannedAssignment: {
        assignmentKey: 'missing-plan-id',
        assignmentType: 'homework',
        isBillable: false,
        shouldDeductSession: false,
        weekNumber: 4,
        dayNumber: 2,
      },
    });

    expect(body.plannedAssignment).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// Case D: non-rating fields unaffected by the sanitizer
// ─────────────────────────────────────────────────────────────

describe('T10 Phase 16 — sanitizer does not touch non-rating fields', () => {
  it('preserves circuit, exercise-role, drop-set, and isometric-hold metadata', () => {
    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [makeExercise({
        circuitName: 'Circuit 1',
        circuitOrder: 2,
        exerciseRole: 'drop-movement',
        sets: [makeSet({ setType: 'dropset', isometricHoldSeconds: 10 })],
      })],
      overallIntensity: null,
    });

    expect(body.exercises[0]).toMatchObject({
      circuitName: 'Circuit 1',
      circuitOrder: 2,
      exerciseRole: 'drop-movement',
    });
    expect(body.exercises[0].sets[0]).toMatchObject({
      setType: 'dropset',
      isometricHoldSeconds: 10,
    });
  });

  it('preserves clientId, date, sessionNotes, weight, reps, tempo, restTime, notes, painLevel, performanceNotes', () => {
    const body = buildWorkoutFormSubmitBody({
      clientId: 99,
      date: '2026-04-17',
      sessionNotes: 'custom session notes',
      exercises: [
        makeExercise({
          exerciseName: 'Deadlift',
          painLevel: 2,
          performanceNotes: 'felt sharp in lower back',
          sets: [
            makeSet({
              weight: 225,
              reps: 5,
              tempo: '3-0-1',
              restTime: 120,
              notes: 'first set of the day',
            }),
          ],
        }),
      ],
      overallIntensity: null,
    });
    expect(body.clientId).toBe(99);
    expect(body.date).toBe('2026-04-17');
    expect(body.sessionNotes).toBe('custom session notes');
    expect(body.exercises[0].exerciseName).toBe('Deadlift');
    expect(body.exercises[0].painLevel).toBe(2);
    expect(body.exercises[0].performanceNotes).toBe('felt sharp in lower back');
    expect(body.exercises[0].sets[0].weight).toBe(225);
    expect(body.exercises[0].sets[0].reps).toBe(5);
    expect(body.exercises[0].sets[0].tempo).toBe('3-0-1');
    expect(body.exercises[0].sets[0].restTime).toBe(120);
    expect(body.exercises[0].sets[0].notes).toBe('first set of the day');
  });

  it('preserves exercise classification metadata for challenge progress rules', () => {
    const exercise = {
      ...makeExercise({ exerciseName: 'Push Up' }),
      category: 'push',
      exerciseFamily: 'push',
      movementPattern: 'horizontal_push',
      bodyPartCategory: 'Chest',
      muscleGroups: ['chest', 'triceps'],
      tags: ['bodyweight', 'push'],
    } as ExerciseEntry & {
      category: string;
      exerciseFamily: string;
      movementPattern: string;
      bodyPartCategory: string;
      muscleGroups: string[];
      tags: string[];
    };

    const body = buildWorkoutFormSubmitBody({
      ...BASE_PARAMS,
      exercises: [exercise],
      overallIntensity: null,
    });
    const sentExercise = body.exercises[0] as typeof body.exercises[0] & typeof exercise;

    expect(sentExercise.category).toBe('push');
    expect(sentExercise.exerciseFamily).toBe('push');
    expect(sentExercise.movementPattern).toBe('horizontal_push');
    expect(sentExercise.bodyPartCategory).toBe('Chest');
    expect(sentExercise.muscleGroups).toEqual(['chest', 'triceps']);
    expect(sentExercise.tags).toEqual(['bodyweight', 'push']);
  });
});
