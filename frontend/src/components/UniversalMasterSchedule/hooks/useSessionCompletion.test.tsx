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
  clientSource: 'swanstudios',
  clientAvailableSessions: 3,
  sessionDeducted: false,
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
      completeWithoutLog: true,
      deductSessionCredit: true,
    });
    expect(setFormError).toHaveBeenCalledWith(null);
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lets managers waive direct-completion deduction for paid sessions with a recorded reason', async () => {
    vi.mocked(apiService.patch).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result } = setup();

    await waitFor(() => {
      expect(result.current.canDeductCompletionSessionCredit).toBe(true);
      expect(result.current.deductCompletionSessionCredit).toBe(true);
      expect(result.current.completionWaiveReasonRequired).toBe(false);
    });

    await act(async () => {
      result.current.setDeductCompletionSessionCredit(false);
    });

    await waitFor(() => {
      expect(result.current.completionWaiveReasonRequired).toBe(true);
    });

    await act(async () => {
      result.current.setCompletionWaiveReason('  comp session for referral  ');
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(apiService.patch).toHaveBeenCalledWith('/api/sessions/66/complete', {
      notes: undefined,
      trainerRating: undefined,
      clientFeedback: undefined,
      completeWithoutLog: true,
      deductSessionCredit: false,
      waiveReason: 'comp session for referral',
    });
  });

  it('blocks a waive without a 5+ character reason before calling the endpoint', async () => {
    const { result, setFormError } = setup();

    await waitFor(() => {
      expect(result.current.deductCompletionSessionCredit).toBe(true);
    });

    await act(async () => {
      result.current.setDeductCompletionSessionCredit(false);
      result.current.setCompletionWaiveReason('abc');
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(apiService.patch).not.toHaveBeenCalled();
    expect(setFormError).toHaveBeenCalledWith(
      'Add a short reason (5+ characters) for completing without deducting a session credit.'
    );
  });

  it('requires a waive reason when a paid client has no known credits left (unpaid completion is a waive)', async () => {
    vi.mocked(apiService.patch).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result } = setup({
      ...baseSession,
      clientAvailableSessions: 0,
    });

    await waitFor(() => {
      expect(result.current.canDeductCompletionSessionCredit).toBe(false);
      expect(result.current.deductCompletionSessionCredit).toBe(false);
      expect(result.current.completionBillingApplicable).toBe(true);
      expect(result.current.completionWaiveReasonRequired).toBe(true);
    });

    await act(async () => {
      result.current.setCompletionWaiveReason('client out of credits, renewal pending');
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(apiService.patch).toHaveBeenCalledWith('/api/sessions/66/complete', {
      notes: undefined,
      trainerRating: undefined,
      clientFeedback: undefined,
      completeWithoutLog: true,
      deductSessionCredit: false,
      waiveReason: 'client out of credits, renewal pending',
    });
  });

  it('does not require a waive reason for non-deducting client sources', async () => {
    vi.mocked(apiService.patch).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result } = setup({
      ...baseSession,
      clientSource: 'move_fitness',
    });

    await waitFor(() => {
      expect(result.current.completionBillingApplicable).toBe(false);
      expect(result.current.completionWaiveReasonRequired).toBe(false);
    });

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(apiService.patch).toHaveBeenCalledWith('/api/sessions/66/complete', {
      notes: undefined,
      trainerRating: undefined,
      clientFeedback: undefined,
      completeWithoutLog: true,
      deductSessionCredit: false,
    });
  });
});
