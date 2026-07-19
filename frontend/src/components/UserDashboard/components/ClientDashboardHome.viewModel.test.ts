/**
 * FILE: ClientDashboardHome.viewModel.test.ts
 * PURPOSE: Locks the mounted client home assignment routes to workout-progress truth.
 *
 * HOW IT FITS IN THE APP:
 *   ClientDashboardHomeTab shapes /api/workouts/:clientId/current into the
 *   visible "Today's training priority" card on /dashboard/client/overview.
 *   These tests prevent completed assignments from sending clients back into
 *   the logger after first login or password reset.
 */
import { describe, expect, it } from 'vitest';
import {
  buildAssignmentView,
  buildTodaySnapshot,
} from './ClientDashboardHome.viewModel';

const baseWorkout = {
  title: 'Strength Base Day 2',
  assignmentKey: 'plan-6m:w2:d2:homework',
  assignmentType: 'homework',
  assignmentStatus: 'ready',
  isLoggable: true,
  ctaLabel: 'Log Assignment',
  weekNumber: 2,
  dayNumber: 2,
  exerciseCount: 4,
  firstExercise: 'Goblet Squat',
  primaryPlanLabel: '6 Month Plan',
  homeworkSummary: null,
};

describe('ClientDashboardHome assignment view model', () => {
  it('routes completed current assignments to workout history instead of another log attempt', () => {
    const assignment = buildAssignmentView({
      workout: {
        ...baseWorkout,
        assignmentStatus: 'completed',
        ctaLabel: 'Log Assignment',
      },
      loading: false,
      error: false,
    });

    expect(assignment.actionPath).toBe('/dashboard/client/workouts');
    expect(assignment.actionLabel).toBe('Review Workout History');
    expect(assignment.rows.at(-1)).toMatchObject({

      label: 'Progress proof',
      meta: 'Logged today',
      complete: true,
    });
  });
  it('labels nutrition calories as logged intake rather than calories burned', () => {
    const snapshot = buildTodaySnapshot({
      sessions: [],
      proof: {
        totalSessions: 0,
        thisWeekCount: 0,
        minutesThisWeek: 0,
        weeklyCounts: [],
        latestSessionId: null,
        shareLine: '',
      },
      macroSummary: {
        totalCalories: 1850,
        totalProtein: 120,
        totalCarbs: 210,
        totalFat: 55,
        targetCalories: 2000,
        date: '2026-07-19',
      },
    });

    expect(snapshot.rows).toContainEqual({
      label: 'Calories Logged',
      value: '1,850 cal',
      meta: 'Nutrition log',
    });
    expect(snapshot.rows.some((row) => row.label === 'Calories Burned')).toBe(false);
  });
});