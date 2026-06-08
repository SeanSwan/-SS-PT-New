import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientCurrentWorkoutCard from './ClientCurrentWorkoutCard';

describe('ClientCurrentWorkoutCard', () => {
  it('labels homework as a suggested off-day workout while preserving the log action', () => {
    const onNavigate = vi.fn();

    render(
      <ClientCurrentWorkoutCard
        currentWorkout={{
          title: 'Coach Homework Lower Strength',
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
            recentCompletions: [],
          },
        }}
        onNavigate={onNavigate}
      />,
    );

    const card = screen.getByTestId('current-workout-card');
    expect(card).toHaveTextContent(/suggested off-day workout/i);
    expect(card).toHaveTextContent(/today's assignment/i);
    expect(card).toHaveTextContent(/no paid session deduction/i);
    expect(card).toHaveTextContent(/off-day logs/i);
    expect(card).toHaveTextContent(/2 completed/i);
    expect(screen.getByRole('button', { name: /log today's assignment/i })).toHaveTextContent(/log assignment/i);
  });
});
