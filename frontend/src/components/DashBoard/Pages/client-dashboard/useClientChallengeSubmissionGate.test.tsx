import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const authGet = vi.fn();
  const authPost = vi.fn();
  return {
    authGet,
    authPost,
    authAxios: { get: authGet, post: authPost },
  };
});

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

import { useClientChallengeSubmissionGate } from './useClientChallengeSubmissionGate';

const policyResponse = {
  data: {
    success: true,
    canSubmit: false,
    queueStatus: 'closed_until_entitlement',
    requiredEntitlement: 'client_challenge_creation',
    message: 'Challenge idea submissions are closed until an admin grants client challenge creation entitlement.',
    nextSteps: [
      'Keep logging workouts so your trainer can nominate challenge ideas from real progress.',
      'Ask your trainer or admin to enable client challenge submissions when the pilot opens.',
    ],
    policy: {
      creatorRoles: ['admin', 'trainer'],
      clientCreation: 'disabled_by_default',
      requiresModerationForClientPublish: true,
      publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
    },
  },
};
const openPolicyResponse = {
  data: {
    ...policyResponse.data,
    canSubmit: true,
    queueStatus: 'open_for_review',
    message: 'Challenge ideas are open for trainer review.',
    policy: {
      ...policyResponse.data.policy,
      clientCreation: 'submit_for_review',
    },
  },
};

describe('useClientChallengeSubmissionGate', () => {
  beforeEach(() => {
    mocks.authGet.mockReset();
    mocks.authPost.mockReset();
    mocks.authGet.mockResolvedValue(policyResponse);
  });

  it('loads the client challenge submission policy gate from the backend', async () => {
    const { result } = renderHook(() => useClientChallengeSubmissionGate());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.authGet).toHaveBeenCalledWith('/api/v1/gamification/challenge-submissions/policy');
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.queueStatus).toBe('closed_until_entitlement');
    expect(result.current.requiredEntitlement).toBe('client_challenge_creation');
    expect(result.current.message).toBe(policyResponse.data.message);
    expect(result.current.policy?.clientCreation).toBe('disabled_by_default');
    expect(result.current.error).toBeNull();
  });

  it('does not POST a client challenge idea while the entitlement gate is closed', async () => {
    const { result } = renderHook(() => useClientChallengeSubmissionGate());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const submitted = await result.current.submitChallengeIdea({
        title: 'My Strength Week',
        description: 'I want a trainer-visible challenge based on my next three logged workouts.',
      });
      expect(submitted).toBe(false);
    });

    expect(mocks.authPost).not.toHaveBeenCalled();
    expect(result.current.actionError).toBe(policyResponse.data.message);
    expect(result.current.actionMessage).toBeNull();
  });

  it('rejects blank entitled challenge ideas before posting', async () => {
    mocks.authGet.mockResolvedValue(openPolicyResponse);
    const { result } = renderHook(() => useClientChallengeSubmissionGate());

    await waitFor(() => expect(result.current.canSubmit).toBe(true));

    await act(async () => {
      const submitted = await result.current.submitChallengeIdea({
        title: '   ',
        description: 'A trainer-visible challenge based on assigned workouts.',
      });
      expect(submitted).toBe(false);
    });

    expect(mocks.authPost).not.toHaveBeenCalled();
    expect(result.current.actionError).toBe('Challenge idea title and description are required.');
    expect(result.current.actionMessage).toBeNull();
  });

  it('trims entitled challenge ideas and preserves safe intent fields', async () => {
    mocks.authGet.mockResolvedValue(openPolicyResponse);
    mocks.authPost.mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useClientChallengeSubmissionGate());

    await waitFor(() => expect(result.current.canSubmit).toBe(true));

    await act(async () => {
      const submitted = await result.current.submitChallengeIdea({
        title: '  Three steady sessions  ',
        description: '  A challenge for my next three assigned workouts.  ',
        challengeType: 'monthly',
        archetype: 'improvement',
      });
      expect(submitted).toBe(true);
    });

    expect(mocks.authPost).toHaveBeenCalledWith('/api/v1/gamification/challenge-submissions', {
      title: 'Three steady sessions',
      description: 'A challenge for my next three assigned workouts.',
      requestedVisibility: 'trainer_visible',
      challengeType: 'monthly',
      archetype: 'improvement',
    });
    expect(result.current.actionMessage).toBe('Challenge idea submitted for trainer review.');
    expect(result.current.actionError).toBeNull();
  });

  it('keeps private challenge ideas private and acknowledges staff review', async () => {
    mocks.authGet.mockResolvedValue(openPolicyResponse);
    mocks.authPost.mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useClientChallengeSubmissionGate());

    await waitFor(() => expect(result.current.canSubmit).toBe(true));

    await act(async () => {
      const submitted = await result.current.submitChallengeIdea({
        title: 'Private consistency streak',
        description: 'A private self-challenge for my next seven workouts.',
        requestedVisibility: 'private',
      });
      expect(submitted).toBe(true);
    });

    expect(mocks.authPost).toHaveBeenCalledWith('/api/v1/gamification/challenge-submissions', expect.objectContaining({
      requestedVisibility: 'private',
    }));
    expect(result.current.actionMessage).toBe('Private challenge idea submitted for staff review.');
  });
  it('clamps unsafe public requested visibility to trainer review', async () => {
    mocks.authGet.mockResolvedValue(openPolicyResponse);
    mocks.authPost.mockResolvedValue({ data: { success: true } });
    const { result } = renderHook(() => useClientChallengeSubmissionGate());

    await waitFor(() => expect(result.current.canSubmit).toBe(true));

    await act(async () => {
      const submitted = await result.current.submitChallengeIdea({
        title: 'Community board challenge',
        description: 'I want everyone to see this challenge.',
        requestedVisibility: 'community',
        challengeType: 'community',
        archetype: 'leaderboard',
      });
      expect(submitted).toBe(true);
    });

    expect(mocks.authPost).toHaveBeenCalledWith('/api/v1/gamification/challenge-submissions', expect.objectContaining({
      requestedVisibility: 'trainer_visible',
      challengeType: 'weekly',
      archetype: 'consistency',
    }));
  });
});
