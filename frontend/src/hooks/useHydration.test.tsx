import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHydration } from './useHydration';

const mockApiService = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  isAuthenticated: vi.fn(),
}));

vi.mock('../services/api.service', () => ({
  default: mockApiService,
}));

describe('useHydration', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    mockApiService.get.mockReset();
    mockApiService.put.mockReset();
    mockApiService.isAuthenticated.mockReset();
    mockApiService.put.mockResolvedValue({ data: { success: true } });
  });

  it('uses the local calendar date for authenticated hydration fetches', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 5, 23, 45));
    mockApiService.isAuthenticated.mockReturnValue(true);
    mockApiService.get.mockResolvedValue({
      data: { success: true, hydration: { glassesFilled: 2, dailyGoal: 8, glassOz: 12 } },
    });

    const { result } = renderHook(() => useHydration());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApiService.get).toHaveBeenCalledWith('/api/hydration?date=2026-01-05');
  });

  it('sanitizes malformed authenticated hydration rows before exposing radar inputs', async () => {
    mockApiService.isAuthenticated.mockReturnValue(true);
    mockApiService.get.mockResolvedValue({
      data: {
        success: true,
        hydration: {
          glassesFilled: Number.NaN,
          dailyGoal: -4,
          glassOz: 0,
        },
      },
    });

    const { result } = renderHook(() => useHydration());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.filled).toBe(0);
    expect(result.current.dailyGoal).toBe(8);
    expect(result.current.glassOz).toBe(8);
  });

  it('rejects coercive hydration values instead of showing false progress', async () => {
    mockApiService.isAuthenticated.mockReturnValue(true);
    mockApiService.get.mockResolvedValue({
      data: {
        success: true,
        hydration: {
          glassesFilled: '0x10',
          dailyGoal: '1e2',
          glassOz: [16],
        },
      },
    });

    const { result } = renderHook(() => useHydration());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.filled).toBe(0);
    expect(result.current.dailyGoal).toBe(8);
    expect(result.current.glassOz).toBe(8);
  });

  it('sanitizes malformed local fallback values for unauthenticated users', async () => {
    mockApiService.isAuthenticated.mockReturnValue(false);
    localStorage.setItem(`ss-hydration-${new Date().toISOString().split('T')[0]}`, 'not-a-number');

    const { result } = renderHook(() => useHydration());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.filled).toBe(0);
    expect(result.current.dailyGoal).toBe(8);
    expect(result.current.glassOz).toBe(8);
  });

  it('clamps updates before saving through the shared API service', async () => {
    mockApiService.isAuthenticated.mockReturnValue(true);
    mockApiService.get.mockResolvedValue({
      data: { success: true, hydration: { glassesFilled: 2, dailyGoal: 8, glassOz: 12 } },
    });

    const { result } = renderHook(() => useHydration());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.updateFilled(99);
    });

    await waitFor(() => {
      expect(mockApiService.put).toHaveBeenCalledWith('/api/hydration', expect.objectContaining({ glassesFilled: 30 }));
    });
    expect(result.current.filled).toBe(30);
  });

  it('flushes a pending authenticated hydration save when the hook unmounts', async () => {
    mockApiService.isAuthenticated.mockReturnValue(true);
    mockApiService.get.mockResolvedValue({
      data: { success: true, hydration: { glassesFilled: 2, dailyGoal: 8, glassOz: 12 } },
    });

    const { result, unmount } = renderHook(() => useHydration());

    await waitFor(() => expect(result.current.loading).toBe(false));
    mockApiService.put.mockClear();

    act(() => {
      result.current.updateFilled(5);
    });

    expect(mockApiService.put).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });

    expect(mockApiService.put).toHaveBeenCalledWith('/api/hydration', expect.objectContaining({ glassesFilled: 5 }));
  });
});
