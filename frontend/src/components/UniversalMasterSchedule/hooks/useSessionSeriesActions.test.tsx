import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../services/api.service';
import { useSessionSeriesActions } from './useSessionSeriesActions';
import type { ScheduleConfirmRequest } from '../ScheduleConfirmDialog';
import type { SessionDetail } from '../SessionDetailModal.types';

vi.mock('../../../services/api.service', () => ({
  default: {
    delete: vi.fn(),
  },
}));

const baseSession: SessionDetail = {
  id: 77,
  sessionDate: '2026-05-31T19:00:00.000Z',
  duration: 60,
  status: 'scheduled',
  userId: 20,
  trainerId: 7,
  recurringGroupId: 'series-abc',
};

const setup = (session: SessionDetail | null = baseSession) => {
  const setFormError = vi.fn();
  const setLoading = vi.fn();
  const setConfirmRequest = vi.fn();
  const onUpdated = vi.fn();
  const onClose = vi.fn();

  const hook = renderHook(() =>
    useSessionSeriesActions({
      session,
      onUpdated,
      onClose,
      setFormError,
      setLoading,
      setConfirmRequest,
    })
  );

  return {
    ...hook,
    setFormError,
    setLoading,
    setConfirmRequest,
    onUpdated,
    onClose,
  };
};

describe('useSessionSeriesActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues a branded confirmation before deleting a recurring series', () => {
    const { result, setConfirmRequest } = setup();

    act(() => {
      result.current.handleDeleteSeries();
    });

    const request = setConfirmRequest.mock.calls[0]?.[0] as ScheduleConfirmRequest;
    expect(request.title).toBe('Delete recurring series?');
    expect(request.confirmLabel).toBe('Delete future sessions');
    expect(request.tone).toBe('danger');
    expect(request.message).toContain('future sessions');
    expect(apiService.delete).not.toHaveBeenCalled();
  });

  it('deletes the recurring series through the shared API service on confirmation', async () => {
    vi.mocked(apiService.delete).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result, setConfirmRequest, setFormError, setLoading, onUpdated, onClose } = setup();

    act(() => {
      result.current.handleDeleteSeries();
    });

    const request = setConfirmRequest.mock.calls[0]?.[0] as ScheduleConfirmRequest;
    await act(async () => {
      await request.onConfirm();
    });

    expect(apiService.delete).toHaveBeenCalledWith('/api/sessions/recurring/series-abc');
    expect(setFormError).toHaveBeenCalledWith(null);
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenLastCalledWith(false);
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open when the backend rejects recurring series deletion', async () => {
    vi.mocked(apiService.delete).mockResolvedValueOnce({
      data: { success: false, message: 'No future sessions found for recurring series' },
    });
    const { result, setConfirmRequest, setFormError, onUpdated, onClose } = setup();

    act(() => {
      result.current.handleDeleteSeries();
    });

    const request = setConfirmRequest.mock.calls[0]?.[0] as ScheduleConfirmRequest;
    await act(async () => {
      await request.onConfirm();
    });

    expect(setFormError).toHaveBeenCalledWith('No future sessions found for recurring series');
    expect(onUpdated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does nothing when the selected session has no recurring group', () => {
    const { result, setConfirmRequest } = setup({
      ...baseSession,
      recurringGroupId: null,
    });

    act(() => {
      result.current.handleDeleteSeries();
    });

    expect(setConfirmRequest).not.toHaveBeenCalled();
    expect(apiService.delete).not.toHaveBeenCalled();
  });
});
