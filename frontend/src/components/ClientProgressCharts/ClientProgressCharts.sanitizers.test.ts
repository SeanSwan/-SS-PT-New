import { describe, expect, it } from 'vitest';
import { sanitizeProgressPayload } from './ClientProgressCharts.sanitizers';

describe('ClientProgressCharts payload sanitizers', () => {
  it('coerces malformed progress payload values before Victory charts receive them', () => {
    const sanitized = sanitizeProgressPayload({
      workoutHistory: [
        {
          date: '2026-05-01',
          duration: '55',
          intensity: 'NaN',
          totalVolume: '12000',
          exerciseName: 'Back Squat',
        },
      ],
      volumeProgression: [
        { date: 'not-a-date', totalWeight: '9000', totalReps: '80', totalSets: '12' },
        { date: '2026-05-01', totalWeight: 'bad', totalReps: '25', totalSets: '5', intensity: '8' },
      ],
      oneRepMaxes: [
        { exercise: 'Bench Press', max: 'bad', estimated1RM: '263', improvement: 'NaN' },
      ],
      formTrends: [
        { date: '2026-05-01', averageFormRating: 'bad', exerciseCount: '3' },
      ],
      nasmCategories: [
        { category: 'Strength Training', level: 'NaN', maxLevel: '1000', percentComplete: '18' },
      ],
      bodyComposition: [
        { date: '2026-05-01', weight: '185', bodyFat: '20.5', muscleMass: 'bad', progressScore: '7' },
      ],
      strengthProgression: [
        { date: '2026-05-01', exercises: { Squat: '315', Broken: 'NaN' } },
      ],
      consistencyData: [
        { date: '2026-05-01', count: '2', volume: 'bad' },
      ],
      muscleGroupVolume: [
        { muscleGroup: 'Back', volume: 'bad', previousVolume: '2400' },
      ],
      rpeDistribution: [
        { zone: 'Hard (7-8)', count: '6', percentage: 'bad', color: '' },
      ],
      personalRecords: [
        { date: '2026-05-02', exercise: 'Deadlift', weight: '405', reps: '3', estimated1RM: 'bad' },
      ],
      restCompliance: [
        { phase: 'Phase 2', prescribed: '60', actual: 'bad' },
      ],
      exerciseFrequency: [
        { exercise: 'Back Squat', count: '8', lastPerformed: 'not-a-date' },
      ],
      sessionIntensity: [
        { date: '2026-05-01', duration: '60', intensity: 'bad', totalVolume: '15000' },
      ],
    });

    expect(sanitized.volumeProgression).toEqual([
      { date: '2026-05-01', totalWeight: 0, totalReps: 25, totalSets: 5, intensity: 8 },
    ]);
    expect(sanitized.oneRepMaxes).toEqual([
      { exercise: 'Bench Press', max: 263, label: '263 lbs', improvement: 0 },
    ]);
    expect(sanitized.formTrends).toEqual([
      { date: '2026-05-01', averageFormRating: 3, exerciseCount: 3 },
    ]);
    expect(sanitized.nasmCategories[0]).toMatchObject({
      category: 'Strength Training',
      level: 0,
      maxLevel: 1000,
      percentComplete: 18,
    });
    expect(sanitized.bodyComposition[0]).toMatchObject({
      weight: 185,
      bodyFat: 20.5,
      muscleMass: 0,
      progressScore: 7,
    });
    expect(sanitized.strengthProgression[0].exercises).toEqual({ Squat: 315, Broken: 0 });
    expect(sanitized.consistencyData[0]).toMatchObject({ count: 2, volume: 0 });
    expect(sanitized.muscleGroupVolume[0]).toMatchObject({ volume: 0, previousVolume: 2400 });
    expect(sanitized.rpeDistribution[0]).toMatchObject({ count: 6, percentage: 0 });
    expect(sanitized.personalRecords[0]).toMatchObject({ weight: 405, reps: 3, estimated1RM: 0 });
    expect(sanitized.restCompliance[0]).toMatchObject({ prescribed: 60, actual: 0 });
    expect(sanitized.exerciseFrequency[0]).toMatchObject({ count: 8, lastPerformed: '' });
    expect(sanitized.sessionIntensity).toEqual([]);
  });
});
