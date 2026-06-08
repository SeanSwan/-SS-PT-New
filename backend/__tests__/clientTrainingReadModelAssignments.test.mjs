import { describe, expect, it } from 'vitest';

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

describe('clientTrainingReadModelService assignment context', () => {
  it('derives a non-billable homework assignment from the active plan cursor', () => {
    const assignment = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [sixMonthPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Coach Homework Lower Body',
        session: { assignmentType: 'homework', exercises: [{ exerciseName: 'Goblet Squat' }] },
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
        session: { exercises: [{ exerciseName: 'Trap Bar Deadlift' }] },
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

  it('treats legacy generated dayType training as trainer-led without auto-deducting', () => {
    const legacyTrainingPlan = {
      ...sixMonthPlan,
      id: 'plan-legacy-training',
      title: 'Legacy Training Arc',
    };

    const overview = buildClientTrainingOverview({
      activePlan: legacyTrainingPlan,
      plans: [legacyTrainingPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Coach Strength Session',
        session: { dayType: 'training', exercises: [{ exerciseName: 'Cable Row' }] },
        exercises: [{ exerciseName: 'Cable Row' }],
      },
      today: '2026-06-06',
    });

    expect(overview.todayAssignment).toMatchObject({
      assignmentKey: 'plan-legacy-training:w4:d2:trainer_session',
      assignmentType: 'trainer_session',
      sessionType: 'trainer-led',
      isBillable: true,
      shouldDeductSession: false,
      ctaLabel: 'Log Workout',
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

  it('keeps today non-loggable after a plan advances from a same-day homework log', () => {
    const overview = buildClientTrainingOverview({
      activePlan: { ...sixMonthPlan, currentWeek: 5, currentDay: 1 },
      plans: [{ ...sixMonthPlan, currentWeek: 5, currentDay: 1 }],
      currentSession: {
        weekNumber: 5,
        dayNumber: 1,
        dayLabel: 'Next Week Start',
        session: { assignmentType: 'homework' },
        exercises: [{ exerciseName: 'Split Squat' }],
      },
      today: '2026-06-06',
      assignmentCompletions: [{
        assignmentKey: 'plan-6m:w4:d2:homework',
        formId: 'daily-form-1',
        completedAt: '2026-06-06T12:00:00.000Z',
        assignmentType: 'homework',
        title: 'Coach Homework Lower Body',
        weekNumber: 4,
        dayNumber: 2,
        exerciseCount: 1,
        firstExerciseName: 'Goblet Squat',
      }],
    });

    expect(overview.todayAssignment).toMatchObject({
      assignmentKey: 'plan-6m:w4:d2:homework',
      title: 'Coach Homework Lower Body',
      weekNumber: 4,
      dayNumber: 2,
      status: 'completed',
      isLoggable: false,
      ctaLabel: 'Review Workout',
    });
  });

  it('builds a safe homework summary from today status and recent homework completions', () => {
    const overview = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [sixMonthPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'ClientNameMustNotLeak Lower Homework',
        session: { assignmentType: 'homework' },
        exercises: [{ exerciseName: 'Goblet Squat' }],
      },
      today: '2026-06-06',
      assignmentCompletions: [{
        assignmentKey: 'plan-6m:w4:d2:homework',
        formId: 'daily-form-1',
        completedAt: '2026-06-06T12:00:00.000Z',
        assignmentType: 'homework',
        title: 'ClientNameMustNotLeak Lower Homework',
        weekNumber: 4,
        dayNumber: 2,
        exerciseCount: 1,
        firstExerciseName: 'Goblet Squat',
      }],
      recentAssignmentCompletions: [
        {
          assignmentKey: 'plan-6m:w4:d2:homework',
          formId: 'daily-form-1',
          completedAt: '2026-06-06T12:00:00.000Z',
          assignmentType: 'homework',
          title: 'ClientNameMustNotLeak Lower Homework',
          weekNumber: 4,
          dayNumber: 2,
          exerciseCount: 1,
          firstExerciseName: 'Goblet Squat',
        },
        {
          assignmentKey: 'plan-6m:w3:d3:homework',
          formId: 'daily-form-2',
          completedAt: '2026-06-03T12:00:00.000Z',
          assignmentType: 'homework',
          title: 'ClientNameMustNotLeak Prior Homework',
          weekNumber: 3,
          dayNumber: 3,
          exerciseCount: 2,
          firstExerciseName: 'Split Squat',
        },
        {
          assignmentKey: 'plan-6m:w3:d1:trainer_session',
          formId: 'daily-form-3',
          completedAt: '2026-06-01T12:00:00.000Z',
          assignmentType: 'trainer_session',
          title: 'Paid Session',
          weekNumber: 3,
          dayNumber: 1,
          exerciseCount: 4,
          firstExerciseName: 'Bench Press',
        },
      ],
    });

    expect(overview.homeworkSummary).toMatchObject({
      assignmentType: 'homework',
      todayStatus: 'completed',
      todayIsCompleted: true,
      todayIsLoggable: false,
      todayShouldDeductSession: false,
      todayExerciseCount: 1,
      todayFirstExerciseName: 'Goblet Squat',
      recentCompletedCount: 2,
      lastCompletedAt: '2026-06-06T12:00:00.000Z',
      recentCompletions: [
        expect.objectContaining({
          assignmentType: 'homework',
          weekNumber: 4,
          dayNumber: 2,
          exerciseCount: 1,
          firstExerciseName: 'Goblet Squat',
        }),
        expect.objectContaining({
          assignmentType: 'homework',
          weekNumber: 3,
          dayNumber: 3,
          exerciseCount: 2,
          firstExerciseName: 'Split Squat',
        }),
      ],
    });
    expect(JSON.stringify(overview.homeworkSummary)).not.toContain('ClientNameMustNotLeak');
    expect(JSON.stringify(overview.homeworkSummary)).not.toContain('Paid Session');
  });
});
