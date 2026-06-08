import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientCurrentWorkoutCard from './ClientCurrentWorkoutCard';

describe('ClientCurrentWorkoutCard', () => {
  it('labels homework as a suggested off-day workout while preserving the log action', () => {
    const onNavigate = vi.fn();

    const currentWorkout = {
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
        todayExerciseCount: 4,
        todayFirstExerciseName: 'Goblet Squat',
        recentCompletedCount: 2,
        lastCompletedAt: '2026-06-05T12:00:00.000Z',
        recentCompletions: [
          {
            completedAt: '2026-06-05T12:00:00.000Z',
            weekNumber: 4,
            dayNumber: 2,
            exerciseCount: 3,
            firstExerciseName: 'Goblet Squat',
          },
        ],
      },
    };

    render(
      <ClientCurrentWorkoutCard
        currentWorkout={currentWorkout}
        onNavigate={onNavigate}
      />,
    );

    const card = screen.getByTestId('current-workout-card');
    expect(card).toHaveTextContent(/suggested off-day workout/i);
    expect(card).toHaveTextContent(/today's assignment/i);
    expect(card).toHaveTextContent(/no paid session deduction/i);
    expect(card).toHaveTextContent(/off-day logs/i);
    expect(card).toHaveTextContent(/2 completed/i);
    expect(card).toHaveTextContent(/recent homework/i);
    expect(card).toHaveTextContent(/week 4/i);
    expect(card).toHaveTextContent(/day 2/i);
    expect(card).toHaveTextContent(/jun 5/i);
    const action = screen.getByRole('button', { name: /log today's assignment/i });
    expect(action).toHaveTextContent(/log assignment/i);

    fireEvent.click(action);
    expect(onNavigate).toHaveBeenCalledWith(
      '/dashboard/client/log-workout?loadPlan=today&assignmentKey=plan-6m%3Aw2%3Ad3%3Ahomework&assignmentType=homework',
    );
  });
});
