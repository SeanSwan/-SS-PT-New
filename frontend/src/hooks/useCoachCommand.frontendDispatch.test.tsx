import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMAND_TRANSPORT_FAILED, commandErrorReceiptText, useCoachCommand } from './useCoachCommand';
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

describe('commandErrorReceiptText (R1 honesty fix)', () => {
  it('passes server error text through verbatim', () => {
    expect(commandErrorReceiptText('You don\'t have permission to do that. This requires admin or trainer role.'))
      .toMatch(/requires admin or trainer role/);
  });
  it('maps transport failure and empty errors to the unreachable copy', () => {
    expect(commandErrorReceiptText(COMMAND_TRANSPORT_FAILED)).toBe('Swan Coach is unreachable — try again.');
    expect(commandErrorReceiptText('')).toBe('Swan Coach is unreachable — try again.');
    expect(commandErrorReceiptText(undefined)).toBe('Swan Coach is unreachable — try again.');
  });
});

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

  it('preserves backend command validation errors instead of labeling them chat fallback', async () => {
    vi.mocked(apiService.post).mockRejectedValue({
      response: {
        data: {
          success: false,
          code: 'COMMAND_SELECTED_CLIENT_ID_INVALID',
          error: 'selectedClientId must be a positive integer when provided',
        },
      },
    });

    const { result } = renderHook(() => useCoachCommand());
    let response: Awaited<ReturnType<typeof result.current.executeCommand>> | null = null;

    await act(async () => {
      response = await result.current.executeCommand('log today workout', {
        selectedClientId: 42,
      });
    });

    expect(response).toMatchObject({
      type: 'error',
      error: 'selectedClientId must be a positive integer when provided',
    });
    expect(JSON.stringify(response)).not.toMatch(/falling back to chat/i);
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

describe('useCoachCommand — channel declaration (M3)', () => {
  beforeEach(() => {
    vi.mocked(apiService.post).mockReset();
    vi.mocked(apiService.post).mockResolvedValue({ data: { success: true, type: 'executed' } });
  });

  /**
   * The server can no longer assume a safe channel. It used to default a
   * missing `inputMode` to 'text', which meant the M3 voice rule answered
   * "safe" for every request ever made — no caller sent the field at all. The
   * absence now travels, and callers declare instead. This hook IS the typed
   * lane, so it declares 'text'; if it silently stopped, every command from it
   * would start being treated as an unproven channel and identity-crossing work
   * would demand a physical confirm the operator cannot understand.
   */
  it('declares inputMode "text" by default — this hook is the typed lane', async () => {
    const { result } = renderHook(() => useCoachCommand());
    await act(async () => { await result.current.executeCommand('log a workout'); });

    const [, body] = vi.mocked(apiService.post).mock.calls[0];
    expect((body as { routeContext?: Record<string, unknown> }).routeContext)
      .toMatchObject({ inputMode: 'text' });
  });

  it('lets a voice surface declare "voice" without losing its other tokens', async () => {
    const { result } = renderHook(() => useCoachCommand());
    await act(async () => {
      await result.current.executeCommand('log a workout', {
        inputMode: 'voice',
        surface: 'coach-dock',
        routeContext: { source: 'coach-command-center' },
      });
    });

    const [, body] = vi.mocked(apiService.post).mock.calls[0];
    expect((body as { routeContext?: Record<string, unknown> }).routeContext).toMatchObject({
      inputMode: 'voice',
      surface: 'coach-dock',
      source: 'coach-command-center',
    });
  });
});
