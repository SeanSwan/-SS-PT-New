/**
 * useClientProgressCharts Fetch Behavior Tests
 * ===========================================
 *
 * Locks client progress chart loading to distinguish unavailable chart feeds
 * from honest empty workout progress data.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useClientProgressCharts } from './useClientProgressCharts';

const mockGet = vi.fn();
const mockAuthAxios = { get: mockGet };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mockAuthAxios,
  }),
}));

const emptyChartResponse = { success: true, data: [] };

describe('useClientProgressCharts fetch behavior', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGet.mockResolvedValue({ data: emptyChartResponse });
  });

  it('reports unavailable chart feeds separately from honest empty progress data', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.endsWith('/chart-recovery-signal')) {
        return Promise.reject(new Error('recovery feed unavailable'));
      }
      return Promise.resolve({ data: emptyChartResponse });
    });

    const { result } = renderHook(() => useClientProgressCharts());

    await waitFor(() => {
      expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(12);
    });
    await waitFor(() => {
      expect(result.current.unavailableChartCount).toBe(1);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.charts.recoverySignal).toEqual([]);
  });
});
