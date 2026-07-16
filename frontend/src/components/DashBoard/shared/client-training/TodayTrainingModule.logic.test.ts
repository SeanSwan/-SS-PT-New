/**
 * ============================================================================
 * FILE: TodayTrainingModule.logic.test.ts
 * PURPOSE: Lock Today state, PDF, revision, and route truth.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises the pure view builder across every honest assignment state.
 * HOW IT FITS IN THE APP: Guards the canonical client Today rollout before release.
 * KEY DECISIONS: Assertions use public state and source contracts, never private data.
 * NASM PROTOCOL CONTEXT: Verifies presentation and routing truth, not prescriptions.
 */
import { describe, expect, it } from 'vitest';
import { buildTodayTrainingView } from './TodayTrainingModule.logic';

const readyState = {
  loading: false,
  error: false,
  workout: {
    title: 'Lower Body Strength',
    assignmentKey: 'plan-6m:w3:d2:2026-07-15:o1:r3',
    assignmentType: 'homework',
    assignmentStatus: 'planned',
    isLoggable: true,
    ctaLabel: 'Log Assignment',
    weekNumber: 3,
    dayNumber: 2,
    dayLabel: 'Day 2',
    exerciseCount: 4,
    firstExercise: 'Goblet Squat',
    exerciseNames: ['Goblet Squat', 'Split Squat', 'Cable Row', 'Dead Bug'],
    prescribedRevision: 3,
  },
  planVault: {
    defaultHorizonKey: 'six_month',
    primaryPlanId: 'plan-6m',
    primaryHorizonKey: 'six_month',
    filledHorizonKeys: ['six_month'],
    filledCount: 1,
    slots: [{
      horizonKey: 'six_month',
      label: '6 Month',
      isDefaultHorizon: true,
      isFilled: true,
      isPrimary: true,
      planId: 'plan-6m',
      planTitle: 'Six Month Foundation',
      planStatus: 'active',
      contentRevision: 3,
      pdfDerivative: {
        enabled: true,
        state: 'ready',
        latestGenerated: { state: 'ready', sourceRevision: 3 },
      },
    }],
  },
} as any;

describe('buildTodayTrainingView', () => {
  it('builds the ready workout command state from the canonical assignment', () => {
    expect(buildTodayTrainingView(readyState)).toMatchObject({
      kind: 'workout',
      title: 'Lower Body Strength',
      statusLabel: 'Ready to log',
      planLabel: 'Six Month Foundation',
      dayLabel: 'Week 3 / Day 2',
      exerciseNames: ['Goblet Squat', 'Split Squat', 'Cable Row'],
      overflowExerciseCount: 1,
      revisionLabel: 'Revision 3',
      pdfLabel: 'PDF current',
      logAction: {
        label: 'Log Workout',
        path: '/dashboard/client/log-workout?loadPlan=today&assignmentKey=plan-6m%3Aw3%3Ad2%3A2026-07-15%3Ao1%3Ar3&assignmentType=homework',
        disabled: false,
      },
    });
  });

  it.each([
    ['loading', { loading: true, error: false, workout: null, planVault: null }, 'Loading today'],
    ['error', { loading: false, error: true, workout: null, planVault: null }, 'Today unavailable'],
    ['empty', { loading: false, error: false, workout: null, planVault: null }, 'Plan pending'],
  ])('keeps the %s state visible', (kind, state, title) => {
    expect(buildTodayTrainingView(state as any)).toMatchObject({ kind, title });
  });

  it.each([
    ['rest', 'rest', 'Recovery day'],
    ['active_recovery', 'recovery', 'Active recovery'],
  ])('renders %s without pretending a workout is loggable', (assignmentType, kind, statusLabel) => {
    const view = buildTodayTrainingView({
      ...readyState,
      workout: {
        ...readyState.workout,
        assignmentType,
        title: assignmentType === 'rest' ? 'Rest Day' : 'Flexibility Reset',
        isLoggable: false,
        exerciseCount: 0,
        exerciseNames: [],
      },
    });
    expect(view).toMatchObject({ kind, statusLabel, logAction: { disabled: true } });
  });

  it('keeps a derivative outage explicit without hiding the workout', () => {
    const view = buildTodayTrainingView({
      ...readyState,
      planVault: {
        ...readyState.planVault,
        slots: [{ ...readyState.planVault.slots[0], pdfDerivative: { enabled: true, state: 'unavailable' } }],
      },
    });
    expect(view).toMatchObject({ kind: 'workout', pdfLabel: 'PDF status unavailable' });
  });
  it('routes completed work to history instead of another log attempt', () => {
    const view = buildTodayTrainingView({
      ...readyState,
      workout: { ...readyState.workout, assignmentStatus: 'completed', isLoggable: false },
    });
    expect(view).toMatchObject({
      kind: 'completed',
      statusLabel: 'Logged today',
      logAction: { label: 'Review Workout', path: '/dashboard/client/workouts', disabled: false },
    });
  });
});
