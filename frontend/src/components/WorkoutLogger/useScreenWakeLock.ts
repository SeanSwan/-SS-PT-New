/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ useScreenWakeLock — M6 companion (Slice 4a).                │
 * │ Keeps the screen awake while a training session is live so  │
 * │ the rest countdown stays glanceable from 3 feet. Fail-      │
 * │ silent: no Wake Lock API (older Safari), low battery, or a  │
 * │ denied request never throws. The OS releases the lock when  │
 * │ the tab hides — we re-acquire on visibilitychange.          │
 * └─────────────────────────────────────────────────────────────┘
 */
import { useEffect } from 'react';

interface WakeLockSentinelLike {
  release?: () => Promise<void> | void;
}

export function useScreenWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    const wakeLock = (navigator as { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wakeLock?.request) return undefined;

    let sentinel: WakeLockSentinelLike | null = null;
    let disposed = false;

    const acquire = async () => {
      try {
        const next = await wakeLock.request('screen');
        if (disposed) {
          next.release?.();
          return;
        }
        sentinel = next;
      } catch {
        /* denied / low battery — the session continues without the lock */
      }
    };

    const reacquire = () => {
      if (!document.hidden && !disposed) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', reacquire);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', reacquire);
      try {
        sentinel?.release?.();
      } catch {
        /* already released */
      }
    };
  }, [active]);
}
