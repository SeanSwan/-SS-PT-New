/**
 * parsedWorkoutToLogPayload — unit tests
 * =======================================
 * Locks the contract between the Coach Assistant transcript intake and
 * the canonical adminClientService.logWorkout payload shape.
 */
import { describe, expect, it } from 'vitest';
import {
  parsedWorkoutToLogPayload,
  type ParsedWorkout,
} from './parsedWorkoutToLogPayload';

const baseParsed: ParsedWorkout = {
  exercises: [
    {
      exerciseName: 'Back Squat',
      sets: [
        { setNumber: 1, weight: 135, reps: 10 },
        { setNumber: 2, weight: 185, reps: 8 },
        { setNumber: 3, weight: 225, reps: 5 },
      ],
    },
  ],
  sessionNotes: 'Solid lower body session',
  overallIntensity: 7,
  date: '2026-04-12',
};

describe('parsedWorkoutToLogPayload — happy path', () => {
  it('maps a real parsed workout to the canonical logWorkout shape', () => {
    const out = parsedWorkoutToLogPayload(baseParsed);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0]).toEqual({
      name: 'Back Squat',
      sets: [
        { setNumber: 1, reps: 10, weight: 135 },
        { setNumber: 2, reps: 8, weight: 185 },
        { setNumber: 3, reps: 5, weight: 225 },
      ],
    });
    expect(out.date).toBe('2026-04-12');
    expect(out.intensity).toBe(7);
    expect(out.notes).toBe('Solid lower body session');
  });

  it('uses caller-supplied fallback title when parser is silent', () => {
    const out = parsedWorkoutToLogPayload(baseParsed, { fallbackTitle: 'Plaud Session' });
    expect(out.title).toBe('Plaud Session');
  });

  it('uses built-in default title when no fallback supplied', () => {
    const out = parsedWorkoutToLogPayload(baseParsed);
    expect(out.title).toBe('Voice Memo Workout');
  });

  it('preserves rpe when present and positive', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench',
        sets: [{ setNumber: 1, weight: 185, reps: 5, rpe: 8 }],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].rpe).toBe(8);
  });

  it('preserves set notes when present and non-blank', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench',
        sets: [{ setNumber: 1, weight: 185, reps: 5, notes: '  paused at chest  ' }],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].notes).toBe('paused at chest');
  });
});

describe('parsedWorkoutToLogPayload — defensive filtering', () => {
  it('drops parsed exercises with empty exerciseName', () => {
    const parsed: ParsedWorkout = {
      exercises: [
        { exerciseName: '', sets: [{ setNumber: 1, weight: 100, reps: 10 }] },
        { exerciseName: '   ', sets: [{ setNumber: 1, weight: 100, reps: 10 }] },
        { exerciseName: 'Real Exercise', sets: [{ setNumber: 1, weight: 100, reps: 10 }] },
      ],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0].name).toBe('Real Exercise');
  });

  it('drops sets with zero reps AND zero weight', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Squat',
        sets: [
          { setNumber: 1, weight: 0, reps: 0 },
          { setNumber: 2, weight: 135, reps: 10 },
          { setNumber: 3, weight: null, reps: 0 },
          { setNumber: 4, weight: 0, reps: 8 }, // bodyweight pushup case — keep
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets).toHaveLength(2);
    expect(out.exercises[0].sets[0]).toEqual({ setNumber: 1, reps: 10, weight: 135 });
    expect(out.exercises[0].sets[1]).toEqual({ setNumber: 2, reps: 8, weight: 0 });
  });

  it('drops exercises whose sets all get filtered', () => {
    const parsed: ParsedWorkout = {
      exercises: [
        {
          exerciseName: 'Phantom Exercise',
          sets: [
            { setNumber: 1, weight: 0, reps: 0 },
            { setNumber: 2, weight: null, reps: 0 },
          ],
        },
        {
          exerciseName: 'Real Exercise',
          sets: [{ setNumber: 1, weight: 100, reps: 10 }],
        },
      ],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0].name).toBe('Real Exercise');
  });

  it('renumbers setNumber sequentially after filtering', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Squat',
        sets: [
          { setNumber: 1, weight: 0, reps: 0 }, // dropped
          { setNumber: 2, weight: 135, reps: 10 },
          { setNumber: 3, weight: 0, reps: 0 }, // dropped
          { setNumber: 4, weight: 185, reps: 8 },
          { setNumber: 5, weight: 225, reps: 5 },
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
  });

  it('coerces null weight to 0 in output', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Pushup',
        sets: [{ setNumber: 1, weight: null, reps: 20 }],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].weight).toBe(0);
    expect(out.exercises[0].sets[0].reps).toBe(20);
  });

  it('drops rpe when not positive', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench',
        sets: [
          { setNumber: 1, weight: 135, reps: 5, rpe: 0 },
          { setNumber: 2, weight: 135, reps: 5, rpe: undefined },
          { setNumber: 3, weight: 135, reps: 5, rpe: 7 },
        ],
      }],
    };
    const out = parsedWorkoutToLogPayload(parsed);
    expect(out.exercises[0].sets[0].rpe).toBeUndefined();
    expect(out.exercises[0].sets[1].rpe).toBeUndefined();
    expect(out.exercises[0].sets[2].rpe).toBe(7);
  });
});

