import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const getSessions = vi.fn();
vi.mock('../../../../services/universal-master-schedule-service', () => ({
  default: { getSessions: (...args: unknown[]) => getSessions(...args) },
  setupDashboardSync: (callback: () => void) => {
    window.addEventListener('dashboardDataSync', callback);
    return () => window.removeEventListener('dashboardDataSync', callback);
  },
}));

import { dayBounds, scheduleRoleForUser, toTodaySlots, useTodaySchedule } from './useTodaySchedule';

const s = (over: Record<string, unknown>) => ({
  id: '1', sessionDate: '2026-09-22T17:00:00.000Z', duration: 60, userId: '12', trainerId: '3',
  status: 'scheduled', createdAt: '', updatedAt: '', client: { firstName: 'Avery', lastName: 'Stone' }, ...over,
}) as never;

describe('today schedule', () => {
  beforeEach(() => getSessions.mockReset());

  it('day bounds cover the local day', () => {
    const { start, end } = dayBounds(new Date(2026, 8, 22, 15));
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * 3600 * 1000 - 1);
  });

  it('drops open slots, sorts, shows first name + last initial for staff', () => {
    const slots = toTodaySlots([
      s({ id: 'b', sessionDate: '2026-09-22T19:00:00.000Z' }),
      s({ id: 'a', sessionDate: '2026-09-22T15:00:00.000Z' }),
      s({ id: 'x', status: 'available', userId: null }),
      s({ id: 'y', status: 'blocked' }),
    ], 'trainer', 3);
    expect(slots.map((slot) => slot.id)).toEqual(['a', 'b']);
    expect(slots[0]).toMatchObject({ who: 'Avery S.', clientId: 12, minutes: 60 });
  });

  it('a client sees only their own sessions, named by trainer', () => {
    const slots = toTodaySlots([
      s({ id: 'mine', userId: '12', trainer: { firstName: 'Sean' } }),
      s({ id: 'open', userId: null, status: 'available' }),
      s({ id: 'other', userId: '99' }),
    ], 'client', 12);
    expect(slots.map((slot) => [slot.id, slot.who])).toEqual([['mine', 'with Sean']]);
  });

  it('an error is an error, never an empty day; the waiver gate is named', async () => {
    getSessions.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'WAIVER_REQUIRED' }));
    const { result } = renderHook(() => useTodaySchedule('client', 12));
    await waitFor(() => expect(result.current.state).toEqual({ phase: 'error', reason: 'waiver' }));
    getSessions.mockRejectedValueOnce(new Error('500'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.state).toEqual({ phase: 'error', reason: 'failed' });
  });

  it('re-reads on the master schedule sync event', async () => {
    getSessions.mockResolvedValue([s({})]);
    const { result } = renderHook(() => useTodaySchedule('admin', 1));
    await waitFor(() => expect(result.current.state.phase).toBe('ready'));
    expect(getSessions).toHaveBeenCalledTimes(1);
    await act(async () => { window.dispatchEvent(new Event('dashboardDataSync')); });
    await waitFor(() => expect(getSessions).toHaveBeenCalledTimes(2));
    expect(getSessions.mock.calls[0][0]).toMatchObject({ customDateStart: expect.any(String), customDateEnd: expect.any(String) });
  });
});

describe('today schedule — a new day is re-read on its own (hostile review #7)', () => {
  it('re-reads just after local midnight, whichever view is open', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date(2026, 8, 24, 23, 59, 30));
    getSessions.mockReset();
    getSessions.mockResolvedValue([]);
    renderHook(() => useTodaySchedule('trainer', 3));
    await act(async () => { await Promise.resolve(); });
    expect(getSessions).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    vi.useRealTimers();
    expect(getSessions).toHaveBeenCalledTimes(2);
    const [{ customDateStart }] = getSessions.mock.calls[1] as [{ customDateStart: string }];
    expect(new Date(customDateStart).getDate()).toBe(25); // the new day's bounds
  });
});

describe('scheduleRoleForUser (review #12: the server scopes by the signed-in role)', () => {
  it('uses the authenticated role, whatever dashboard path is open', () => {
    expect(scheduleRoleForUser('admin')).toBe('admin');
    expect(scheduleRoleForUser('trainer')).toBe('trainer');
    expect(scheduleRoleForUser('user')).toBe('user');
  });
  it('CONTROL: an unknown role reads nothing', () => {
    expect(scheduleRoleForUser('ghost')).toBeNull();
    expect(scheduleRoleForUser(undefined)).toBeNull();
  });
});
