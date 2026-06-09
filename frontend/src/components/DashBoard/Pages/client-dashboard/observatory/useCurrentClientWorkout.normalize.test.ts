/**
 * FILE: useCurrentClientWorkout.normalize.test.ts
 * PURPOSE: Locks pure current-workout read-model normalization without
 * requiring React render timing.
 */

import { describe, expect, it } from 'vitest';
import { normalizeCurrentClientWorkout } from './currentClientWorkoutNormalizer';

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
