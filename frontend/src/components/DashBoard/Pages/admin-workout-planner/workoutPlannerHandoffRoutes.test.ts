import { describe, expect, it } from 'vitest';
import {
  buildWorkoutPlannerCoachReviewRoute,
  buildWorkoutPlannerLoggerRoute,
} from './workoutPlannerHandoffRoutes';
import type { GeneratedPlan } from './WorkoutPlannerTypes';

const generatedPlan: GeneratedPlan = {
  clientId: 42,
  clientName: 'Private Client Name',
  planSummary: {
    durationWeeks: 4,
    sessionsPerWeek: 2,
    totalSessions: 8,
    primaryGoal: 'strength',
    startingPhase: 2,
  },
  mesocycles: [],
  weeklySchedule: [
    { dayNumber: 1, focus: 'push strength', category: 'chest' },
    { dayNumber: 2, focus: 'lower body strength', category: 'legs' },
  ],
  weeks: [{
    weekNumber: 1,
    focus: 'base strength',
    days: [{
      dayNumber: 2,
      focus: 'lower body strength',
      exercises: [
        { exerciseName: 'Goblet Squat', sets: 3, reps: '8', restSeconds: 75, tempo: '2-0-2' },
        { name: 'Reverse Lunge', sets: 2, targetReps: '10 each', restTime: 60 },
      ],
    }],
  }],
  recommendations: ['Save the plan before assigning it.'],
};

