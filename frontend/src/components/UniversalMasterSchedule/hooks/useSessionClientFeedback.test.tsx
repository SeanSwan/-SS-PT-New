import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../services/api.service';
import { useSessionClientFeedback } from './useSessionClientFeedback';
import type { SessionDetail } from '../SessionDetailModal.types';

vi.mock('../../../services/api.service', () => ({
  default: {
    post: vi.fn(),
  },
}));

const baseSession: SessionDetail = {
  id: 44,
  sessionDate: '2026-05-31T16:00:00.000Z',
  duration: 60,
  status: 'completed',
  userId: 20,
  trainerId: 7,
};

const setup = (session: SessionDetail | null = baseSession) => {
  const setFormError = vi.fn();
  const onUpdated = vi.fn();
  const hook = renderHook(() =>
    useSessionClientFeedback({
      open: true,
      session,
      onUpdated,
      setFormError,
    })
  );

  return {
    ...hook,
    setFormError,
    onUpdated,
  };
};

describe('useSessionClientFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not treat an existing rating as submitted client feedback without feedbackProvided', async () => {
    const { result } = setup({
      ...baseSession,
      rating: 4,
      feedback: 'Trainer-facing note',
      feedbackProvided: false,
    });

    await waitFor(() => {
      expect(result.current.feedbackSubmitted).toBe(false);
      expect(result.current.clientRating).toBe(0);
    });
  });

  it('hydrates submitted client feedback only when feedbackProvided is true', async () => {
    const { result } = setup({
      ...baseSession,
      rating: 5,
      feedback: 'Client loved it',
      feedbackProvided: true,
    });

    await waitFor(() => {
      expect(result.current.feedbackSubmitted).toBe(true);
      expect(result.current.clientRating).toBe(5);
    });
  });

  it('posts trimmed feedback through the shared API service', async () => {
    vi.mocked(apiService.post).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result, onUpdated, setFormError } = setup();

    await act(async () => {
      result.current.setClientRating(5);
      result.current.setClientComment('  Strong coaching pace  ');
    });

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(apiService.post).toHaveBeenCalledWith('/api/sessions/44/feedback', {
      rating: 5,
      comment: 'Strong coaching pace',
    });
    expect(setFormError).toHaveBeenCalledWith(null);
    expect(result.current.feedbackSubmitted).toBe(true);
    expect(onUpdated).toHaveBeenCalledTimes(1);
  });

  it('blocks empty feedback ratings before calling the API', async () => {
    const { result, setFormError } = setup();

    await act(async () => {
      await result.current.handleSubmitFeedback();
    });

    expect(apiService.post).not.toHaveBeenCalled();
    expect(setFormError).toHaveBeenCalledWith('Please select a rating before submitting.');
  });
});
