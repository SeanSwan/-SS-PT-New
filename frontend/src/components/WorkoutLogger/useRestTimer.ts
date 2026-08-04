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
  /** Seconds remaining — always recomputed from the wall clock (M6). */
  secondsLeft: number;
  /** Whether timer is currently counting down */
  isRunning: boolean;
  /** Epoch ms the countdown ends, null when idle (draft-persist seam). */
  endsAt: number | null;
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
  const [endsAt, setEndsAt] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  /** M6: the single source of countdown truth — epoch ms, not tick counts. */
  const endsAtRef = useRef<number | null>(null);

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

  /**
   * M6 tick: recompute remaining from the wall clock. Ticks are only a
   * refresh cadence — a throttled tab that misses every tick still lands
   * on the truth the moment tick() runs again (visibilitychange below).
   */
  const tick = useCallback(() => {
    const target = endsAtRef.current;
    if (target === null) return;
    const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
    setSecondsLeft(remaining);
    if (remaining <= 0) {
      endsAtRef.current = null;
      setEndsAt(null);
      setIsRunning(false);
      fireAlert();
      cleanup();
    }
  }, [cleanup, fireAlert]);

  // Fallback: main-thread metronome (the worker is also just a metronome now).
  const startFallbackInterval = useCallback(() => {
    intervalRef.current = setInterval(() => tick(), 1000);
  }, [tick]);

  // Start the timer
  const start = useCallback((seconds?: number) => {
    cleanup();

    const duration = seconds ?? defaultSeconds;
    const target = Date.now() + duration * 1000;
    endsAtRef.current = target;
    setEndsAt(target);
    setSecondsLeft(duration);
    setIsRunning(true);

    // Try a Web Worker metronome — worker timers throttle less in background.
    try {
      const workerBlob = new Blob([
        'let timer = setInterval(() => postMessage(1), 1000);'
        + ' onmessage = () => { clearInterval(timer); };'
      ], { type: 'application/javascript' });

      const worker = new Worker(URL.createObjectURL(workerBlob));
      workerRef.current = worker;
      worker.onmessage = () => tick();
      worker.onerror = () => {
        // Fallback to setInterval if Worker fails (CSP restriction, etc.)
        cleanup();
        startFallbackInterval();
      };
    } catch {
      // Web Worker not available — use setInterval fallback
      startFallbackInterval();
    }
  }, [cleanup, defaultSeconds, startFallbackInterval, tick]);

  // Stop the timer (pause)
  const stop = useCallback(() => {
    cleanup();
    endsAtRef.current = null;
    setEndsAt(null);
    setIsRunning(false);
  }, [cleanup]);

  // Reset to default
  const reset = useCallback(() => {
    cleanup();
    endsAtRef.current = null;
    setEndsAt(null);
    setSecondsLeft(defaultSeconds);
    setIsRunning(false);
  }, [cleanup, defaultSeconds]);

  // M6 reconcile: the instant the tab is visible/focused again, land on truth.
  useEffect(() => {
    if (!isRunning) return undefined;
    const reconcile = () => tick();
    document.addEventListener('visibilitychange', reconcile);
    window.addEventListener('focus', reconcile);
    return () => {
      document.removeEventListener('visibilitychange', reconcile);
      window.removeEventListener('focus', reconcile);
    };
  }, [isRunning, tick]);

  // Cleanup on unmount (CEO Ruling: custom useTimer hook with cleanup in useEffect)
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { secondsLeft, isRunning, endsAt, start, stop, reset };
}
