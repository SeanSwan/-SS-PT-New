import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGhostMode } from './useGhostMode';
import type { GhostData } from './GhostModeTypes';

const authAxiosMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: authAxiosMock,
  }),
}));

const makeGhostData = (overrides: Partial<GhostData> = {}): GhostData => ({
  ghostId: 'ghost-1',
  sourceSessionId: 99,
  sourceDate: '2026-06-20T00:00:00.000Z',
  category: 'strength',
  totalVolume: 1500,
  totalSets: 5,
  totalReps: 25,
  exercises: [{
    name: 'Bench Press',
    exerciseId: 12,
    sets: 5,
    reps: 5,
    weight: 300,
    volume: 1500,
  }],
  comparison: {
    metric: 'volume',
    target: 1500,
  },
  ...overrides,
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useGhostMode hardening', () => {
  it('keeps 2xx load failure payloads behind safe copy', async () => {
    authAxiosMock.get.mockImplementation((url: string) => {
      if (url.includes('/ghost/config')) {
        return Promise.resolve({ data: { success: true, data: { bonuses: {}, description: 'Config' } } });
      }
      return Promise.resolve({
        data: { success: false, message: 'private ghost table exploded' },
      });
    });

    const { result } = renderHook(() => useGhostMode({ userId: 42 }));

    await act(async () => {
      await result.current.loadGhost();
    });

    expect(result.current.ghostData).toBeNull();
    expect(result.current.error).toBe('Gamification system is temporarily unavailable.');
    expect(result.current.error).not.toContain('private ghost table');
  });

  it('keeps 2xx comparison failure payloads behind safe copy', async () => {
    authAxiosMock.get.mockImplementation((url: string) => {
      if (url.includes('/ghost/config')) {
        return Promise.resolve({ data: { success: true, data: { bonuses: {}, description: 'Config' } } });
      }
      return Promise.resolve({
        data: { success: true, data: { hasGhost: true, ghost: makeGhostData() } },
      });
    });
    authAxiosMock.post.mockResolvedValueOnce({
      data: { success: false, message: 'private comparison failed' },
    });

    const { result } = renderHook(() => useGhostMode({ userId: 42 }));

    await act(async () => {
      await result.current.loadGhost();
    });

    await waitFor(() => expect(result.current.ghostData?.ghostId).toBe('ghost-1'));

    let comparison: Awaited<ReturnType<typeof result.current.runComparison>> = null;
    await act(async () => {
      comparison = await result.current.runComparison({
        totalVolume: 1750,
        exercises: [{ name: 'Bench Press', exerciseId: 12, volume: 1750 }],
      });
    });

    expect(comparison).toBeNull();
    expect(result.current.comparisonResult).toBeNull();
    expect(result.current.error).toBe('Gamification system is temporarily unavailable.');
    expect(result.current.error).not.toContain('private comparison');
  });
});
