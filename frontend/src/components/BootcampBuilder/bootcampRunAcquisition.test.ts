import { describe, expect, it, vi } from 'vitest';
import { acquireBootcampRunSurface } from './bootcampRunAcquisition';

describe('Bootcamp Start Class acquisition', () => {
  it('starts fullscreen, wake lock, and audio unlock in one synchronous gesture', async () => {
    const calls: string[] = [];
    const acquisition = acquireBootcampRunSurface({
      requestFullscreen: () => {
        calls.push('fullscreen');
        return Promise.resolve();
      },
      requestWakeLock: () => {
        calls.push('wake-lock');
        return Promise.resolve();
      },
      resumeAudio: () => {
        calls.push('audio');
        return Promise.resolve();
      },
    });

    expect(calls).toEqual(['fullscreen', 'wake-lock', 'audio']);
    await expect(acquisition).resolves.toEqual({
      fullscreen: true,
      wakeLock: true,
      audio: true,
    });
  });

  it('fails open when a browser rejects an optional capability', async () => {
    const warn = vi.fn();
    const result = await acquireBootcampRunSurface({
      requestFullscreen: () => Promise.reject(new Error('denied')),
      requestWakeLock: undefined,
      resumeAudio: () => Promise.resolve(),
      onCapabilityError: warn,
    });

    expect(result).toEqual({ fullscreen: false, wakeLock: false, audio: true });
    expect(warn).toHaveBeenCalledWith('fullscreen', expect.any(Error));
  });
});
