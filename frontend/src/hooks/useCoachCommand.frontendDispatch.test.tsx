import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCoachCommand } from './useCoachCommand';
import apiService from '../services/api.service';
import { dispatchAIWorkoutEvent } from '../utils/aiWorkoutEvents';

vi.mock('../services/api.service', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('../utils/aiWorkoutEvents', () => ({
  dispatchAIWorkoutEvent: vi.fn(() => true),
}));

describe('useCoachCommand frontend dispatch bridge', () => {
  beforeEach(() => {
    vi.mocked(apiService.post).mockReset();
    vi.mocked(dispatchAIWorkoutEvent).mockReset();
    vi.mocked(dispatchAIWorkoutEvent).mockReturnValue(true);
  });

  it('dispatches typed workout-form browser events returned by the command route', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      data: {
        success: true,
        type: 'frontend_dispatch',
        command: 'add_exercise_to_form',
        message: 'Sent to the workout form.',
        event: 'AI_ADD_EXERCISE',
        payload: { exerciseName: 'Push Up', sets: 3 },
      },
    });

    const { result } = renderHook(() => useCoachCommand());
    let response: Awaited<ReturnType<typeof result.current.executeCommand>> | null = null;

    await act(async () => {
      response = await result.current.executeCommand('add push ups');
    });

    expect(dispatchAIWorkoutEvent).toHaveBeenCalledWith('AI_ADD_EXERCISE', {
      exerciseName: 'Push Up',
      sets: 3,
    });
    expect(response).toMatchObject({
      type: 'frontend_dispatch',
      command: 'add_exercise_to_form',
      event: 'AI_ADD_EXERCISE',
      dispatched: true,
    });
  });

  it('preserves manual-only not-wired details from the command route', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      data: {
        success: true,
        type: 'not_wired',
        command: 'block_user_posting',
        manualOnly: true,
        reason: 'user-level posting bans do not yet have a canonical route or model field',
        message: 'User-level posting bans require a canonical route or model field. No data was changed.',
      },
    });

    const { result } = renderHook(() => useCoachCommand());
    let response: Awaited<ReturnType<typeof result.current.executeCommand>> | null = null;

    await act(async () => {
      response = await result.current.executeCommand('submit this workout');
    });

    expect(dispatchAIWorkoutEvent).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      type: 'not_wired',
      command: 'block_user_posting',
      manualOnly: true,
      reason: 'user-level posting bans do not yet have a canonical route or model field',
    });
  });

  it('preserves not-wired receipts returned by confirmed commands', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      data: {
        success: false,
        type: 'not_wired',
        command: 'future_confirmed_command',
        message: 'future confirmed command is no longer wired for execution. No data was changed.',
      },
    });

    const { result } = renderHook(() => useCoachCommand());
    let response: Awaited<ReturnType<typeof result.current.confirmCommand>> | null = null;

    await act(async () => {
      response = await result.current.confirmCommand('op-1');
    });

    expect(response).toMatchObject({
      success: false,
      type: 'not_wired',
      command: 'future_confirmed_command',
      message: 'future confirmed command is no longer wired for execution. No data was changed.',
    });
  });

  it('dispatches workout-form browser events returned by confirmed commands', async () => {
    vi.mocked(apiService.post).mockResolvedValue({
      data: {
        success: true,
        type: 'frontend_dispatch',
        command: 'submit_workout_form',
        message: 'Sent confirmed workout submit to the logger.',
        event: 'AI_SUBMIT_WORKOUT',
        payload: { intensity: 8, notes: 'Strong finish' },
      },
    });

    const { result } = renderHook(() => useCoachCommand());
    let response: Awaited<ReturnType<typeof result.current.confirmCommand>> | null = null;

    await act(async () => {
      response = await result.current.confirmCommand('op-2');
    });

    expect(dispatchAIWorkoutEvent).toHaveBeenCalledWith('AI_SUBMIT_WORKOUT', {
      intensity: 8,
      notes: 'Strong finish',
    });
    expect(response).toMatchObject({
      success: true,
      type: 'frontend_dispatch',
      command: 'submit_workout_form',
      message: 'Sent confirmed workout submit to the logger.',
    });
  });

  it('returns an honest receipt when a confirmed submit has no active WorkoutLogger listener', async () => {
    vi.mocked(dispatchAIWorkoutEvent).mockReturnValue(false);
    vi.mocked(apiService.post).mockResolvedValue({
      data: {
        success: true,
        type: 'frontend_dispatch',
        command: 'submit_workout_form',
        message: 'Sent confirmed workout submit to the logger.',
        event: 'AI_SUBMIT_WORKOUT',
        payload: { intensity: 8 },
      },
    });

    const { result } = renderHook(() => useCoachCommand());
    let response: Awaited<ReturnType<typeof result.current.confirmCommand>> | null = null;

    await act(async () => {
      response = await result.current.confirmCommand('op-3');
    });

    expect(response).toMatchObject({
      success: true,
      type: 'frontend_dispatch',
      command: 'submit_workout_form',
      dispatched: false,
      message: 'No active Workout Logger was open. No workout was submitted.',
    });
  });
});
