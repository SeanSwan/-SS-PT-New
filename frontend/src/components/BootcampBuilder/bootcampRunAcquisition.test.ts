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

describe('Bootcamp Start Class acquisition — H24 honesty', () => {
  it('reports fullscreen: false when the Fullscreen API is missing, not silent success', async () => {
    const elementPrototype = Object.getPrototypeOf(document.documentElement);
    const original = Object.getOwnPropertyDescriptor(elementPrototype, 'requestFullscreen');
    Object.defineProperty(elementPrototype, 'requestFullscreen', {
      configurable: true,
      value: undefined,
    });

    try {
      const result = await acquireBootcampRunSurface({ requestWakeLock: undefined });
      expect(result.fullscreen).toBe(false);
    } finally {
      if (original) Object.defineProperty(elementPrototype, 'requestFullscreen', original);
      else delete (elementPrototype as Record<string, unknown>).requestFullscreen;
    }
  });

  it('still reports fullscreen: true when the document is already fullscreen', async () => {
    const elementPrototype = Object.getPrototypeOf(document.documentElement);
    const original = Object.getOwnPropertyDescriptor(elementPrototype, 'requestFullscreen');
    Object.defineProperty(elementPrototype, 'requestFullscreen', { configurable: true, value: undefined });
    const originalElement = document.fullscreenElement;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.body });

    try {
      const result = await acquireBootcampRunSurface({ requestWakeLock: undefined });
      expect(result.fullscreen).toBe(true);
    } finally {
      if (original) Object.defineProperty(elementPrototype, 'requestFullscreen', original);
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: originalElement,
      });
    }
  });
});
