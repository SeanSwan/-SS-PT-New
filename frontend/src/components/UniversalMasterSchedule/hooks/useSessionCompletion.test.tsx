import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../services/api.service';
import { useSessionCompletion } from './useSessionCompletion';
import type { SessionDetail } from '../SessionDetailModal.types';

vi.mock('../../../services/api.service', () => ({
  default: {
    patch: vi.fn(),
  },
}));

const baseSession: SessionDetail = {
  id: 66,
  sessionDate: '2026-05-31T17:00:00.000Z',
  duration: 60,
  status: 'scheduled',
  userId: 20,
  trainerId: 7,
};

const setup = (session: SessionDetail | null = baseSession) => {
  const setFormError = vi.fn();
  const setLoading = vi.fn();
  const onUpdated = vi.fn();
  const onClose = vi.fn();
  const hook = renderHook(() =>
    useSessionCompletion({
      open: true,
      session,
      onUpdated,
      onClose,
      setFormError,
      setLoading,
    })
  );

  return {
    ...hook,
    setFormError,
    setLoading,
    onUpdated,
    onClose,
  };
};

describe('useSessionCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not hydrate manager completion fields from submitted client feedback', async () => {
    const { result } = setup({
      ...baseSession,
      status: 'completed',
      rating: 5,
      feedback: 'Client says great session',
      feedbackProvided: true,
    });

    await waitFor(() => {
      expect(result.current.trainerRating).toBe('');
      expect(result.current.clientFeedback).toBe('');
    });
  });

  it('hydrates saved manager completion drafts when client feedback is not marked submitted', async () => {
    const { result } = setup({
      ...baseSession,
      notes: 'Strong pace',
      rating: 4,
      feedback: 'Keep progressing bench tempo',
      feedbackProvided: false,
    });

    await waitFor(() => {
      expect(result.current.notes).toBe('Strong pace');
      expect(result.current.trainerRating).toBe('4');
      expect(result.current.clientFeedback).toBe('Keep progressing bench tempo');
    });
  });

  it('blocks invalid trainer ratings before calling the complete endpoint', async () => {
    const { result, setFormError, setLoading } = setup();

    await act(async () => {
      result.current.setTrainerRating('7');
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(apiService.patch).not.toHaveBeenCalled();
    expect(setFormError).toHaveBeenCalledWith('Trainer rating must be a number between 1 and 5.');
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('saves completion through the shared API service and closes on success', async () => {
    vi.mocked(apiService.patch).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result, onUpdated, onClose, setFormError } = setup();

    await act(async () => {
      result.current.setNotes('  Strong session  ');
      result.current.setTrainerRating('5');
      result.current.setClientFeedback('  Great tempo work  ');
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(apiService.patch).toHaveBeenCalledWith('/api/sessions/66/complete', {
      notes: 'Strong session',
      trainerRating: 5,
      clientFeedback: 'Great tempo work',
    });
    expect(setFormError).toHaveBeenCalledWith(null);
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
