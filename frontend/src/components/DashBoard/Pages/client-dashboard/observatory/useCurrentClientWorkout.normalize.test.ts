/**
 * FILE: useCurrentClientWorkout.normalize.test.ts
 * PURPOSE: Locks pure current-workout read-model normalization without
 * requiring React render timing.
 */

import { describe, expect, it } from 'vitest';
import {
  normalizeCurrentClientWorkout,
  normalizeTrainingPlanVault,
} from './currentClientWorkoutNormalizer';

describe('normalizeCurrentClientWorkout', () => {
  it('keeps assignment-only responses visible when no active plan exists', () => {
    const workout = normalizeCurrentClientWorkout({
      todayAssignment: {
        assignmentId: 42,
        assignmentType: 'homework',
        status: 'planned',
        isLoggable: true,
        title: 'Day 2 Homework',
        weekNumber: '1',
        dayNumber: '2',
        exerciseCount: 4,
        firstExerciseName: 'Split Squat',
        exercises: [
          { exerciseName: 'Split Squat' },
          { exerciseName: 'Single-Arm Row' },
        ],
        scheduledDate: '2026-07-15',
        prescribedRevision: 3,
        ctaLabel: 'Log Assignment',
      },
      trainingPlanCatalog: {
        slots: [
          {
            horizonKey: 'six_month',
            label: '6 Month',
            isFilled: true,
            isPrimary: true,
          },
        ],
      },
    });

    expect(workout).toMatchObject({
      title: 'Day 2 Homework',
      assignmentKey: '42',
      assignmentType: 'homework',
      assignmentStatus: 'planned',
      isLoggable: true,
      ctaLabel: 'Log Assignment',
      weekNumber: 1,
      dayNumber: 2,
      exerciseCount: 4,
      firstExercise: 'Split Squat',
      exerciseNames: ['Split Squat', 'Single-Arm Row'],
      scheduledDate: '2026-07-15',
      prescribedRevision: 3,
      primaryPlanLabel: '6 Month',
    });
  });

  it('falls back through the embedded plan session shape for current plan data', () => {
    const workout = normalizeCurrentClientWorkout({
      data: {
        title: 'Phase 1 Stabilization',
        currentWeek: 3,
        currentDay: 1,
        currentSession: {
          session: {
            name: 'Lower Body Strength',
            exercises: [{ exerciseName: 'Goblet Squat' }],
          },
        },
      },
    });

    expect(workout).toMatchObject({
      title: 'Phase 1 Stabilization',
      isLoggable: true,
      ctaLabel: 'Start',
      weekNumber: 3,
      dayNumber: 1,
      dayLabel: 'Lower Body Strength',
      exerciseCount: 1,
      firstExercise: 'Goblet Squat',
    });
  });
});

describe('normalizeTrainingPlanVault', () => {
  it('expands partial training-plan catalogs to all seven SwanStudios arcs', () => {
    const vault = normalizeTrainingPlanVault({
      trainingPlanCatalog: {
        defaultHorizonKey: 'six_month',
        primaryPlanId: 'plan-6m',
        slots: [
          {
            horizonKey: 'six_month',
            label: '6 Month',
            isFilled: true,
            isPrimary: true,
            plan: {
              id: 'plan-6m',
              title: 'Six Month Foundation',
              status: 'active',
              contentRevision: 3,
              pdfDerivative: {
                enabled: true,
                state: 'ready',
                latestGenerated: { sourceRevision: 3, state: 'ready' },
              },
            },
          },
        ],
      },
    });

    expect(vault?.slots.map((slot) => slot.horizonKey)).toEqual([
      'one_day',
      'one_week',
      'one_month',
      'three_month',
      'six_month',
      'nine_month',
      'twelve_month',
    ]);
    expect(vault?.filledCount).toBe(1);
    expect(vault?.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isFilled: true,
      isPrimary: true,
      planTitle: 'Six Month Foundation',
      contentRevision: 3,
      pdfDerivative: {
        enabled: true,
        state: 'ready',
        latestGenerated: { sourceRevision: 3, state: 'ready' },
      },
    });
    expect(vault?.slots.find((slot) => slot.horizonKey === 'one_day')).toMatchObject({
      label: '1 Day',
      isFilled: false,
      isPrimary: false,
    });
  });
});
