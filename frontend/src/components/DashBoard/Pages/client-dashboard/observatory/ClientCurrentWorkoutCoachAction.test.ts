import { describe, expect, it } from 'vitest';
import { buildClientCurrentWorkoutCoachAction } from './ClientCurrentWorkoutCoachAction';
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
};

describe('buildClientCurrentWorkoutCoachAction', () => {
  it('builds a client-safe current-assignment Coach route', () => {
    const action = buildClientCurrentWorkoutCoachAction(homeworkWorkout);
    const coachUrl = new URL(action.path, 'https://app.local');
    const prompt = coachUrl.searchParams.get('teachPrompt') || '';

    expect(action.label).toBe('Coach This');
    expect(action.ariaLabel).toBe("Ask Swan Coach about today's assignment");
    expect(coachUrl.pathname).toBe('/dashboard/client/coach-assistant');
    expect(coachUrl.searchParams.get('intent')).toBe('log_self_workout');
    expect(coachUrl.searchParams.get('source')).toBe('client-dashboard');
    expect(coachUrl.searchParams.get('returnTo')).toBe('/dashboard/client/overview');
    expect(prompt).toContain('Coach Homework Lower Strength');
    expect(prompt).toContain('6 Month Primary');
    expect(prompt).toContain('Week 2');
    expect(prompt).toContain('Day 3');
    expect(prompt).toContain('homework');
    expect(prompt).toContain('Goblet Squat');
    expect(prompt).toContain('4 exercises');
    expect(prompt).toContain('Do not claim the workout was logged');
    expect(prompt).not.toMatch(/assignmentKey|plan-6m|clientId|email|phone|@/i);
    expect(prompt.length).toBeLessThan(420);
  });

  it('keeps non-loggable trainer sessions out of log-self intent', () => {
    const action = buildClientCurrentWorkoutCoachAction({
      ...homeworkWorkout,
      assignmentType: 'trainer_session',
      isLoggable: false,
      ctaLabel: 'View Schedule',
    });
    const coachUrl = new URL(action.path, 'https://app.local');
    const prompt = coachUrl.searchParams.get('teachPrompt') || '';

    expect(coachUrl.searchParams.get('intent')).toBe('client_daily_command');
    expect(prompt).toContain('trainer_session');
    expect(prompt).toContain('open schedule or ask my trainer');
    expect(prompt).toContain('Do not claim the workout was logged');
  });

  it('strips contact-looking text from route prompt fields', () => {
    const action = buildClientCurrentWorkoutCoachAction({
      ...homeworkWorkout,
      title: 'Lower Body for sean@example.com 555-111-2222',
      firstExercise: 'Goblet Squat @privatehandle',
    });
    const coachUrl = new URL(action.path, 'https://app.local');
    const prompt = coachUrl.searchParams.get('teachPrompt') || '';

    expect(prompt).toContain('Lower Body for');
    expect(prompt).toContain('Goblet Squat');
    expect(prompt).not.toMatch(/sean@example|555-111|privatehandle|@/i);
  });
});
