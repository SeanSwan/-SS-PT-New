/**
 * useProfile stats lifecycle — the branch nothing was watching.
 *
 * A reviewer mutated `setStatsStatus('unavailable')` to `setStatsStatus('ready')`
 * inside the stats CATCH — reinstating the original P0 verbatim, since the
 * substituted zeros then render as the member's record — and the whole
 * dashboard suite still reported 396/396. There was no `useProfile` test in the
 * repo at all, and every consumer test mocks the hook, so the producer of the
 * signal was completely undefended.
 *
 * These tests exercise the real hook against a mocked service.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getUserStatsMock } = vi.hoisted(() => ({ getUserStatsMock: vi.fn() }));

vi.mock('../../services/profileService', () => ({
  default: {
    getUserStats: getUserStatsMock,
    getCurrentProfile: vi.fn().mockResolvedValue({ id: 1, username: 'member' }),
    getUserProfile: vi.fn().mockResolvedValue({ id: 1, username: 'member' }),
    getUserPosts: vi.fn().mockResolvedValue({ posts: [], total: 0 }),
    getUserAchievements: vi.fn().mockResolvedValue({ achievements: [] }),
    getFollowStats: vi.fn().mockResolvedValue({ followers: 0, following: 0 }),
    getDisplayName: () => 'Member',
    getUsernameForDisplay: () => 'member',
    getUserInitials: () => 'M',
  },
}));

// Stable identities. Returning a fresh object literal per render changes
// `user` every render, which re-fires the load effect in a loop — every
// response then loses the sequence race and the hook never settles.
const authValue = { user: { id: 1, username: 'member' } };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => authValue }));

const loggerStub = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };
vi.mock('../../utils/logger', () => ({ default: loggerStub, logger: loggerStub }));

const loadHook = async () => (await import('./useProfile')).useProfile;

const realStats = {
  posts: 4, followers: 10, following: 7, workouts: 22, streak: 9, points: 1240, level: 7, tier: 'gold',
};

afterEach(() => {
  // Without this, hook instances from earlier tests stay mounted and their
  // pending effects consume the mock's queued implementations.
  cleanup();
});

beforeEach(() => {
  // Only reset the mock under test. `vi.clearAllMocks()` would strip the
  // mockResolvedValue implementations off the sibling service mocks, so every
  // test after the first would fail on an unrelated profile load.
  getUserStatsMock.mockReset();
});

describe('useProfile stats lifecycle', () => {
  it('reports READY only after a successful load', async () => {
    getUserStatsMock.mockResolvedValue(realStats);
    const useProfile = await loadHook();

    const { result } = renderHook(() => useProfile());

    await waitFor(() => expect(result.current.statsStatus).toBe('ready'));
    expect(result.current.statsKnown).toBe(true);
    expect(result.current.stats?.workouts).toBe(22);
  });

  it('reports UNAVAILABLE when the stats fetch fails — never ready', async () => {
    // The mutation that survived the whole suite flipped exactly this to
    // 'ready', which republished the substituted zeros as the member's record.
    // Driven through refreshStats rather than the mount effect so the assertion
    // is about the catch branch, not about effect timing.
    getUserStatsMock.mockResolvedValue(realStats);
    const useProfile = await loadHook();
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.statsStatus).toBe('ready'));

    getUserStatsMock.mockImplementationOnce(() => Promise.reject(new Error('500')));
    await act(async () => { await result.current.refreshStats(); });

    expect(result.current.statsStatus).toBe('unavailable');
    expect(result.current.statsKnown).toBe(false);
  });

  it('never licenses the substituted zeros as the record', async () => {
    getUserStatsMock.mockResolvedValue(realStats);
    const useProfile = await loadHook();
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.statsStatus).toBe('ready'));

    getUserStatsMock.mockImplementationOnce(() => Promise.reject(new Error('500')));
    await act(async () => { await result.current.refreshStats(); });

    // The zeros are still there so the UI cannot crash — but statsKnown is the
    // permission slip, and it must be denied.
    expect(result.current.stats?.workouts).toBe(0);
    expect(result.current.statsKnown).toBe(false);
  });

  it('does not blank known-good stats while a manual refresh is in flight', async () => {
    getUserStatsMock.mockResolvedValue(realStats);
    const useProfile = await loadHook();
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.statsStatus).toBe('ready'));

    let resolveRefresh: (value: unknown) => void = () => {};
    getUserStatsMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveRefresh = resolve; }),
    );

    let refreshDone: Promise<unknown> = Promise.resolve();
    act(() => { refreshDone = result.current.refreshStats(); });

    // Previously this dropped straight back to 'loading', so tapping Retry
    // after a recovered outage made the member's stats disappear.
    expect(result.current.statsStatus).toBe('ready');

    await act(async () => {
      resolveRefresh(realStats);
      await refreshDone;
    });
    expect(result.current.statsStatus).toBe('ready');
  });

  it('publishes the LAST requested load, not the last to resolve', async () => {
    const useProfile = await loadHook();
    getUserStatsMock.mockResolvedValue(realStats);
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.statsStatus).toBe('ready'));

    let resolveSlow: (value: unknown) => void = () => {};
    let slowDone: Promise<unknown> = Promise.resolve();
    getUserStatsMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSlow = resolve; }))
      .mockResolvedValueOnce({ ...realStats, workouts: 99 });

    act(() => { slowDone = result.current.refreshStats(); });
    await act(async () => { await result.current.refreshStats(); });
    // The stale first response lands LAST and must be discarded.
    await act(async () => {
      resolveSlow({ ...realStats, workouts: 1 });
      await slowDone;
    });

    expect(result.current.stats?.workouts).toBe(99);
  });
});
