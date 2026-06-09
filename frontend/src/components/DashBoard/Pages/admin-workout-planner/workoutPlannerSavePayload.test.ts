import { describe, expect, it } from 'vitest';
import { PLAN_DURATIONS } from './WorkoutPlannerTypes';
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
  it('exposes only the seven SwanStudios plan arcs in the planner duration control', () => {
    expect(PLAN_DURATIONS.map(duration => duration.value)).toEqual([
      'single',
      '1',
      '4',
      '12',
      '26',
      '39',
      '52',
    ]);
  });

  it('preserves the selected generated duration and maps 26 weeks to the SwanStudios 6 Month horizon', () => {
    const planData = makeGeneratedPlanData(26);

    expect(buildWorkoutPlanSaveFields({
      planData,
      planDuration: '26',
      hasGeneratedHorizonPlan: true,
      userRole: 'trainer',
    })).toMatchObject({
      durationWeeks: 26,
      createdBy: 'swan_coach_planning',
      metadata: {
        planHorizon: 'six_month',
        planDurationKey: 'six_month',
        durationPreset: '26',
        planSource: 'swan_coach_planning',
        createdByRole: 'trainer',
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
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
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
      },
    });
  });

  it('maps nine-month and annual plans to their exact SwanStudios horizons', () => {
    const nineMonthPlan = makeGeneratedPlanData(39);
    const annualPlan = makeGeneratedPlanData(52);

    expect(buildWorkoutPlanSaveFields({
      planData: nineMonthPlan,
      planDuration: '39',
      hasGeneratedHorizonPlan: true,
      userRole: 'trainer',
    }).metadata.planHorizon).toBe('nine_month');

    expect(buildWorkoutPlanSaveFields({
      planData: annualPlan,
      planDuration: '52',
      hasGeneratedHorizonPlan: true,
      userRole: 'trainer',
    }).metadata.planHorizon).toBe('twelve_month');
  });
});