describe('parsedWorkoutToLogPayload — date and intensity fallbacks', () => {
  it('falls back to caller-supplied fallbackDate when parser omits date', () => {
    const out = parsedWorkoutToLogPayload(
      { exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }] },
      { fallbackDate: '2026-04-13' },
    );
    expect(out.date).toBe('2026-04-13');
  });

  it('falls back to today when neither parser nor caller supply a date', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
    });
    // Should be a valid YYYY-MM-DD string
    expect(out.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('clamps intensity to [1,10]', () => {
    expect(parsedWorkoutToLogPayload(
      { ...baseParsed, overallIntensity: 0 },
    ).intensity).toBe(1);
    expect(parsedWorkoutToLogPayload(
      { ...baseParsed, overallIntensity: 15 },
    ).intensity).toBe(10);
    expect(parsedWorkoutToLogPayload(
      { ...baseParsed, overallIntensity: 7.6 },
    ).intensity).toBe(8);
  });

  it('uses caller-supplied fallback intensity when parser is silent', () => {
    const out = parsedWorkoutToLogPayload(
      { exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }] },
      { fallbackIntensity: 6 },
    );
    expect(out.intensity).toBe(6);
  });

  it('uses built-in default intensity (5) when nothing is supplied', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
    });
    expect(out.intensity).toBe(5);
  });

  it('uses built-in default duration (50min) when nothing is supplied', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
    });
    expect(out.duration).toBe(50);
  });
});

describe('parsedWorkoutToLogPayload — empty/edge cases', () => {
  it('returns an empty exercises array when input has no exercises', () => {
    const out = parsedWorkoutToLogPayload({ exercises: [] });
    expect(out.exercises).toEqual([]);
    // Still produces a valid title/date/duration/intensity envelope
    expect(out.title).toBeTruthy();
    expect(out.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(out.duration).toBeGreaterThan(0);
    expect(out.intensity).toBeGreaterThanOrEqual(1);
  });

  it('omits notes field when sessionNotes is blank', () => {
    const out = parsedWorkoutToLogPayload({
      exercises: [{ exerciseName: 'X', sets: [{ setNumber: 1, weight: 100, reps: 10 }] }],
      sessionNotes: '   ',
    });
    expect(out.notes).toBeUndefined();
  });

  it('handles parser sending exercises field as undefined', () => {
    const out = parsedWorkoutToLogPayload({} as ParsedWorkout);
    expect(out.exercises).toEqual([]);
  });
});
