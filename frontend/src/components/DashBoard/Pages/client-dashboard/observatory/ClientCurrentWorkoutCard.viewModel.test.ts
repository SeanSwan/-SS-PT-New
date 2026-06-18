import { describe, expect, it } from 'vitest';
import {
  buildClientCurrentWorkoutViewModel,
  type ClientCurrentWorkoutViewModel,
} from './ClientCurrentWorkoutCard.viewModel';
import type { CurrentClientWorkout } from './useCurrentClientWorkout';

const homeworkWorkout: CurrentClientWorkout = {
  title: 'Coach Homework Lower Strength',
  assignmentKey: 'plan-6m:w2:d3:homework',
  assignmentType: 'homework',
  assignmentStatus: 'planned',
  sessionType: 'solo',
  isLoggable: true,
  ctaLabel: 'Log Assignment',
  weekNumber: 2,
  dayNumber: 3,
  exerciseCount: 4,
  firstExercise: 'Goblet Squat',
  primaryPlanLabel: '6 Month',
  homeworkSummary: {
    assignmentType: 'homework',
    todayStatus: 'planned',
    todayIsCompleted: false,
    todayIsLoggable: true,
    todayShouldDeductSession: false,
    todayWeekNumber: 2,
    todayDayNumber: 3,
    todayExerciseCount: 4,
    todayFirstExerciseName: 'Goblet Squat',
    recentCompletedCount: 2,
    lastCompletedAt: '2026-06-05T12:00:00.000Z',
    recentCompletions: [
      {
        completedAt: '2026-06-05T12:00:00.000Z',
        scheduledDate: '2026-06-05',
        weekNumber: 4,
        dayNumber: 2,
        exerciseCount: 3,
        firstExerciseName: 'Goblet Squat',
      },
      {
        completedAt: '2026-06-03T12:00:00.000Z',
        scheduledDate: '2026-06-03',
        weekNumber: 3,
        dayNumber: 5,
        exerciseCount: 2,
        firstExerciseName: 'Split Squat',
      },
    ],
  },
};

const labels = (viewModel: ClientCurrentWorkoutViewModel) => (
  viewModel.rows.map((row) => row.label)
);

describe('ClientCurrentWorkoutCard view model', () => {
  it('builds a scan-friendly off-day homework card model with recent history', () => {
    const viewModel = buildClientCurrentWorkoutViewModel({
      workout: homeworkWorkout,
      error: false,
      loading: false,
    });

    expect(viewModel.kicker).toBe('Suggested Off-Day Workout');
    expect(viewModel.title).toBe('Coach Homework Lower Strength');
    expect(viewModel.action).toEqual({
      label: 'Log Assignment',
      ariaLabel: "Log today's assignment",
      path: '/dashboard/client/log-workout?loadPlan=today&assignmentKey=plan-6m%3Aw2%3Ad3%3Ahomework&assignmentType=homework',
    });
    expect(labels(viewModel)).toEqual([
      '6 Month Primary - Week 2 - Day 3',
      'Off-day logs - ready',
      'Recent Homework History',
      'Week 4 Day 2 - Jun 5',
      'Week 3 Day 5 - Jun 3',
    ]);
    expect(viewModel.rows.map((row) => row.value)).toContain('2 exercises - Split Squat');
  });

  it('routes non-loggable trainer-led assignments to schedule instead of client logging', () => {
    const viewModel = buildClientCurrentWorkoutViewModel({
      workout: {
        ...homeworkWorkout,
        assignmentType: 'trainer_session',
        isLoggable: false,
        ctaLabel: '',
        homeworkSummary: null,
      },
      error: false,
      loading: false,
    });

    expect(viewModel.kicker).toBe('Trainer Session');
    expect(viewModel.action).toEqual({
      label: 'View Schedule',
      ariaLabel: 'View schedule for trainer-led session',
      path: '/dashboard/client/schedule',
    });
    expect(viewModel.detail).toMatch(/trainer-led sessions are logged by your coach/i);
  });

  it('builds the plan-pending empty state without fake homework history', () => {
    const viewModel = buildClientCurrentWorkoutViewModel({
      workout: null,
      error: false,
      loading: false,
    });

    expect(viewModel.title).toBe('Plan pending');
    expect(viewModel.rows).toEqual([{ label: '6 Month plan pending', value: 'Coach Homework' }]);
    expect(viewModel.detail).toMatch(/default 6 Month plan/i);
  });

  it('routes completed assignments to workout history proof instead of generic plan review', () => {
    const viewModel = buildClientCurrentWorkoutViewModel({
      workout: {
        ...homeworkWorkout,
        assignmentStatus: 'completed',
        isLoggable: false,
        ctaLabel: '',
      },
      error: false,
      loading: false,
    });

    expect(viewModel.action).toEqual({
      label: 'Review Workout History',
      ariaLabel: 'Review completed workout history',
      path: '/dashboard/client/workouts',
    });
    expect(viewModel.detail).toMatch(/completed today/i);
  });
});
