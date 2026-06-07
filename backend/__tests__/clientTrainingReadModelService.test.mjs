import { describe, expect, it } from 'vitest';

import { PLAN_HORIZONS } from '../services/clientTrainingPlanHorizonService.mjs';
import { buildClientTrainingOverview } from '../services/clientTrainingReadModelService.mjs';

const sixMonthPlan = {
  id: 'plan-6m',
  title: 'Six Month Foundation',
  status: 'active',
  durationWeeks: 26,
  currentWeek: 4,
  currentDay: 2,
  createdBy: 'trainer',
  metadata: { planHorizon: 'six_month' },
};

describe('clientTrainingReadModelService', () => {
  it('defines the seven SwanStudios plan horizons with six months as the default arc', () => {
    expect(PLAN_HORIZONS.map((slot) => slot.key)).toEqual([
      'one_day',
      'one_week',
      'one_month',
      'three_month',
      'six_month',
      'nine_month',
      'twelve_month',
    ]);
    expect(PLAN_HORIZONS.find((slot) => slot.key === 'six_month')).toMatchObject({
      label: '6 Month',
      durationWeeks: 26,
      isDefault: true,
    });
  });

  it('builds a seven-slot catalog and marks the active plan as primary', () => {
    const catalog = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [
        { id: 'plan-1m', title: 'One Month Reset', status: 'paused', durationWeeks: 4 },
        sixMonthPlan,
      ],
    }).trainingPlanCatalog;

    expect(catalog.slots).toHaveLength(7);
    expect(catalog.defaultHorizonKey).toBe('six_month');
    expect(catalog.primaryPlanId).toBe('plan-6m');

    const sixMonthSlot = catalog.slots.find((slot) => slot.horizonKey === 'six_month');
    expect(sixMonthSlot).toMatchObject({
      isFilled: true,
      isPrimary: true,
      plan: {
        id: 'plan-6m',
        title: 'Six Month Foundation',
        status: 'active',
        currentWeek: 4,
        currentDay: 2,
      },
    });

    const twelveMonthSlot = catalog.slots.find((slot) => slot.horizonKey === 'twelve_month');
    expect(twelveMonthSlot).toMatchObject({
      isFilled: false,
      isPrimary: false,
      plan: null,
    });
  });

  it('maps legacy custom durations to the closest SwanStudios horizon instead of defaulting everything to six months', () => {
    const legacyPlan = { id: 'plan-8w', title: 'Eight Week Legacy Block', status: 'active', durationWeeks: 8 };
    const catalog = buildClientTrainingOverview({
      activePlan: legacyPlan,
      plans: [legacyPlan],
    }).trainingPlanCatalog;

    expect(catalog.primaryPlanId).toBe('plan-8w');
    expect(catalog.slots.find((slot) => slot.horizonKey === 'three_month')).toMatchObject({
      isFilled: true,
      isPrimary: true,
      plan: { id: 'plan-8w', title: 'Eight Week Legacy Block' },
    });
    expect(catalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isFilled: false,
      plan: null,
    });
  });

  it('uses the six-month plan as the default primary arc when no plan is explicitly active', () => {
    const catalog = buildClientTrainingOverview({
      activePlan: null,
      plans: [
        { id: 'plan-1w', title: 'Travel Week', status: 'draft', durationWeeks: 1, updatedAt: '2026-06-06' },
        { id: 'plan-6m-draft', title: 'Default Six Month Arc', status: 'draft', durationWeeks: 26, updatedAt: '2026-05-01' },
        { id: 'plan-12m', title: 'Annual Vision', status: 'draft', durationWeeks: 52, updatedAt: '2026-04-01' },
      ],
    }).trainingPlanCatalog;

    expect(catalog.primaryPlanId).toBe('plan-6m-draft');
    expect(catalog.primaryHorizonKey).toBe('six_month');
    expect(catalog.filledHorizonKeys).toEqual(['one_week', 'six_month', 'twelve_month']);
    expect(catalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isFilled: true,
      isPrimary: true,
      plan: { id: 'plan-6m-draft', title: 'Default Six Month Arc' },
    });
  });

  it('exposes plan PDF attachment metadata in the seven-slot catalog when a plan has a PDF file', () => {
    const catalog = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [{
        ...sixMonthPlan,
        metadata: {
          planHorizon: 'six_month',
          planPdf: {
            url: 'https://cdn.swanstudios.com/plans/six-month-foundation.pdf',
            fileName: 'Six Month Foundation.pdf',
            contentType: 'application/pdf',
            updatedAt: '2026-06-06T00:00:00.000Z',
          },
        },
      }],
    }).trainingPlanCatalog;

    expect(catalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      plan: {
        pdfFile: {
          url: 'https://cdn.swanstudios.com/plans/six-month-foundation.pdf',
          fileName: 'Six Month Foundation.pdf',
          contentType: 'application/pdf',
          updatedAt: '2026-06-06T00:00:00.000Z',
        },
      },
    });
  });

  it('derives a non-billable homework assignment from the active plan cursor', () => {
    const assignment = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [sixMonthPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Coach Homework Lower Body',
        session: {
          assignmentType: 'homework',
          exercises: [{ exerciseName: 'Goblet Squat' }],
        },
        exercises: [
          { exerciseName: 'Goblet Squat' },
          { exerciseName: 'Split Squat' },
        ],
      },
      today: '2026-06-06',
    }).todayAssignment;

    expect(assignment).toMatchObject({
      assignmentKey: 'plan-6m:w4:d2:homework',
      assignmentType: 'homework',
      sessionType: 'solo',
      status: 'planned',
      source: 'workout_plan',
      isLoggable: true,
      isBillable: false,
      shouldDeductSession: false,
      title: 'Coach Homework Lower Body',
      scheduledDate: '2026-06-06',
      exerciseCount: 2,
      firstExerciseName: 'Goblet Squat',
      ctaLabel: 'Log Assignment',
    });
  });

  it('carries generated-plan assignment defaults into the catalog and today assignment without auto-deducting', () => {
    const trainerLedPlan = {
      ...sixMonthPlan,
      id: 'plan-trainer-led',
      title: 'Trainer Led Generated Arc',
      planData: {
        assignmentDefaults: {
          defaultAssignmentType: 'trainer_session',
          billingIntent: 'trainer_led_scheduled_flow',
          shouldDeductSession: false,
        },
      },
      metadata: { planHorizon: 'six_month' },
    };

    const overview = buildClientTrainingOverview({
      activePlan: trainerLedPlan,
      plans: [trainerLedPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Coach Floor Session',
        session: {
          exercises: [{ exerciseName: 'Trap Bar Deadlift' }],
        },
        exercises: [{ exerciseName: 'Trap Bar Deadlift' }],
      },
      today: '2026-06-06',
    });

    expect(overview.todayAssignment).toMatchObject({
      assignmentKey: 'plan-trainer-led:w4:d2:trainer_session',
      assignmentType: 'trainer_session',
      sessionType: 'trainer-led',
      isBillable: true,
      shouldDeductSession: false,
      ctaLabel: 'Log Workout',
    });
    expect(overview.trainingPlanCatalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      plan: {
        assignmentDefault: 'trainer_session',
        billingIntent: 'trainer_led_scheduled_flow',
        defaultShouldDeductSession: false,
      },
    });
  });

  it('keeps rest days visible but not loggable', () => {
    const restPlan = { ...sixMonthPlan, currentDay: 3 };
    const assignment = buildClientTrainingOverview({
      activePlan: restPlan,
      plans: [restPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 3,
        dayLabel: 'Regeneration Day',
        session: { dayType: 'rest', exercises: [] },
        exercises: [],
      },
      today: '2026-06-06',
    }).todayAssignment;

    expect(assignment).toMatchObject({
      assignmentType: 'rest',
      sessionType: 'solo',
      isLoggable: false,
      isBillable: false,
      shouldDeductSession: false,
      ctaLabel: 'View Plan',
    });
  });

  it('builds one overview object for dashboard, logger, trainer, admin, and Swan Coach readers', () => {
    const overview = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [sixMonthPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Coach Homework Lower Body',
        session: { assignmentType: 'homework' },
        exercises: [{ exerciseName: 'Goblet Squat' }],
      },
      today: '2026-06-06',
    });

    expect(overview.todayAssignment.assignmentType).toBe('homework');
    expect(overview.trainingPlanCatalog.slots).toHaveLength(7);
    expect(overview.trainingPlanCatalog.primaryPlanId).toBe('plan-6m');
  });

  it('marks today homework completed from a matching logged planned assignment', () => {
    const overview = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [sixMonthPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Coach Homework Lower Body',
        session: { assignmentType: 'homework' },
        exercises: [{ exerciseName: 'Goblet Squat' }],
      },
      today: '2026-06-06',
      assignmentCompletions: [{
        assignmentKey: 'plan-6m:w4:d2:homework',
        formId: 'daily-form-1',
        completedAt: '2026-06-06T12:00:00.000Z',
      }],
    });

    expect(overview.todayAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w4:d2:homework',
      assignmentType: 'homework',
      status: 'completed',
      isLoggable: false,
      isBillable: false,
      shouldDeductSession: false,
      ctaLabel: 'Review Workout',
      completion: {
        source: 'daily_workout_form',
        formId: 'daily-form-1',
        completedAt: '2026-06-06T12:00:00.000Z',
      },
    });
  });
});
