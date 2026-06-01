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
});
