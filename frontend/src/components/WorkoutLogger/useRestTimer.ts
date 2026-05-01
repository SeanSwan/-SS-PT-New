/**
 * ┌─── HOOK: useRestTimer ─────────────────────────────────────┐
 * │ PURPOSE: Countdown rest timer with Web Worker precision     │
 * │          and proper cleanup (CEO Ruling V2.0)               │
 * │                                                              │
 * │ Features:                                                    │
 * │ - Countdown from restSeconds to 0                           │
 * │ - Audio beep on completion (UI-2 fix 2026-04-30)            │
 * │   3 short beeps at 800Hz via Web Audio API; no asset file   │
 * │ - Vibration alert when timer completes (navigator.vibrate)  │
 * │ - Web Worker for background precision (falls back to setInterval) │
 * │ - Proper cleanup in useEffect (no memory leaks)             │
 * │ - prefers-reduced-motion: disables vibration                │
 * │                                                              │
 * │ Returns: { secondsLeft, isRunning, start, stop, reset }    │
 * └──────────────────────────────────────────────────────────────┘
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRestTimerOptions {
  /** Default rest time in seconds */
  defaultSeconds?: number;
  /** Callback when timer reaches zero */
  onComplete?: () => void;
  /** Enable vibration alert (CEO Ruling: navigator.vibrate(50) only) */
  enableVibration?: boolean;
  /** Enable audio beep on completion (UI-2 2026-04-30) */
  enableAudio?: boolean;
}

/**
 * Play 3 short 800Hz beeps via Web Audio API. No asset file required —
 * generates the tone in-browser. Called when the rest timer completes.
 *
 * Failure modes:
 * - AudioContext unavailable (very old browsers) → silent fail
 * - Browser autoplay restrictions → silent fail (timer was started by user
 *   click so the audio context should be unlocked, but if not, no throw)
 */
function playRestCompleteBeep(): void {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const beepCount = 3;
    const beepDurationMs = 120;
    const gapMs = 80;
    for (let i = 0; i < beepCount; i++) {
      const startSec = ctx.currentTime + i * (beepDurationMs + gapMs) / 1000;
      const stopSec = startSec + beepDurationMs / 1000;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 800;
      // Brief ramp prevents the click/pop a hard-edged tone produces.
      gain.gain.setValueAtTime(0, startSec);
      gain.gain.linearRampToValueAtTime(0.18, startSec + 0.01);
      gain.gain.setValueAtTime(0.18, stopSec - 0.01);
      gain.gain.linearRampToValueAtTime(0, stopSec);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startSec);
      oscillator.stop(stopSec);
    }
    // Clean up the context after all beeps would have played.
    setTimeout(() => {
      try { ctx.close(); } catch { /* already closed */ }
    }, beepCount * (beepDurationMs + gapMs) + 200);
  } catch {
    // Silent — the timer's vibration + onComplete callback still fire.
  }
}

interface UseRestTimerReturn {
  /** Seconds remaining */
  secondsLeft: number;
  /** Whether timer is currently counting down */
  isRunning: boolean;
  /** Start the countdown (optionally with a custom duration) */
  start: (seconds?: number) => void;
  /** Stop/pause the timer */
  stop: () => void;
  /** Reset to the default duration */
  reset: () => void;
}

export function useRestTimer(options: UseRestTimerOptions = {}): UseRestTimerReturn {
  const {
    defaultSeconds = 60,
    onComplete,
    enableVibration = true,
    enableAudio = true,
  } = options;

  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Check reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Cleanup function for both worker and interval
  const cleanup = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Fire completion alert: audio beep + vibration + onComplete callback.
  const fireAlert = useCallback(() => {
    // CEO Ruling V2.0: navigator.vibrate(50) only, prefers-reduced-motion disables.
    if (enableVibration && !prefersReducedMotion && navigator.vibrate) {
      navigator.vibrate(50);
    }
    // UI-2 (2026-04-30): audio beep on completion. prefers-reduced-motion does not
    // gate audio (system pref is for motion, not sound). Consumers can disable via
    // enableAudio: false if they want a silent timer.
    if (enableAudio) {
      playRestCompleteBeep();
    }
    onCompleteRef.current?.();
  }, [enableVibration, enableAudio, prefersReducedMotion]);

  // Start the timer
  const start = useCallback((seconds?: number) => {
    cleanup();

    const duration = seconds ?? defaultSeconds;
    setSecondsLeft(duration);
    setIsRunning(true);

    // Try Web Worker for background precision
    try {
      const workerBlob = new Blob([
        `let count = ${duration};
         let timer = setInterval(() => {
           count--;
           postMessage(count);
           if (count <= 0) { clearInterval(timer); }
         }, 1000);
         onmessage = () => { clearInterval(timer); };`
      ], { type: 'application/javascript' });

      const worker = new Worker(URL.createObjectURL(workerBlob));
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<number>) => {
        const remaining = e.data;
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          setIsRunning(false);
          fireAlert();
          cleanup();
        }
      };

      worker.onerror = () => {
        // Fallback to setInterval if Worker fails (CSP restriction, etc.)
        cleanup();
        startFallbackInterval(duration);
      };
    } catch {
      // Web Worker not available — use setInterval fallback
      startFallbackInterval(duration);
    }
  }, [cleanup, defaultSeconds, fireAlert]);

  // Fallback: use setInterval on main thread
  const startFallbackInterval = useCallback((duration: number) => {
    let remaining = duration;
    setSecondsLeft(remaining);
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      remaining--;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setIsRunning(false);
        fireAlert();
        cleanup();
      }
    }, 1000);
  }, [cleanup, fireAlert]);

  // Stop the timer (pause)
  const stop = useCallback(() => {
    cleanup();
    setIsRunning(false);
  }, [cleanup]);

  // Reset to default
  const reset = useCallback(() => {
    cleanup();
    setSecondsLeft(defaultSeconds);
    setIsRunning(false);
  }, [cleanup, defaultSeconds]);

  // Cleanup on unmount (CEO Ruling: custom useTimer hook with cleanup in useEffect)
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { secondsLeft, isRunning, start, stop, reset };
}
