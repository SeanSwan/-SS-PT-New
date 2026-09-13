import { describe, expect, it } from 'vitest';
import { buildContentSignature, buildPlanData } from './planDataBuilder';
import { hydrateLoadedPlanExercises } from './workoutPlannerLoadPlanHydration';
import { mapGeneratedWorkoutToPlanExercises } from './workoutPlannerGenerationActions.helpers';
import { buildManualExercise } from './planDataBuilder.testFixtures';
import {
  decodeIntensityPrescription,
  encodeIntensityPrescription,
} from './workoutPlannerPrescription';

const persistedExercise = (planData: Record<string, unknown>) => (
  ((planData.weeks as Array<{ days: Array<{ exercises: Record<string, unknown>[] }> }>)[0]
    .days[0].exercises[0])
);

describe('shared intensity prescription codec', () => {
  it('parses a complete legacy percentage while preserving its source text', () => {
    expect(decodeIntensityPrescription('85% 1RM')).toEqual({
      intensityPercent: 85,
      intensityGuideline: '85% 1RM',
    });
  });

  it.each(['70-80% 1RM', 'as tolerated'])(
    'keeps a range or unrecognized text numeric-free: %s',
    (intensityGuideline) => {
      expect(decodeIntensityPrescription(intensityGuideline)).toEqual({
        intensityGuideline,
      });
    },
  );

  it('gives a finite typed value precedence and rejects non-finite values', () => {
    expect(decodeIntensityPrescription(83, '85% 1RM')).toEqual({
      intensityPercent: 83,
      intensityGuideline: '83% 1RM',
    });
    expect(decodeIntensityPrescription(Number.POSITIVE_INFINITY, 'unknown')).toEqual({
      intensityGuideline: 'unknown',
    });
    expect(encodeIntensityPrescription(Number.NaN, '70-80% 1RM')).toEqual({
      intensityGuideline: '70-80% 1RM',
    });
  });
});

