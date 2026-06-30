import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const authGet = vi.fn();
  const authPatch = vi.fn();
  const authPut = vi.fn();

  return {
    authGet,
    authPatch,
    authPut,
    authAxios: { get: authGet, patch: authPatch, put: authPut },
  };
});

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

import { useManagedChallenges } from './useManagedChallenges';

const managedChallenge = {
  id: 'challenge-1',
  title: 'July Squad Spark',
  description: 'Trainer-created draft challenge.',
  challengeType: 'community',
  category: 'community_meetup',
  difficulty: 3,
  xpReward: 140,
  maxProgress: 12,
  progressUnit: 'sessions',
  startDate: '2026-07-06T12:00:00.000Z',
  endDate: '2026-07-13T12:00:00.000Z',
  status: 'draft',
  currentParticipants: 4,
};

const managedResponse = {
  data: {
    success: true,
    challenges: [managedChallenge],
  },
};

describe('useManagedChallenges', () => {
  beforeEach(() => {
    mocks.authGet.mockReset();
    mocks.authPatch.mockReset();
    mocks.authPut.mockReset();
    mocks.authGet.mockResolvedValue(managedResponse);
    mocks.authPatch.mockResolvedValue({ data: { success: true } });
    mocks.authPut.mockResolvedValue({ data: { success: true, audienceCount: 2 } });
  });

  it('publishes a draft through the managed challenge status endpoint and reloads the list', async () => {
    const { result } = renderHook(() => useManagedChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.publishChallenge('challenge-1');
    });

    expect(mocks.authPatch).toHaveBeenCalledWith(
      '/api/v1/gamification/challenges/challenge-1/status',
      { action: 'publish', visibility: 'public' },
    );
    expect(mocks.authGet).toHaveBeenCalledTimes(2);
    expect(mocks.authGet).toHaveBeenLastCalledWith('/api/v1/gamification/challenges/manage', {
      params: { status: 'all', limit: 20, sortBy: 'startDate', sortOrder: 'asc' },
    });
    expect(result.current.updatingId).toBeNull();
    expect(result.current.notice).toBe('July Squad Spark published for public discovery.');
  });

  it('publishes a private draft through the same status endpoint without public discovery', async () => {
    const { result } = renderHook(() => useManagedChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.publishChallenge('challenge-1', 'private');
    });

    expect(mocks.authPatch).toHaveBeenCalledWith(
      '/api/v1/gamification/challenges/challenge-1/status',
      { action: 'publish', visibility: 'private' },
    );
    expect(mocks.authGet).toHaveBeenCalledTimes(2);
    expect(result.current.updatingId).toBeNull();
    expect(result.current.notice).toBe('July Squad Spark published as a private cohort.');
  });

  it('clears stale publish notices when a later publish attempt fails', async () => {
    const { result } = renderHook(() => useManagedChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.publishChallenge('challenge-1');
    });
    expect(result.current.notice).toBe('July Squad Spark published for public discovery.');

    mocks.authPatch.mockRejectedValueOnce(new Error('Publish window expired'));

    await act(async () => {
      await result.current.publishChallenge('challenge-1');
    });

    expect(result.current.notice).toBeNull();
    expect(result.current.error).toBe('Publish window expired');
  });

  it('does not announce publish success when the post-publish refresh fails', async () => {
    const { result } = renderHook(() => useManagedChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));
    mocks.authGet.mockRejectedValueOnce(new Error('Reload failed'));

    await act(async () => {
      await result.current.publishChallenge('challenge-1');
    });

    expect(mocks.authPatch).toHaveBeenCalledTimes(1);
    expect(result.current.notice).toBeNull();
    expect(result.current.error).toBe('Reload failed');
  });

  it('completes an active challenge through the managed challenge status endpoint and reloads the list', async () => {
    const { result } = renderHook(() => useManagedChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateChallengeStatus('challenge-1', 'complete');
    });

    expect(mocks.authPatch).toHaveBeenCalledWith(
      '/api/v1/gamification/challenges/challenge-1/status',
      { action: 'complete' },
    );
    expect(mocks.authGet).toHaveBeenCalledTimes(2);
    expect(result.current.updatingId).toBeNull();
    expect(result.current.notice).toBe('July Squad Spark marked completed.');
  });

  it('archives a completed or cancelled challenge through the same status endpoint', async () => {
    const { result } = renderHook(() => useManagedChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateChallengeStatus('challenge-1', 'archive');
    });

    expect(mocks.authPatch).toHaveBeenCalledWith(
      '/api/v1/gamification/challenges/challenge-1/status',
      { action: 'archive' },
    );
    expect(mocks.authGet).toHaveBeenCalledTimes(2);
    expect(result.current.notice).toBe('July Squad Spark archived from operator lists.');
  });
  it('saves a draft audience through the managed challenge audience endpoint and reloads the list', async () => {
    const { result } = renderHook(() => useManagedChallenges());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const saved = await result.current.saveChallengeAudience('challenge-1', ['11', '12']);
      expect(saved).toBe(true);
    });

    expect(mocks.authPut).toHaveBeenCalledWith(
      '/api/v1/gamification/challenges/challenge-1/audience',
      { userIds: ['11', '12'] },
    );
    expect(mocks.authGet).toHaveBeenCalledTimes(2);
    expect(result.current.audienceUpdatingId).toBeNull();
  });
});
