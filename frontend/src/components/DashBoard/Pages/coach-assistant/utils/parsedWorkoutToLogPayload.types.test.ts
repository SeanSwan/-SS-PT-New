import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_TEMPO,
  DEFAULT_TITLE,
  EXERCISE_NOTE_SEPARATOR,
  type LogWorkoutPayload,
  type ParsedWorkout,
} from './parsedWorkoutToLogPayload.types';

describe('parsedWorkoutToLogPayload types contract', () => {
  it('keeps mapper defaults available without importing mapper logic', () => {
    expect(DEFAULT_TITLE).toBe('Voice Memo Workout');
    expect(DEFAULT_DURATION_MINUTES).toBe(50);
    expect(DEFAULT_TEMPO).toBe('1/1/0');
    expect(EXERCISE_NOTE_SEPARATOR).toBe(' · Coach: ');
  });

  it('types parsed input and canonical log output without importing mapper logic', () => {
    const parsed: ParsedWorkout = {
      exercises: [{
        exerciseName: 'Bench Press',
        sets: [{ setNumber: 1, weight: 185, reps: 8, tempo: '3/1/1' }],
        performanceNotes: 'Bar path stayed consistent.',
      }],
      date: '2026-05-30',
    };

    const payload: LogWorkoutPayload = {
      title: DEFAULT_TITLE,
      date: parsed.date || '2026-05-30',
      duration: DEFAULT_DURATION_MINUTES,
      exercises: [{
        name: parsed.exercises[0].exerciseName,
        exerciseNote: parsed.exercises[0].performanceNotes,
        sets: [{
          setNumber: parsed.exercises[0].sets[0].setNumber,
          reps: parsed.exercises[0].sets[0].reps,
          weight: parsed.exercises[0].sets[0].weight || 0,
          tempo: parsed.exercises[0].sets[0].tempo || DEFAULT_TEMPO,
        }],
      }],
    };

    expect(payload.exercises[0].sets[0].tempo).toBe('3/1/1');
  });
});