describe('planner prescription compatibility at the real persistence boundaries', () => {
  it.each([0, 40, 70, 83, 85])(
    'round-trips an explicit typed intensity of %s without inventing a default',
    (intensityPercent) => {
      const exercise = buildManualExercise('stable-exercise', 'Goblet Squat', {
        exerciseSlim: {
          ...buildManualExercise('stable-exercise', 'Goblet Squat').exerciseSlim,
          exerciseKey: 'stable-exercise',
        },
        intensityPercent,
        restSeconds: 0,
        tempo: '3-1-1',
        notes: 'Keep ribs stacked.',
      });

      const saved = buildPlanData({
        mode: 'manual',
        phaseName: 'Strength Endurance',
        phaseNumber: 2,
        category: 'full_body',
        categoryLabel: 'Full Body',
        goal: 'general_fitness',
        planExercises: [exercise],
      });
      const persisted = persistedExercise(saved);

      expect(persisted).toMatchObject({
        exerciseId: 'stable-exercise',
        exerciseKey: 'stable-exercise',
        restPeriod: 0,
        tempo: '3-1-1',
        notes: 'Keep ribs stacked.',
        intensityPercent,
        intensityGuideline: `${intensityPercent}% 1RM`,
      });

      const [hydrated] = hydrateLoadedPlanExercises('plan-typed', [persisted]);
      expect(hydrated).toMatchObject({
        intensityPercent,
        restSeconds: 0,
        tempo: '3-1-1',
        notes: 'Keep ribs stacked.',
        exerciseSlim: { exerciseKey: 'stable-exercise' },
      });
    },
  );

  it('parses the known complete legacy form while retaining zero rest and identity', () => {
    const [hydrated] = hydrateLoadedPlanExercises('plan-legacy', [{
      exerciseId: 'legacy-exercise',
      exerciseKey: 'legacy-key',
      exerciseName: 'Legacy Press',
      sets: 4,
      reps: '8',
      restPeriod: 0,
      tempo: '2-0-2',
      intensityGuideline: '85% 1RM',
      notes: 'Legacy cue',
    }]);

    expect(hydrated).toMatchObject({
      intensityPercent: 85,
      restSeconds: 0,
      tempo: '2-0-2',
      notes: 'Legacy cue',
      exerciseSlim: {
        id: 'legacy-exercise',
        exerciseKey: 'legacy-key',
      },
    });
  });

  it.each(['70-80% 1RM', 'as tolerated', ''])(
    'leaves unsupported intensity text unset and preserves the original text: %s',
    (intensityGuideline) => {
      const [hydrated] = hydrateLoadedPlanExercises('plan-unknown', [{
        exerciseId: 'unknown-exercise',
        intensityGuideline,
      }]);

      expect(hydrated.intensityPercent).toBeUndefined();
      expect(hydrated.intensityGuideline).toBe(intensityGuideline || undefined);
    },
  );

  it('uses typed intensity before a conflicting legacy string and rejects non-finite numbers', () => {
    const [typed] = hydrateLoadedPlanExercises('plan-precedence', [{
      exerciseId: 'typed-exercise',
      intensityPercent: 83,
      intensityGuideline: '85% 1RM',
    }]);
    const [invalid] = hydrateLoadedPlanExercises('plan-invalid', [{
      exerciseId: 'invalid-exercise',
      intensityPercent: Number.NaN,
      intensityGuideline: 'unknown prescription',
    }]);

    expect(typed.intensityPercent).toBe(83);
    expect(invalid.intensityPercent).toBeUndefined();
    expect(invalid.intensityGuideline).toBe('unknown prescription');
  });

  it('preserves an unsupported legacy string through a manual save', () => {
    const saved = buildPlanData({
      mode: 'manual',
      phaseName: 'Strength Endurance',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: [buildManualExercise('range-exercise', 'Range Press', {
        intensityPercent: undefined,
        intensityGuideline: '70-80% 1RM',
      })],
    });

    expect(persistedExercise(saved)).toMatchObject({
      intensityGuideline: '70-80% 1RM',
    });
    expect(persistedExercise(saved)).not.toHaveProperty('intensityPercent');
  });

  it('clears both typed and legacy intensity fields after an explicit blank edit', () => {
    const saved = buildPlanData({
      mode: 'manual',
      phaseName: 'Strength Endurance',
      phaseNumber: 2,
      category: 'full_body',
      categoryLabel: 'Full Body',
      goal: 'general_fitness',
      planExercises: [buildManualExercise('cleared-exercise', 'Cleared Press', {
        intensityPercent: undefined,
        intensityGuideline: undefined,
      })],
    });
    const persisted = persistedExercise(saved);

    expect(persisted).not.toHaveProperty('intensityPercent');
    expect(persisted).not.toHaveProperty('intensityGuideline');
    expect(hydrateLoadedPlanExercises('plan-cleared', [persisted])[0].intensityPercent)
      .toBeUndefined();
  });

  it('keeps the manual signature clean across save and hydrate normalization', () => {
    const sourceExercise = buildManualExercise('signature-exercise', 'Signature Press', {
      intensityPercent: 83,
      intensityGuideline: undefined,
      restSeconds: 0,
    });
    const buildInputs = {
      mode: 'manual' as const,
      phaseName: 'Strength Endurance',
      phaseNumber: 2,
      category: 'full_body' as const,
      categoryLabel: 'Full Body',
      goal: 'general_fitness' as const,
    };
    const saved = buildPlanData({ ...buildInputs, planExercises: [sourceExercise] });
    const hydrated = hydrateLoadedPlanExercises('plan-signature', [persistedExercise(saved)])[0];

    expect(buildContentSignature({ ...buildInputs, planExercises: [sourceExercise] }))
      .toBe(buildContentSignature({ ...buildInputs, planExercises: [hydrated] }));
  });

  it.each([null, '', undefined])(
    'does not convert an absent or empty saved rest value into zero: %s',
    (restPeriod) => {
      const [hydrated] = hydrateLoadedPlanExercises('plan-rest-fallback', [{
        exerciseId: 'rest-fallback',
        restPeriod,
      }]);

      expect(hydrated.restSeconds).toBe(60);
    },
  );
});

describe('generated prescription mapping', () => {
  it('keeps generated ranges as text instead of concatenating all digits', () => {
    const workout = {
      exercises: [{
        exerciseKey: 'generated-range',
        exerciseName: 'Generated Range',
        muscles: ['legs'],
        category: 'compound',
        equipment: [],
        sets: 3,
        reps: 8,
        tempo: '2-0-2',
        rest: 0,
        intensity: '70-80%',
      }],
    } as never;

    const [mapped] = mapGeneratedWorkoutToPlanExercises(workout);

    expect(mapped.intensityPercent).toBeUndefined();
    expect(mapped.intensityGuideline).toBe('70-80%');
    expect(mapped.restSeconds).toBe(0);
  });

  it('retains the existing numeric default for a genuinely new generated prescription', () => {
    const workout = {
      exercises: [{
        exerciseKey: 'generated-default',
        exerciseName: 'Generated Default',
        muscles: ['legs'],
        category: 'compound',
        equipment: [],
        sets: 3,
        reps: 8,
        tempo: '2-0-2',
        rest: 60,
        intensity: 70,
      }],
    } as never;

    const [mapped] = mapGeneratedWorkoutToPlanExercises(workout);

    expect(mapped.intensityPercent).toBe(70);
  });
});
