/**
 * M6 wake-lock laws: acquire while active, release on teardown,
 * re-acquire when the tab returns, and NEVER throw when the API
 * is missing or denies the request.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScreenWakeLock } from './useScreenWakeLock';

const flush = () => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

describe('useScreenWakeLock', () => {
  afterEach(() => {
    delete (navigator as { wakeLock?: unknown }).wakeLock;
  });

  it('acquires while active and releases on unmount', async () => {
    const release = vi.fn();
    const request = vi.fn().mockResolvedValue({ release });
    (navigator as { wakeLock?: unknown }).wakeLock = { request };

    const { unmount } = renderHook(() => useScreenWakeLock(true));
    await flush();
    expect(request).toHaveBeenCalledWith('screen');

    unmount();
    expect(release).toHaveBeenCalled();
  });

  it('does nothing while inactive', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() });
    (navigator as { wakeLock?: unknown }).wakeLock = { request };
    renderHook(() => useScreenWakeLock(false));
    await flush();
    expect(request).not.toHaveBeenCalled();
  });

  it('re-acquires when the tab becomes visible again', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn() });
    (navigator as { wakeLock?: unknown }).wakeLock = { request };
    renderHook(() => useScreenWakeLock(true));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('visibilitychange')); // jsdom is visible
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('missing API or denial never throws', async () => {
    expect(() => renderHook(() => useScreenWakeLock(true))).not.toThrow();

    (navigator as { wakeLock?: unknown }).wakeLock = {
      request: vi.fn().mockRejectedValue(new Error('denied')),
    };
    expect(() => renderHook(() => useScreenWakeLock(true))).not.toThrow();
    await flush();
  });
});
