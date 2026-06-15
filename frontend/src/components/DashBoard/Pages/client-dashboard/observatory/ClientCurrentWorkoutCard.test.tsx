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
    expect(card).toHaveTextContent(/recent homework history/i);
    expect(card).toHaveTextContent(/last 2/i);
    expect(card).toHaveTextContent(/week 3/i);
    expect(card).toHaveTextContent(/day 5/i);
    expect(card).toHaveTextContent(/split squat/i);
    const action = screen.getByRole('button', { name: /log today's assignment/i });
    expect(action).toHaveTextContent(/log assignment/i);

    fireEvent.click(action);
    expect(onNavigate).toHaveBeenCalledWith(
      '/dashboard/client/log-workout?loadPlan=today&assignmentKey=plan-6m%3Aw2%3Ad3%3Ahomework&assignmentType=homework',
    );
  });

  it('offers a context-aware Coach handoff for today assignment without saving it', () => {
    const onNavigate = vi.fn();

    render(
      <ClientCurrentWorkoutCard
        currentWorkout={{
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
        }}
        onNavigate={onNavigate}
      />,
    );

    const coachButton = screen.getByRole('button', {
      name: /ask swan coach about today's assignment/i,
    });
    expect(coachButton).toHaveTextContent(/coach this/i);

    fireEvent.click(coachButton);

    const [route] = onNavigate.mock.calls[0];
    const coachUrl = new URL(route, 'https://app.local');
    expect(coachUrl.pathname).toBe('/dashboard/client/coach-assistant');
    expect(coachUrl.searchParams.get('intent')).toBe('log_self_workout');
    expect(coachUrl.searchParams.get('source')).toBe('client-dashboard');
    expect(coachUrl.searchParams.get('returnTo')).toBe('/dashboard/client/overview');
    expect(coachUrl.searchParams.get('teachPrompt')).toContain('Coach Homework Lower Strength');
    expect(coachUrl.searchParams.get('teachPrompt')).toContain('Week 2');
    expect(coachUrl.searchParams.get('teachPrompt')).toContain('Goblet Squat');
    expect(coachUrl.searchParams.get('teachPrompt')).toContain('Do not claim the workout was logged');
  });
});
