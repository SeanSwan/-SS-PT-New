import { act, renderHook } from '@testing-library/react';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBackendConnection } from './useBackendConnection';

const healthGet = vi.fn();

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({ get: healthGet })),
  },
}));

describe('useBackendConnection unavailable recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    healthGet.mockReset();
    vi.mocked(axios.create).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('automatically reconnects after the API recovers from an unavailable state', async () => {
    healthGet
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValue({ status: 200 });

    const { result } = renderHook(() => useBackendConnection({
      apiUrl: 'https://sswanstudios.test',
      healthCheckInterval: 1_000,
      maxRetries: 1,
    }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.isBackendUnavailable).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(result.current.isConnected).toBe(true);
    expect(healthGet).toHaveBeenCalledTimes(2);
  });
});
