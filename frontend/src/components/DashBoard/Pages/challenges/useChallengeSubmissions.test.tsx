import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const authGet = vi.fn();
  const authPatch = vi.fn();

  return {
    authGet,
    authPatch,
    authAxios: { get: authGet, patch: authPatch },
  };
});

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mocks.authAxios }),
}));

import { useChallengeSubmissions } from './useChallengeSubmissions';

const governancePolicy = {
  creatorRoles: ['admin', 'trainer'],
  clientCreation: 'disabled_by_default',
  requiresModerationForClientPublish: true,
  publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
};

const queueResponse = {
  data: {
    success: true,
    submissions: [],
    queueStatus: 'empty_by_policy',
    message: 'Client-created challenge submissions are closed until entitlement and moderation storage are connected.',
    policy: governancePolicy,
  },
};

const queueWithSubmission = {
  data: {
    ...queueResponse.data,
    submissions: [{
      id: 'sub-1',
      title: '30-day consistency sprint',
      status: 'pending',
      moderationStatus: 'pending',
      requestedVisibility: 'trainer_visible',
      submittedBy: 'Client #42',
      submittedAt: '2026-06-30T05:00:00.000Z',
    }],
    queueStatus: 'pending_review',
    message: '1 client-created challenge submission needs moderation review.',
  },
};

describe('useChallengeSubmissions', () => {
  beforeEach(() => {
    mocks.authGet.mockReset();
    mocks.authPatch.mockReset();
    mocks.authGet.mockResolvedValue(queueResponse);
    mocks.authPatch.mockResolvedValue({ data: { success: true, action: 'start_review', submission: queueWithSubmission.data.submissions[0] } });
  });

  it('loads the managed challenge submission queue from the backend policy endpoint', async () => {
    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.authGet).toHaveBeenCalledWith('/api/v1/gamification/challenge-submissions/manage');
    expect(result.current.submissions).toEqual([]);
    expect(result.current.queueStatus).toBe('empty_by_policy');
    expect(result.current.message).toBe(queueResponse.data.message);
    expect(result.current.governance?.clientCreation).toBe('disabled_by_default');
    expect(result.current.error).toBeNull();
  });

  it('moderates a queued client submission through the guarded staff endpoint and reloads the queue', async () => {
    mocks.authGet
      .mockResolvedValueOnce(queueWithSubmission)
      .mockResolvedValueOnce(queueResponse);

    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.submissions).toHaveLength(1));

    await act(async () => {
      await result.current.moderateSubmission('sub-1', 'start_review');
    });

    expect(mocks.authPatch).toHaveBeenCalledWith('/api/v1/gamification/challenge-submissions/sub-1/moderation', { action: 'start_review' });
    expect(mocks.authGet).toHaveBeenCalledTimes(2);
    expect(result.current.moderatingId).toBeNull();
    expect(result.current.actionError).toBeNull();
    expect(result.current.actionMessage).toBe('Challenge submission moved into review.');
  });

  it('blocks reject moderation before PATCH when review notes are blank', async () => {
    mocks.authGet.mockResolvedValueOnce(queueWithSubmission);

    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.submissions).toHaveLength(1));

    await act(async () => {
      const success = await result.current.moderateSubmission('sub-1', 'reject', '   ');
      expect(success).toBe(false);
    });

    expect(mocks.authPatch).not.toHaveBeenCalled();
    expect(result.current.actionError).toBe('Review notes are required when rejecting a client challenge submission.');
    expect(result.current.actionMessage).toBeNull();
    expect(result.current.moderatingId).toBeNull();
  });

  it('requests changes with staff review notes through the moderation endpoint', async () => {
    mocks.authGet
      .mockResolvedValueOnce(queueWithSubmission)
      .mockResolvedValueOnce(queueResponse);
    mocks.authPatch.mockResolvedValueOnce({
      data: {
        success: true,
        action: 'request_changes',
        submission: {
          ...queueWithSubmission.data.submissions[0],
          status: 'under_review',
          moderationStatus: 'needs_changes',
        },
      },
    });

    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.submissions).toHaveLength(1));

    await act(async () => {
      const success = await result.current.moderateSubmission(
        'sub-1',
        'request_changes',
        'Add a measurable scoring target before staff can review it again.',
      );
      expect(success).toBe(true);
    });

    expect(mocks.authPatch).toHaveBeenCalledWith('/api/v1/gamification/challenge-submissions/sub-1/moderation', {
      action: 'request_changes',
      reviewNotes: 'Add a measurable scoring target before staff can review it again.',
    });
    expect(result.current.actionError).toBeNull();
    expect(result.current.actionMessage).toBe('Challenge submission returned for changes with review notes.');
  });

  it('blocks request-changes moderation before PATCH when review notes are blank', async () => {
    mocks.authGet.mockResolvedValueOnce(queueWithSubmission);

    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.submissions).toHaveLength(1));

    await act(async () => {
      const success = await result.current.moderateSubmission('sub-1', 'request_changes', '   ');
      expect(success).toBe(false);
    });

    expect(mocks.authPatch).not.toHaveBeenCalled();
    expect(result.current.actionError).toBe('Review notes are required when requesting changes to a client challenge submission.');
    expect(result.current.actionMessage).toBeNull();
    expect(result.current.moderatingId).toBeNull();
  });
  it('does not announce moderation success when the post-action queue reload fails', async () => {
    mocks.authGet
      .mockResolvedValueOnce(queueWithSubmission)
      .mockResolvedValueOnce({ data: { success: true, submissions: [{ title: 'bad shape' }] } });

    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.submissions).toHaveLength(1));

    await act(async () => {
      const success = await result.current.moderateSubmission('sub-1', 'start_review');
      expect(success).toBe(false);
    });

    expect(mocks.authPatch).toHaveBeenCalledWith('/api/v1/gamification/challenge-submissions/sub-1/moderation', { action: 'start_review' });
    expect(result.current.error).toBe('Unexpected challenge submission queue response');
    expect(result.current.actionMessage).toBeNull();
    expect(result.current.actionError).toBeNull();
  });

  it('surfaces invalid queue responses as an error instead of inventing rows', async () => {
    mocks.authGet.mockResolvedValueOnce({ data: { success: true, submissions: [{ title: 'bad shape' }] } });

    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Unexpected challenge submission queue response');
    expect(result.current.submissions).toEqual([]);
  });

  it('rejects malformed optional submission details before the panel can render them', async () => {
    mocks.authGet.mockResolvedValueOnce({
      data: {
        ...queueResponse.data,
        submissions: [{ id: 'sub-1', title: 'Bad detail', status: 'pending', description: 42 }],
      },
    });

    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Unexpected challenge submission queue response');
    expect(result.current.submissions).toEqual([]);
  });

  it('clears stale queue copy after a malformed reload', async () => {
    mocks.authGet
      .mockResolvedValueOnce(queueResponse)
      .mockResolvedValueOnce({ data: { success: true, submissions: [{ title: 'bad shape' }] } });

    const { result } = renderHook(() => useChallengeSubmissions());

    await waitFor(() => expect(result.current.message).toBe(queueResponse.data.message));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBe('Unexpected challenge submission queue response');
    expect(result.current.submissions).toEqual([]);
    expect(result.current.queueStatus).toBeNull();
    expect(result.current.message).toBeNull();
    expect(result.current.governance).toBeNull();
  });
});

