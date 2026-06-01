import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../services/api.service';
import { useSessionAttendance } from './useSessionAttendance';
import type { SessionDetail } from '../SessionDetailModal.types';

vi.mock('../../../services/api.service', () => ({
  default: {
    patch: vi.fn(),
  },
}));

const baseSession: SessionDetail = {
  id: 72,
  sessionDate: '2026-05-31T18:00:00.000Z',
  duration: 60,
  status: 'scheduled',
  userId: 20,
  trainerId: 7,
  clientSource: 'swanstudios',
  clientAvailableSessions: 3,
  sessionDeducted: false,
};

const setup = (notes = 'Session moved well') => {
  const setFormError = vi.fn();
  const onUpdated = vi.fn();
  const onClose = vi.fn();
  const hook = renderHook(() =>
    useSessionAttendance({
      session: baseSession,
      notes,
      onUpdated,
      onClose,
      setFormError,
    })
  );

  return {
    ...hook,
    setFormError,
    onUpdated,
    onClose,
  };
};

describe('useSessionAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the no-show reason step before calling the attendance endpoint', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.handleRecordAttendance('no_show');
    });

    expect(result.current.showNoShowReason).toBe(true);
    expect(result.current.deductNoShowSessionCredit).toBe(true);
    expect(apiService.patch).not.toHaveBeenCalled();
  });

  it('clears the no-show draft when the trainer backs out', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.handleRecordAttendance('no_show');
      result.current.setNoShowReasonInput('Client missed the appointment');
    });
    act(() => {
      result.current.handleBackFromNoShowReason();
    });

    expect(result.current.showNoShowReason).toBe(false);
    expect(result.current.noShowReasonInput).toBe('');
  });

  it('records present attendance with notes and closes on success', async () => {
    vi.mocked(apiService.patch).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result, onUpdated, onClose, setFormError } = setup('  Focused session  ');

    await act(async () => {
      await result.current.handleRecordAttendance('present');
    });

    expect(apiService.patch).toHaveBeenCalledWith('/api/sessions/72/attendance', {
      attendanceStatus: 'present',
      notes: 'Focused session',
    });
    expect(setFormError).toHaveBeenCalledWith(null);
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('records no-show attendance with a trimmed reason after the reason step opens', async () => {
    vi.mocked(apiService.patch).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result } = setup('');

    await act(async () => {
      await result.current.handleRecordAttendance('no_show');
      result.current.setNoShowReasonInput('  No call no show  ');
    });
    await act(async () => {
      await result.current.handleRecordAttendance('no_show');
    });

    expect(apiService.patch).toHaveBeenCalledWith('/api/sessions/72/attendance', {
      attendanceStatus: 'no_show',
      noShowReason: 'No call no show',
      deductSessionCredit: true,
    });
    expect(result.current.showNoShowReason).toBe(false);
    expect(result.current.noShowReasonInput).toBe('');
  });

  it('lets the trainer spare the no-show credit before confirming attendance', async () => {
    vi.mocked(apiService.patch).mockResolvedValueOnce({
      data: { success: true },
    });
    const { result } = setup('');

    await act(async () => {
      await result.current.handleRecordAttendance('no_show');
      result.current.setDeductNoShowSessionCredit(false);
    });
    await act(async () => {
      await result.current.handleRecordAttendance('no_show');
    });

    expect(apiService.patch).toHaveBeenCalledWith('/api/sessions/72/attendance', {
      attendanceStatus: 'no_show',
      deductSessionCredit: false,
    });
  });
});
