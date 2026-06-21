import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRestaurantSearch } from './useRestaurantSearch';

const mockApiService = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../services/api.service', () => ({
  default: mockApiService,
}));

describe('useRestaurantSearch', () => {
  beforeEach(() => {
    mockApiService.get.mockReset();
  });

  it('keeps raw provider and transport errors out of hook state', async () => {
    mockApiService.get.mockRejectedValueOnce({
      response: { data: { error: 'FatSecret stack trace: upstream token rejected' } },
      message: 'Axios network internals',
    });

    const { result } = renderHook(() => useRestaurantSearch());

    await act(async () => {
      await result.current.search('Chipotle');
    });

    expect(result.current.error).toBe('Restaurant search is unavailable right now. Please try again.');
    expect(result.current.error).not.toContain('FatSecret');
    expect(result.current.error).not.toContain('Axios');
  });
});
