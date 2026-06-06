import { describe, expect, it } from 'vitest';
import { buildWorkoutPlanSaveFields } from './workoutPlannerSavePayload';

const makeGeneratedPlanData = (durationWeeks: number) => ({
  planSummary: {
    durationWeeks,
    sessionsPerWeek: 3,
    totalSessions: durationWeeks * 3,
    primaryGoal: 'strength',
    startingPhase: 2,
  },
  weeks: Array.from({ length: durationWeeks }, (_, index) => ({
    weekNumber: index + 1,
    days: [{ dayNumber: 1, exercises: [{ exerciseName: 'Goblet Squat', sets: 3 }] }],
  })),
});

describe('workout planner save payload metadata', () => {
  it('preserves the selected generated duration and maps 24 weeks to the SwanStudios 6 Month horizon', () => {
    const planData = makeGeneratedPlanData(24);

    expect(buildWorkoutPlanSaveFields({
      planData,
      planDuration: '24',
      hasGeneratedHorizonPlan: true,
      userRole: 'trainer',
    })).toMatchObject({
      durationWeeks: 24,
      createdBy: 'ai',
      metadata: {
        planHorizon: 'six_month',
        planDurationKey: 'six_month',
        durationPreset: '24',
        planSource: 'swan_coach_ai',
        createdByRole: 'trainer',
      },
    });
  });

  it('keeps manual single-session plans in the 1 Day vault slot with the operator role', () => {
    const planData = {
      weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, exercises: [] }] }],
    };

    expect(buildWorkoutPlanSaveFields({
      planData,
      planDuration: 'single',
      hasGeneratedHorizonPlan: false,
      userRole: 'admin',
    })).toMatchObject({
      durationWeeks: 1,
      createdBy: 'admin',
      metadata: {
        planHorizon: 'one_day',
        planSource: 'manual_builder',
        createdByRole: 'admin',
      },
    });
  });

  it('maps annual 48-week NASM plans to the 12 Month horizon instead of falling back to 6 Month', () => {
    const planData = makeGeneratedPlanData(48);

    expect(buildWorkoutPlanSaveFields({
      planData,
      planDuration: '48',
      hasGeneratedHorizonPlan: true,
      userRole: 'trainer',
    }).metadata.planHorizon).toBe('twelve_month');
  });
});
