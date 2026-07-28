/**
 * useChallenges fetch contract
 * ============================
 * Locks the live challenge fetch behavior for the dashboard challenge surface.
 * API outages must render a safe retryable error, not fake challenge cards and
 * not the normal zero-challenges empty state.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChallenges } from './useChallenges';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
  warn: vi.fn(),
  user: null as null | { id: string },
}));

vi.mock('../services/api.service', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
    delete: mocks.delete,
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    warn: mocks.warn,
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  },
}));

const apiChallenge = {
  id: 'challenge-1',
  title: '150-Minute Week',
  description: 'Build consistent training minutes',
  category: 'strength',
  status: 'active',
  startDate: '2026-06-01T00:00:00.000Z',
  endDate: '2099-06-30T00:00:00.000Z',
  currentParticipants: 18,
  maxProgress: 150,
  progressUnit: 'minutes',
};

describe('useChallenges fetch contract', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.delete.mockReset();
    mocks.warn.mockReset();
    mocks.user = null;
  });

  it('surfaces a safe retryable error when the public challenge feed fails', async () => {
    mocks.get.mockRejectedValueOnce({
      response: { data: { message: 'SQL timeout on Challenges userId=42' } },
      message: 'Axios stack trace',
    });

    const { result } = renderHook(() => useChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.challenges).toEqual([]);
    expect(result.current.isDemoData).toBe(false);
    expect(result.current.error).toBe('Challenge list unavailable. Refresh to try again.');
    expect(result.current.error).not.toContain('SQL timeout');
    expect(result.current.error).not.toContain('Axios');
  });

  it('clears the unavailable state after a later successful refresh', async () => {
    mocks.get
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce({ data: { success: true, challenges: [apiChallenge] } });

    const { result } = renderHook(() => useChallenges());

    await waitFor(() => expect(result.current.error).toBe('Challenge list unavailable. Refresh to try again.'));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.challenges).toHaveLength(1);
    expect(result.current.challenges[0].title).toBe('150-Minute Week');
  });

  it('logs join failures through the project logger without raw console noise', async () => {
    mocks.get.mockResolvedValue({ data: { success: true, challenges: [apiChallenge] } });
    mocks.post.mockRejectedValueOnce(new Error('join failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const { result } = renderHook(() => useChallenges());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let joined = true;
      await act(async () => {
        joined = await result.current.joinChallenge('challenge-1');
      });

      expect(joined).toBe(false);
      expect(mocks.post).toHaveBeenCalledWith('/api/v1/gamification/challenges/challenge-1/join');
      expect(mocks.warn).toHaveBeenCalledWith('[useChallenges] Join failed:', 'join failed');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mocks.get).toHaveBeenCalledTimes(1);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('returns true from leaveChallenge after API success and refreshes challenge state', async () => {
    mocks.get.mockResolvedValue({ data: { success: true, challenges: [apiChallenge] } });
    mocks.delete.mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(() => useChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));

    let left = false;
    await act(async () => {
      left = await result.current.leaveChallenge('challenge-1');
    });

    expect(left).toBe(true);
    expect(mocks.delete).toHaveBeenCalledWith('/api/v1/gamification/challenges/challenge-1/leave');
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });

  it('logs leave failures through the project logger without raw console noise', async () => {
    mocks.get.mockResolvedValue({ data: { success: true, challenges: [apiChallenge] } });
    mocks.delete.mockRejectedValueOnce(new Error('leave failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const { result } = renderHook(() => useChallenges());

      await waitFor(() => expect(result.current.loading).toBe(false));

      let left = true;
      await act(async () => {
        left = await result.current.leaveChallenge('challenge-1');
      });

      expect(left).toBe(false);
      expect(mocks.delete).toHaveBeenCalledWith('/api/v1/gamification/challenges/challenge-1/leave');
      expect(mocks.warn).toHaveBeenCalledWith('[useChallenges] Leave failed:', 'leave failed');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mocks.get).toHaveBeenCalledTimes(1);
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
