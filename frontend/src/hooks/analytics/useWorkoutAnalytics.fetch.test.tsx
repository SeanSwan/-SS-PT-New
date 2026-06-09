import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthAxiosGet = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: { get: mockAuthAxiosGet },
  }),
}));

import { useWorkoutAnalytics } from './useWorkoutAnalytics';

describe('useWorkoutAnalytics fetch boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockResolvedValue({ data: { success: true, workouts: [] } });
  });

  it('blocks malformed user ids before building analytics API paths', async () => {
    const { result } = renderHook(() => useWorkoutAnalytics('fixture-42'));

    await waitFor(() => {
      expect(result.current.error).toBe('Select a valid client before loading workout analytics.');
    });

    expect(mockAuthAxiosGet).not.toHaveBeenCalled();
  });

  it('normalizes positive numeric string ids before fetching analytics data', async () => {
    renderHook(() => useWorkoutAnalytics('42'));

    await waitFor(() => {
      expect(mockAuthAxiosGet).toHaveBeenCalledWith(
        '/api/admin/clients/42/workouts',
        { params: { limit: 50, offset: 0 } },
      );
    });

    const urls = mockAuthAxiosGet.mock.calls.map(([url]) => String(url));
    expect(urls).toContain('/api/analytics/42/volume-progression');
    expect(urls).toContain('/api/analytics/42/personal-records');
    expect(urls).toContain('/api/analytics/42/frequency');
  });

  it('preserves unrated workout intensity as null and excludes it from the intensity average', async () => {
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/42/workouts') {
        return Promise.resolve({
          data: {
            success: true,
            workouts: [
              {
                id: 'unrated-session',
                title: 'Unrated strength day',
                date: '2026-06-07T12:00:00.000Z',
                duration: 45,
                intensity: null,
                status: 'completed',
                totalSets: 3,
                totalReps: 30,
                totalWeight: 1200,
                logs: [],
              },
              {
                id: 'rated-session',
                title: 'Rated conditioning day',
                date: '2026-06-08T12:00:00.000Z',
                duration: 40,
                intensity: 8,
                status: 'completed',
                totalSets: 4,
                totalReps: 36,
                totalWeight: 900,
                logs: [],
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: false } });
    });

    const { result } = renderHook(() => useWorkoutAnalytics('42'));

    await waitFor(() => {
      expect(result.current.data?.sessions).toHaveLength(2);
    });

    const unrated = result.current.data?.sessions.find((session) => session.id === 'unrated-session');
    expect(unrated?.intensity).toBeNull();
    expect(result.current.data?.intensityTrend).toEqual([
      { date: '2026-06-08T12:00:00.000Z', intensity: 8 },
    ]);
    expect(result.current.data?.summary.avgIntensity).toBe(8);
  });
});
