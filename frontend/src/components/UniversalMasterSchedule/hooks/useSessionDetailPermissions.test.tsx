import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionDetailPermissions } from './useSessionDetailPermissions';

const baseSession = {
  id: 5,
  sessionDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
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

  it('allows assigned trainers when schedule IDs arrive as numeric strings', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: '9' }));

    const { result } = renderHook(() =>
      useSessionDetailPermissions({
        open: true,
        mode: 'trainer',
        session: {
          ...baseSession,
          id: '5' as any,
          trainerId: '9' as any,
          userId: '7' as any,
        },
      })
    );

    await waitFor(() => {
      expect(result.current.currentUserId).toBe(9);
    });

    expect(result.current.isTrainerAssigned).toBe(true);
    expect(result.current.canComplete).toBe(true);
    expect(result.current.canRecordAttendance).toBe(true);
    expect(result.current.canOpenWorkoutLogger).toBe(true);
    expect(result.current.canViewWorkouts).toBe(true);
  });

  it('blocks assigned trainers from completing or opening the logger before the session day', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 9 }));

    const { result } = renderHook(() =>
      useSessionDetailPermissions({
        open: true,
        mode: 'trainer',
        session: {
          ...baseSession,
          sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      })
    );

    await waitFor(() => {
      expect(result.current.currentUserId).toBe(9);
    });

    expect(result.current.isTrainerAssigned).toBe(true);
    expect(result.current.canComplete).toBe(false);
    expect(result.current.canOpenWorkoutLogger).toBe(false);
    expect(result.current.canViewWorkouts).toBe(true);
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
    expect(result.current.canOpenWorkoutLogger).toBe(false);
    expect(result.current.canViewWorkouts).toBe(true);
  });

  it('allows clients to cancel their own session when the client ID arrives as a numeric string', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 7 }));

    const { result } = renderHook(() =>
      useSessionDetailPermissions({
        open: true,
        mode: 'client',
        session: {
          ...baseSession,
          userId: '7' as any,
        },
      })
    );

    await waitFor(() => {
      expect(result.current.currentUserId).toBe(7);
    });

    expect(result.current.canCancel).toBe(true);
    expect(result.current.canViewWorkouts).toBe(true);
  });

  it('blocks unassigned trainers from opening schedule-origin workout logging', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 13 }));

    const { result } = renderHook(() =>
      useSessionDetailPermissions({
        open: true,
        mode: 'trainer',
        session: baseSession,
      })
    );

    await waitFor(() => {
      expect(result.current.currentUserId).toBe(13);
    });

    expect(result.current.isTrainerAssigned).toBe(false);
    expect(result.current.canRecordAttendance).toBe(false);
    expect(result.current.canOpenWorkoutLogger).toBe(false);
    expect(result.current.canViewWorkouts).toBe(true);
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
