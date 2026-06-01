import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionDetailPermissions } from './useSessionDetailPermissions';

const baseSession = {
  id: 5,
  sessionDate: '2026-06-12T10:00:00.000Z',
  duration: 60,
  status: 'scheduled',
  trainerId: 9,
  userId: 7,
  clientSource: 'swanstudios',
  clientAvailableSessions: 4,
};

describe('useSessionDetailPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('allows the assigned trainer to manage, complete, record attendance, and open the logger', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 9 }));

    const { result } = renderHook(() =>
      useSessionDetailPermissions({
        open: true,
        mode: 'trainer',
        session: baseSession,
      })
    );

    await waitFor(() => {
      expect(result.current.currentUserId).toBe(9);
    });

    expect(result.current.canManage).toBe(true);
    expect(result.current.isTrainerAssigned).toBe(true);
    expect(result.current.canComplete).toBe(true);
    expect(result.current.canCancel).toBe(true);
    expect(result.current.canRecordAttendance).toBe(true);
    expect(result.current.canOpenWorkoutLogger).toBe(true);
    expect(result.current.sessionSignal.label).toBe('4 paid sessions');
  });

  it('keeps clients out of manager actions while allowing their own cancellable session', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 7 }));

    const { result } = renderHook(() =>
      useSessionDetailPermissions({
        open: true,
        mode: 'client',
        session: baseSession,
      })
    );

    await waitFor(() => {
      expect(result.current.currentUserId).toBe(7);
    });

    expect(result.current.canManage).toBe(false);
    expect(result.current.canComplete).toBe(false);
    expect(result.current.canRecordAttendance).toBe(false);
    expect(result.current.canCancel).toBe(true);
    expect(result.current.canManageSeries).toBe(false);
  });

  it('blocks workout logging and paid-session debt for blocked free-tracking sessions', () => {
    const { result } = renderHook(() =>
      useSessionDetailPermissions({
        open: true,
        mode: 'admin',
        session: {
          ...baseSession,
          status: 'blocked',
          isBlocked: true,
          clientSource: 'move_fitness',
          clientAvailableSessions: 0,
        },
      })
    );

    expect(result.current.isBlocked).toBe(true);
    expect(result.current.canComplete).toBe(false);
    expect(result.current.canCancel).toBe(false);
    expect(result.current.canOpenWorkoutLogger).toBe(false);
    expect(result.current.isNonDeductingClient).toBe(true);
    expect(result.current.sessionSignal.label).toBe('free tracking');
  });

  it('clears stored user identity when the modal closes', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 7 }));

    const { result, rerender } = renderHook(
      ({ open }) =>
        useSessionDetailPermissions({
          open,
          mode: 'client',
          session: baseSession,
        }),
      {
        initialProps: {
          open: true,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.currentUserId).toBe(7);
    });

    rerender({ open: false });

    expect(result.current.currentUserId).toBeNull();
    expect(result.current.canCancel).toBe(false);
  });
});
