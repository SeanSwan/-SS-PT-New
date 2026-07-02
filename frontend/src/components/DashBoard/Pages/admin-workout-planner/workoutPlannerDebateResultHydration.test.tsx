import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  adaptWorkoutDebateResultToGeneratedPlan,
  parseWorkoutPlannerDebateJobId,
  useWorkoutPlannerDebateResultHydration,
} from './workoutPlannerDebateResultHydration';

const completedDebateResult = {
  success: true,
  id: 'debate_job_42',
  type: 'workout_plan',
  state: 'complete',
  finalPlan: {
    role: 'nasm_specialist',
    recommendation: 'Use a two-day strength endurance split.',
    confidence: 0.91,
    reasoning: 'Phase 2 tempo and recovery match the client context.',
    contraindications: ['Avoid overhead loading.'],
    modifications: [{ original: 'Overhead Press', replacement: 'Landmine Press', reason: 'Shoulder-friendly pressing angle.' }],
    workoutDays: [{
      dayNumber: 1,
      focus: 'Full Body Strength Endurance',
      warmup: [{ name: 'Mobility Prep', sets: 1, reps: '8', notes: 'Move with control.' }],
      exercises: [{ name: 'Goblet Squat', sets: 3, reps: '10-12', restSeconds: 60, notes: '2/0/2 tempo.' }],
      cooldown: [{ name: 'Hip Flexor Stretch', sets: 1, reps: '45s' }],
    }],
  },
};

