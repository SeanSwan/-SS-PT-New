import { describe, expect, it } from 'vitest';
import { buildGeneratedPlan, buildPlanAtFrequency } from './planDataBuilder.testFixtures';
import { getGeneratedPlanQualityWarnings } from './workoutPlannerQualityWarnings';

describe('getGeneratedPlanQualityWarnings', () => {
  it('stays quiet when a generated plan has prep, recovery, variety, deload, and rationale', () => {
    const plan = buildGeneratedPlan({
      planSummary: {
        durationWeeks: 8,
        sessionsPerWeek: 3,
        totalSessions: 24,
        primaryGoal: 'general_fitness',
        startingPhase: 2,
      },
      mesocycles: [{
        mesocycle: 1,
        weeks: '1-8',
        nasmPhase: 2,
        phaseName: 'Strength Endurance',
        focus: 'balanced progression with recovery',
        params: { sets: '2-4', reps: '8-12', intensity: '70-80%', tempo: '2-0-2', rest: '60s' },
        overloadStrategy: 'Add load gradually, deload week 4',
        deloadWeek: 4,
      }],
      weeks: Array.from({ length: 8 }, (_, index) => ({
        weekNumber: index + 1,
        focus: 'balanced',
        days: [
          {
            dayNumber: 1,
            name: 'Warmup and Push',
            focus: 'push',
            category: 'push',
            exercises: [{ exerciseName: 'Mobility Prep', sets: 1, targetReps: '5 min' }],
          },
          {
            dayNumber: 2,
            name: 'Pull Strength',
            focus: 'pull',
            category: 'pull',
            exercises: [{ exerciseName: 'Row', sets: 3, targetReps: '10' }],
          },
          {
            dayNumber: 3,
            name: 'Cooldown Recovery',
            focus: 'active recovery',
            category: 'recovery',
            exercises: [{ exerciseName: 'Cooldown Stretch', sets: 1, targetReps: '8 min' }],
          },
        ],
      })),
      rationale: ['Client goal and phase support the selected progression.'],
    });

    expect(getGeneratedPlanQualityWarnings(plan)).toEqual([]);
  });

  it('flags missing prep, recovery, detailed schedule, and repeated focus', () => {
    const plan = buildPlanAtFrequency(4, 12);
    const weakPlan = {
      ...plan,
      weeks: [],
      weeklySchedule: [
        { dayNumber: 1, focus: 'legs', category: 'legs' },
        { dayNumber: 2, focus: 'legs', category: 'legs' },
        { dayNumber: 3, focus: 'legs', category: 'legs' },
        { dayNumber: 4, focus: 'push', category: 'push' },
      ],
      recommendations: [],
      recommendationDetails: [],
      rationale: [],
      mesocycles: [{
        ...plan.mesocycles[0],
        deloadWeek: null,
        focus: 'maximal output',
        phaseName: 'Maximal Strength',
        params: { ...plan.mesocycles[0].params, intensity: '85-100%' },
      }],
    };

    const warningIds = getGeneratedPlanQualityWarnings(weakPlan).map((warning) => warning.id);

    expect(warningIds).toEqual(expect.arrayContaining([
      'missing-detailed-schedule',
      'missing-prep-cue',
      'missing-recovery-cue',
      'dominant-focus-repeat',
      'missing-deload-checkpoint',
      'high-intensity-without-recovery',
      'missing-rationale',
    ]));
  });
});
