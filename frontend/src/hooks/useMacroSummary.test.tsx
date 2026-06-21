import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMacroSummary } from './useMacroSummary';

const mockApiService = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../services/api.service', () => ({
  default: mockApiService,
}));

describe('useMacroSummary', () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockApiService.get.mockReset();
  });

  it('uses the local calendar date for default summary queries', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 0, 5, 23, 45));
    mockApiService.get.mockResolvedValue({
      data: { success: true, summary: { date: '2026-01-05', totalCalories: 1000, mealCount: 2 } },
    });

    const { result } = renderHook(() => useMacroSummary());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApiService.get).toHaveBeenCalledWith('/api/macros/summary?date=2026-01-05');
    expect(result.current.summary?.date).toBe('2026-01-05');
    expect(result.current.error).toBeNull();
  });

  it('keeps raw backend and transport errors out of hook state', async () => {
    mockApiService.get.mockRejectedValueOnce({
      response: { data: { error: 'SQL timeout on daily_macro_logs userId=42' } },
      message: 'Provider stack trace',
    });

    const { result } = renderHook(() => useMacroSummary('2026-06-21'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBe('Macro summary unavailable. Try refreshing your dashboard.');
  });
});
