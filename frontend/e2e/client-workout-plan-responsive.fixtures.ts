/**
 * Responsive workout-plan vault fixture.
 *
 * Purpose: supplies fake saved-plan data for the admin Client Hub mobile smoke.
 * Privacy: local-only swanstudios.local QA data with no production PII.
 */

const planPdf = (planId: string, fileName: string) => ({
  url: `/api/workout-plans/${planId}/pdf/content.pdf`,
  fileName,
  contentType: 'application/pdf',
  updatedAt: '2026-06-08T12:00:00.000Z',
});

const plan = (
  id: string,
  title: string,
  horizonKey: string,
  durationWeeks: number,
  status: string,
  isPrimary = false,
) => ({
  id,
  title,
  name: title,
  status,
  durationWeeks,
  nasmPhase: durationWeeks >= 26 ? 3 : 2,
  createdAt: '2026-06-06T12:00:00.000Z',
  updatedAt: '2026-06-08T12:00:00.000Z',
  horizonKey,
  isPrimary,
  assignmentDefault: durationWeeks >= 26 ? 'session' : 'homework',
  defaultShouldDeductSession: durationWeeks >= 26,
  goal: 'Protect phone usability while showing plan status, NASM phase, PDF, billing, and assignment context.',
  metadata: {
    isPrimaryPlan: isPrimary,
    planHorizon: horizonKey,
    planPdf: planPdf(id, `${horizonKey}-qa-plan.pdf`),
  },
  planData: {
    goal: 'Strength rebuild, conditioning, and trainer accountability without overlapping client cards.',
    planningSystem: 'NASM Optimum Performance Training',
    planSummary: { durationWeeks },
  },
});

const slots = [
  {
    horizonKey: 'one_day',
    label: '1 Day',
    durationWeeks: 1,
    durationDays: 1,
    isFilled: true,
    isPrimary: false,
    plan: plan('qa-plan-1d', 'One-Day Technique Primer With Mobility Gate', 'one_day', 1, 'draft'),
  },
  {
    horizonKey: 'one_month',
    label: '1 Month',
    durationWeeks: 4,
    durationDays: 30,
    isFilled: true,
    isPrimary: false,
    plan: plan('qa-plan-1m', 'Four-Week Foundation Reload With Biometrics Checkpoints', 'one_month', 4, 'paused'),
  },
  {
    horizonKey: 'six_month',
    label: '6 Month',
    durationWeeks: 26,
    durationDays: 182,
    isDefaultHorizon: true,
    isFilled: true,
    isPrimary: true,
    plan: plan('qa-plan-6m', 'Six-Month Performance Rebuild Plan For Dense Client Cards', 'six_month', 26, 'active', true),
  },
  {
    horizonKey: 'twelve_month',
    label: '12 Month',
    durationWeeks: 52,
    durationDays: 365,
    isFilled: true,
    isPrimary: false,
    plan: plan('qa-plan-12m', 'Annual Strength Continuity Arc With Measurements Review', 'twelve_month', 52, 'draft'),
  },
];

export const workoutPlanCatalogResponse = {
  success: true,
  trainingPlanCatalog: {
    filledCount: slots.length,
    primaryPlanId: 'qa-plan-6m',
    primaryHorizonKey: 'six_month',
    slots,
  },
  todayAssignment: {
    assignmentKey: 'qa-plan-6m:week-3-day-2',
    status: 'ready',
    isLoggable: true,
    ctaLabel: 'Log Today',
  },
  homeworkSummary: {
    assignmentType: 'homework',
    todayStatus: 'ready',
    todayIsCompleted: false,
    todayIsLoggable: true,
    todayShouldDeductSession: false,
    todayWeekNumber: 3,
    todayDayNumber: 2,
    todayExerciseCount: 6,
    todayFirstExerciseName: 'Tempo split squat',
    recentCompletedCount: 2,
    lastCompletedAt: '2026-06-07T12:00:00.000Z',
    recentCompletions: [
      {
        completedAt: '2026-06-07T12:00:00.000Z',
        scheduledDate: '2026-06-07',
        weekNumber: 3,
        dayNumber: 1,
        exerciseCount: 5,
        firstExerciseName: 'Wall slide reset',
      },
    ],
  },
};
