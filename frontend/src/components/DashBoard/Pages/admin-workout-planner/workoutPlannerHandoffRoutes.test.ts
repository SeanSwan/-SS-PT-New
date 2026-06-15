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

  it('routes saved/current admin plans to the embedded Client Hub logger', () => {
    const route = buildWorkoutPlannerLoggerRoute({
      pathname: '/dashboard/admin/workout-planner',
      search: '?clientId=42',
      selectedClientId: 42,
    });

    expect(route).toBe(
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today&source=workout-planner',
    );
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