describe('workoutPlannerHandoffRoutes', () => {
  it('builds a selected-day Coach review route without leaking client names', () => {
    const route = buildWorkoutPlannerCoachReviewRoute({
      pathname: '/dashboard/admin/workout-planner',
      search: '?clientId=42&source=clients-team',
      selectedClientId: 42,
      selectedMesoDay: 2,
      generatedPlan,
    });
    const url = new URL(route ?? '', 'https://sswanstudios.com');
    const prompt = url.searchParams.get('teachPrompt') || '';

    expect(url.pathname).toBe('/dashboard/admin/coach-assistant');
    expect(url.searchParams.get('clientId')).toBe('42');
    expect(url.searchParams.get('source')).toBe('admin-workout-planner');
    expect(url.searchParams.get('intent')).toBe('plan_review');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/admin/workout-planner?clientId=42&source=clients-team');
    expect(prompt).toContain('Client #42');
    expect(prompt).toContain('Day 2');
    expect(prompt).toContain('Goblet Squat - 3 x 8');
    expect(prompt).not.toContain('Private Client Name');
  });

  it('builds an admin self Coach review route without binding the admin as a client target', () => {
    const route = buildWorkoutPlannerCoachReviewRoute({
      pathname: '/dashboard/admin/workout-planner',
      search: '?self=1&source=swan-coach',
      selectedClientId: 7,
      selectedMesoDay: 2,
      generatedPlan,
    });
    const url = new URL(route ?? '', 'https://sswanstudios.com');
    const prompt = url.searchParams.get('teachPrompt') || '';

    expect(url.pathname).toBe('/dashboard/admin/coach-assistant');
    expect(url.searchParams.get('clientId')).toBeNull();
    expect(url.searchParams.get('source')).toBe('admin-workout-planner');
    expect(url.searchParams.get('intent')).toBe('plan_review');
    expect(url.searchParams.get('returnTo')).toBe('/dashboard/admin/workout-planner?self=1&source=swan-coach');
    expect(prompt).toContain('Personal admin workout review.');
    expect(prompt).not.toContain('Client #7');
    expect(prompt).not.toContain('Client #42');
    expect(prompt).not.toContain('Private Client Name');
  });

  it('routes generated trainer plans by generatedPlan.clientId when selected-client state is not hydrated', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/trainer/workout-planner',
      search: '?source=swan-coach&debateJobId=debate_job_42',
      selectedClientId: null,
      generatedPlan,
    });

    expect(route).toBe(
      '/dashboard/trainer/log-workout?clientId=42&source=workout-planner&loadPlan=today&returnTo=%2Fdashboard%2Ftrainer%2Fworkout-planner%3Fsource%3Dswan-coach%26clientId%3D42',
    );
    expect(route).not.toContain('debateJobId');
  });

  it('preserves booked-session context when a Coach generated trainer plan hands off to the logger', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/trainer/workout-planner',
      search: '?source=swan-coach&clientId=42&sessionId=88&sessionDate=2026-05-31T16%3A00%3A00.000Z&sessionCredits=2',
      selectedClientId: null,
      generatedPlan,
    });

    expect(route).toBe(
      '/dashboard/trainer/log-workout?clientId=42&source=workout-planner&loadPlan=today&returnTo=%2Fdashboard%2Ftrainer%2Fworkout-planner%3Fsource%3Dswan-coach%26clientId%3D42%26sessionId%3D88%26sessionDate%3D2026-05-31T16%253A00%253A00.000Z%26sessionCredits%3D2&sessionId=88&sessionDate=2026-05-31T16%3A00%3A00.000Z&sessionCredits=2',
    );
  });

  it('drops unsafe booked-session date and credits from the logger query', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/trainer/workout-planner',
      search: '?source=swan-coach&clientId=42&sessionId=88&sessionDate=1&sessionCredits=02',
      selectedClientId: null,
      generatedPlan,
    });
    const url = new URL(route ?? '', 'https://sswanstudios.com');

    expect(url.searchParams.get('sessionId')).toBe('88');
    expect(url.searchParams.get('sessionDate')).toBeNull();
    expect(url.searchParams.get('sessionCredits')).toBeNull();
  });

  it('routes restored generated trainer plans when generatedPlan.clientId is serialized as a string', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/trainer/workout-planner',
      search: '?source=swan-coach',
      selectedClientId: null,
      generatedPlan: { ...generatedPlan, clientId: '42' } as unknown as GeneratedPlan,
    });

    expect(route).toBe(
      '/dashboard/trainer/log-workout?clientId=42&source=workout-planner&loadPlan=today&returnTo=%2Fdashboard%2Ftrainer%2Fworkout-planner%3Fsource%3Dswan-coach%26clientId%3D42',
    );
  });
  it('rejects malformed serialized generated plan client ids', () => {
    for (const clientId of ['42abc', '01', '9007199254740992']) {
      expect(buildWorkoutPlannerLoggerRoute({
        pathname: '/dashboard/trainer/workout-planner',
        search: '?source=swan-coach',
        selectedClientId: null,
        generatedPlan: { ...generatedPlan, clientId } as unknown as GeneratedPlan,
      })).toBeNull();
    }
  });
  it('routes saved/current trainer plans to the trainer logger with return context', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/trainer/workout-planner',
      search: '?clientId=42',
      selectedClientId: 42,
    });

    expect(route).toBe(
      '/dashboard/trainer/log-workout?clientId=42&source=workout-planner&loadPlan=today&returnTo=%2Fdashboard%2Ftrainer%2Fworkout-planner%3FclientId%3D42',
    );
  });

  it('routes admin self plans to the personal workout logger without converting self into a client hub target', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/admin/workout-planner',
      search: '?self=1&source=swan-coach',
      selectedClientId: 7,
    });

    expect(route).toBe(
      '/dashboard/admin/log-my-workout?loadPlan=today&source=workout-planner&returnTo=%2Fdashboard%2Fadmin%2Fworkout-planner%3Fself%3D1%26source%3Dswan-coach',
    );
    expect(route).not.toContain('client-management');
    expect(route).not.toContain('clientId=7');
  });
  it('routes saved/current admin plans to the embedded Client Hub logger', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/admin/workout-planner',
      search: '?clientId=42',
      selectedClientId: 42,
    });

    expect(route).toBe(
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today&source=workout-planner&returnTo=%2Fdashboard%2Fadmin%2Fworkout-planner%3FclientId%3D42',
    );
  });

  it('strips debateJobId from logger return routes after the plan is ready to log', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/admin/workout-planner',
      search: '?clientId=42&source=swan-coach&debateJobId=debate_job_42&returnTo=%2Fdashboard%2Fadmin%2Fcoach-assistant%3FthreadId%3Dabc',
      selectedClientId: 42,
      generatedPlan,
    });
    const url = new URL(route ?? '', 'https://sswanstudios.com');
    const returnTo = url.searchParams.get('returnTo') || '';

    expect(url.pathname).toBe('/dashboard/admin/client-management');
    expect(returnTo).toBe('/dashboard/admin/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Fcoach-assistant%3FthreadId%3Dabc');
    expect(returnTo).not.toContain('debateJobId');
  });

  it('keeps debateJobId in Coach review return routes while the generated draft is still unsaved', () => {
    const route = buildWorkoutPlannerCoachReviewRoute({
      pathname: '/dashboard/admin/workout-planner',
      search: '?clientId=42&source=swan-coach&debateJobId=debate_job_42',
      selectedClientId: 42,
      selectedMesoDay: 2,
      generatedPlan,
    });
    const url = new URL(route ?? '', 'https://sswanstudios.com');

    expect(url.searchParams.get('returnTo')).toBe('/dashboard/admin/workout-planner?clientId=42&source=swan-coach&debateJobId=debate_job_42');
  });
  it('rejects unsupported planner paths and malformed clients', () => {
    expect(buildWorkoutPlannerCoachReviewRoute({
      pathname: '/dashboard/admin/reports',
      search: '',
      selectedClientId: 42,
      selectedMesoDay: 2,
      generatedPlan,
    })).toBeNull();
    expect(buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/trainer/workout-planner',
      search: '?clientId=bad',
      selectedClientId: null,
    })).toBeNull();
  });
});