describe('workoutPlannerDebateResultHydration', () => {
  it('accepts only safe debate job ids from the planner route', () => {
    expect(parseWorkoutPlannerDebateJobId('debate_job_42')).toBe('debate_job_42');
    expect(parseWorkoutPlannerDebateJobId(' debate_abcdef123456 ')).toBe('debate_abcdef123456');
    expect(parseWorkoutPlannerDebateJobId('../debate_job_42')).toBeNull();
    expect(parseWorkoutPlannerDebateJobId('debate_job_42%0a')).toBeNull();
  });

  it('adapts completed workout debates into a Swan Coach generated plan draft', () => {
    const generated = adaptWorkoutDebateResultToGeneratedPlan(completedDebateResult, {
      clientId: 42,
      clientName: 'Ava Stone',
    });

    expect(generated).toMatchObject({
      clientId: 42,
      clientName: 'Ava Stone',
      planningSystem: 'swan_coach_planning',
      planSummary: {
        durationWeeks: 1,
        sessionsPerWeek: 1,
        totalSessions: 1,
        primaryGoal: 'general_fitness',
        startingPhase: 2,
      },
      weeklySchedule: [{ dayNumber: 1, focus: 'Full Body Strength Endurance', category: 'full_body' }],
      recommendations: expect.arrayContaining([
        'Use a two-day strength endurance split.',
        'Avoid overhead loading.',
        'Overhead Press -> Landmine Press: Shoulder-friendly pressing angle.',
      ]),
    });
    expect(generated?.weeks?.[0]?.days?.[0]?.exercises).toEqual(expect.arrayContaining([
      expect.objectContaining({ exerciseName: 'Mobility Prep', notes: expect.stringContaining('Warmup') }),
      expect.objectContaining({ exerciseName: 'Goblet Squat', sets: 3, targetReps: '10-12', restSeconds: 60 }),
      expect.objectContaining({ exerciseName: 'Hip Flexor Stretch', notes: expect.stringContaining('Cooldown') }),
    ]));
  });

  it('loads a debate result into the generated planner draft without manual builder rows', async () => {
    const authAxios = { get: vi.fn().mockResolvedValue({ data: completedDebateResult }) };
    const setters = {
      setGeneratedPlan: vi.fn(),
      setPlanExercises: vi.fn(),
      setStatusMsg: vi.fn(),
      resetLoadedPlanState: vi.fn(),
    };

    renderHook(() => useWorkoutPlannerDebateResultHydration({
      authAxios,
      debateJobId: 'debate_job_42',
      selectedClientId: 42,
      selectedClientName: 'Ava Stone',
      ...setters,
    }));

    await waitFor(() => expect(authAxios.get).toHaveBeenCalledWith('/api/ai/debate/debate_job_42/result'));

    expect(setters.setPlanExercises).toHaveBeenCalledWith([]);
    expect(setters.resetLoadedPlanState).toHaveBeenCalledTimes(1);
    expect(setters.setGeneratedPlan).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 42,
      planningSystem: 'swan_coach_planning',
      weeks: expect.any(Array),
    }));
    expect(setters.setStatusMsg).toHaveBeenLastCalledWith({
      type: 'success',
      text: 'Loaded the completed Swan Coach debate into Build Plan. Review before saving or assigning.',
    });
  });

  it('polls an in-progress debate and hydrates when the final plan becomes available', async () => {
    vi.useFakeTimers();
    try {
      const authAxios = {
        get: vi.fn()
          .mockResolvedValueOnce({ data: { success: false, state: 'running', currentRound: 2 } })
          .mockResolvedValueOnce({ data: completedDebateResult }),
      };
      const setters = {
        setGeneratedPlan: vi.fn(),
        setPlanExercises: vi.fn(),
        setStatusMsg: vi.fn(),
        resetLoadedPlanState: vi.fn(),
      };

      renderHook(() => useWorkoutPlannerDebateResultHydration({
        authAxios,
        debateJobId: 'debate_job_42',
        selectedClientId: 42,
        selectedClientName: 'Ava Stone',
        ...setters,
      }));

      await act(async () => { await Promise.resolve(); });
      expect(authAxios.get).toHaveBeenCalledTimes(1);
      expect(setters.setPlanExercises).not.toHaveBeenCalled();
      expect(setters.setStatusMsg).toHaveBeenCalledWith({
        type: 'error',
        text: 'Swan Coach debate is still running. Build Plan will load it automatically when it completes.',
      });

      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(authAxios.get).toHaveBeenCalledTimes(2);
      expect(setters.setPlanExercises).toHaveBeenCalledWith([]);
      expect(setters.setGeneratedPlan).toHaveBeenCalledWith(expect.objectContaining({
        clientId: 42,
        planningSystem: 'swan_coach_planning',
      }));
      expect(setters.setStatusMsg).toHaveBeenLastCalledWith({
        type: 'success',
        text: 'Loaded the completed Swan Coach debate into Build Plan. Review before saving or assigning.',
      });
    } finally {
      vi.useRealTimers();
    }
  });
  it('reports in-progress debates without clearing the current builder state', async () => {
    const authAxios = {
      get: vi.fn().mockResolvedValue({ data: { success: false, state: 'running', currentRound: 2 } }),
    };
    const setters = {
      setGeneratedPlan: vi.fn(),
      setPlanExercises: vi.fn(),
      setStatusMsg: vi.fn(),
      resetLoadedPlanState: vi.fn(),
    };

    renderHook(() => useWorkoutPlannerDebateResultHydration({
      authAxios,
      debateJobId: 'debate_job_42',
      selectedClientId: 42,
      selectedClientName: 'Ava Stone',
      ...setters,
    }));

    await waitFor(() => expect(setters.setStatusMsg).toHaveBeenCalledWith({
      type: 'error',
      text: 'Swan Coach debate is still running. Build Plan will load it automatically when it completes.',
    }));
    expect(setters.setPlanExercises).not.toHaveBeenCalled();
    expect(setters.setGeneratedPlan).not.toHaveBeenCalled();
    expect(setters.resetLoadedPlanState).not.toHaveBeenCalled();
  });
  it('does not fetch when the route has no safe debate job id or selected client', async () => {
    const authAxios = { get: vi.fn() };
    const noop = vi.fn();

    await act(async () => {
      renderHook(() => useWorkoutPlannerDebateResultHydration({
        authAxios,
        debateJobId: '../debate_job_42',
        selectedClientId: 42,
        selectedClientName: 'Ava Stone',
        setGeneratedPlan: noop,
        setPlanExercises: noop,
        setStatusMsg: noop,
        resetLoadedPlanState: noop,
      }));
    });

    expect(authAxios.get).not.toHaveBeenCalled();
  });
});