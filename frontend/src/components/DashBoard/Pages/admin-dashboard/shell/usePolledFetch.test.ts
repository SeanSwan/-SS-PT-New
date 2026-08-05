import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePolledFetch } from './usePolledFetch';

describe('usePolledFetch (SWA-138 S1)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial success: loading→data with lastUpdated, no error', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a']);
    const { result } = renderHook(() => usePolledFetch(fetcher, { intervalMs: 0 }));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['a']);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('initial failure: error set, loading false, data stays null', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePolledFetch(fetcher, { intervalMs: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.data).toBeNull();
  });

  it('failed refresh KEEPS stale data and surfaces the error (stale-after-failure)', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(['good'])
      .mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => usePolledFetch(fetcher, { intervalMs: 0 }));
    await waitFor(() => expect(result.current.data).toEqual(['good']));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.data).toEqual(['good']);
    expect(result.current.error).toBe('down');
    expect(result.current.loading).toBe(false);
  });

  it('a success after a failure clears the error', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(['back']);
    const { result } = renderHook(() => usePolledFetch(fetcher, { intervalMs: 0 }));
    await waitFor(() => expect(result.current.error).toBe('down'));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.data).toEqual(['back']);
    expect(result.current.error).toBeNull();
  });

  it('polls on the given interval', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockResolvedValue([]);
    renderHook(() => usePolledFetch(fetcher, { intervalMs: 1_000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('enabled=false never fetches and never reports loading', () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() =>
      usePolledFetch(fetcher, { enabled: false }),
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});
