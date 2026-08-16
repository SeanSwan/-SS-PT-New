/**
 * ============================================================================
 * FILE: useFreestyleSession.ts
 * PURPOSE: State machine for a freestyle dictation session.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-16
 * ============================================================================
 *
 * WHAT FREESTYLE IS
 * -----------------
 * Sean talks for as long as he wants, with no schema and no prompts, and Coach
 * turns the result into a clean structured summary he confirms before anything is
 * written. Doctrine: docs/ai-workflow/coach-brain/10-freestyle-intake.md.
 *
 * THIS SLICE (S2) IS DELIBERATELY WRITE-FREE.
 * It owns session state, the local buffer, and the discard path. It does not
 * consolidate, does not disambiguate, and cannot write a record. Those arrive in
 * S4 (consolidation) and S7 (batch apply). Keeping the surface write-free means a
 * bug here can lose a draft but can never corrupt a client's history.
 *
 * RETENTION
 * ---------
 * Buffers are account-keyed so a shared gym tablet cannot leak trainer A's
 * session to trainer B, and are purged on discard, account switch, and TTL.
 * The encrypted persistent store is S3; this hook holds the in-memory session and
 * defines the purge triggers it must honour.
 * Contract: docs/ai-workflow/AI-HANDOFF/SWAN-COACH-FREESTYLE-RETENTION-CONTRACT-2026-08-16.md
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

/**
 * Session lifecycle. `consolidating` onward are owned by later slices; they exist
 * here so the machine is complete and the copy table has no gaps (amendment A3),
 * but this slice only drives up to `stopped`.
 */
export type FreestyleState =
  | 'idle'
  | 'listening'
  | 'paused'
  | 'stopped'          // capture ended, buffer held, nothing sent anywhere
  | 'consolidating'    // S4
  | 'summary'          // S4
  | 'applying'         // S7
  | 'applied'          // S7
  | 'discarded'
  | 'error';

export interface FreestyleFragment {
  /** Monotonic id; not a database key. */
  id: number;
  text: string;
  /** ms since session start — relative, so no wall-clock leaves the device. */
  atMs: number;
}

export interface FreestyleSessionSnapshot {
  state: FreestyleState;
  fragments: FreestyleFragment[];
  /** Whole-session elapsed ms, excluding paused time. */
  elapsedMs: number;
  /** ms since the last fragment arrived — drives the "still hearing you" signal. */
  sinceLastFragmentMs: number;
  wordCount: number;
  error: string | null;
}

export interface UseFreestyleSessionOptions {
  /**
   * Identifies the owning account. A change purges the buffer — this is the
   * shared-gym-tablet guarantee, not a convenience.
   */
  accountKey: string | number | null;
  /** Buffer lifetime. Defaults to the contract's 24h ceiling. */
  ttlMs?: number;
  /** Injectable clock. Tests must not depend on wall time. */
  now?: () => number;
  /** Called once when a buffer is purged, with the reason. For audit/receipts. */
  onPurge?: (reason: FreestylePurgeReason) => void;
}

export type FreestylePurgeReason = 'discard' | 'account-switch' | 'ttl' | 'unmount';

export interface UseFreestyleSessionReturn extends FreestyleSessionSnapshot {
  isActive: boolean;
  canResume: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  /** Two-step by design — see `discard`. */
  requestDiscard: () => void;
  cancelDiscard: () => void;
  discardPending: boolean;
  discard: () => void;
  appendFragment: (text: string) => void;
  reset: () => void;
}

export const FREESTYLE_TTL_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useFreestyleSession(
  options: UseFreestyleSessionOptions,
): UseFreestyleSessionReturn {
  const { accountKey, ttlMs = FREESTYLE_TTL_MS, now = Date.now, onPurge } = options;

  const [state, setState] = useState<FreestyleState>('idle');
  const [fragments, setFragments] = useState<FreestyleFragment[]>([]);
  const [discardPending, setDiscardPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Ticks purely to re-render elapsed/idle readouts; never a source of truth. */
  const [, setTick] = useState(0);

  const startedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const lastFragmentAtRef = useRef<number | null>(null);
  /** Freezes the elapsed readout once capture ends (see `at` below). */
  const stoppedAtRef = useRef<number | null>(null);
  const nextIdRef = useRef(1);

  /**
   * Mirrors `state` so transition guards can run OUTSIDE a setState updater.
   * Updaters must be pure — React may invoke them more than once — and an
   * earlier version mutated the pause accounting inside them, which
   * double-counted paused time.
   */
  const stateRef = useRef<FreestyleState>('idle');
  stateRef.current = state;

  const nowRef = useRef(now);
  nowRef.current = now;
  const onPurgeRef = useRef(onPurge);
  onPurgeRef.current = onPurge;

  const clearBuffer = useCallback((reason: FreestylePurgeReason) => {
    setFragments([]);
    startedAtRef.current = null;
    pausedTotalRef.current = 0;
    pausedAtRef.current = null;
    lastFragmentAtRef.current = null;
    stoppedAtRef.current = null;
    nextIdRef.current = 1;
    onPurgeRef.current?.(reason);
  }, []);

  const start = useCallback(() => {
    setError(null);
    setDiscardPending(false);
    setFragments([]);
    startedAtRef.current = nowRef.current();
    pausedTotalRef.current = 0;
    pausedAtRef.current = null;
    lastFragmentAtRef.current = null;
    stoppedAtRef.current = null;
    nextIdRef.current = 1;
    stateRef.current = 'listening';
    setState('listening');
  }, []);

  const pause = useCallback(() => {
    if (stateRef.current !== 'listening') return;
    pausedAtRef.current = nowRef.current();
    stateRef.current = 'paused';
    setState('paused');
  }, []);

  /** Folds an open pause into the running total. Idempotent. */
  const settlePause = useCallback(() => {
    if (pausedAtRef.current === null) return;
    pausedTotalRef.current += nowRef.current() - pausedAtRef.current;
    pausedAtRef.current = null;
  }, []);

  const resume = useCallback(() => {
    if (stateRef.current !== 'paused') return;
    settlePause();
    stateRef.current = 'listening';
    setState('listening');
  }, [settlePause]);

  const stop = useCallback(() => {
    if (stateRef.current !== 'listening' && stateRef.current !== 'paused') return;
    settlePause();
    stoppedAtRef.current = nowRef.current();
    stateRef.current = 'stopped';
    setState('stopped');
  }, [settlePause]);

  /**
   * Discard is two-step on purpose. A ten-minute session represents real work
   * that cannot be recovered, so a single mis-tap must not destroy it —
   * `requestDiscard` arms, `discard` commits, `cancelDiscard` backs out.
   */
  const requestDiscard = useCallback(() => setDiscardPending(true), []);
  const cancelDiscard = useCallback(() => setDiscardPending(false), []);

  const discard = useCallback(() => {
    setDiscardPending(false);
    clearBuffer('discard');
    /**
     * Settle to 'idle', not 'discarded'. The overlay auto-starts only from 'idle'
     * and hides Start in terminal states, so parking here left a reopened overlay
     * with no session and no way to begin one.
     */
    stateRef.current = 'idle';
    setState('idle');
  }, [clearBuffer]);

  const appendFragment = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;               // never store empty interim noise
    // Fragments arriving while paused or stopped are dropped rather than
    // silently reopening a session the user believes is closed.
    if (stateRef.current !== 'listening') return;
    const at = nowRef.current();
    lastFragmentAtRef.current = at;
    const startedAt = startedAtRef.current ?? at;
    const id = nextIdRef.current++;
    setFragments(list => [...list, { id, text: trimmed, atMs: at - startedAt }]);
  }, []);

  const reset = useCallback(() => {
    setDiscardPending(false);
    setError(null);
    clearBuffer('discard');
    stateRef.current = 'idle';
    setState('idle');
  }, [clearBuffer]);

  /**
   * ACCOUNT-SWITCH PURGE. The shared-gym-tablet guarantee: trainer A starts a
   * session, the account switches, trainer B must see nothing. Skips the first
   * run so mounting with an account does not wipe a buffer being restored.
   */
  const lastAccountRef = useRef<string | number | null>(accountKey);
  useEffect(() => {
    if (lastAccountRef.current === accountKey) return;
    lastAccountRef.current = accountKey;
    clearBuffer('account-switch');
    setDiscardPending(false);
    stateRef.current = 'idle';
    setState('idle');
  }, [accountKey, clearBuffer]);

  /** TTL purge. Checked on tick rather than by timer so a slept device is caught. */
  useEffect(() => {
    if (state === 'idle' || state === 'discarded') return;
    const id = setInterval(() => {
      const startedAt = startedAtRef.current;
      if (startedAt !== null && nowRef.current() - startedAt > ttlMs) {
        clearBuffer('ttl');
        stateRef.current = 'idle';
        setState('idle');
        return;
      }
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [state, ttlMs, clearBuffer]);

  /** Unmount purges: a buffer must not outlive the surface that owns it. */
  useEffect(() => () => { clearBuffer('unmount'); }, [clearBuffer]);

  /**
   * Elapsed freezes at the moment of stop. Previously `at` was always `now()` and
   * the 1s ticker kept running in 'stopped', so "Talking 4:12" carried on climbing
   * next to "Finished — 240 words captured".
   */
  const at = stoppedAtRef.current ?? now();
  const startedAt = startedAtRef.current;
  const pausedSpan = pausedAtRef.current !== null ? at - pausedAtRef.current : 0;
  const elapsedMs = startedAt === null
    ? 0
    : Math.max(0, at - startedAt - pausedTotalRef.current - pausedSpan);
  const sinceLastFragmentMs = lastFragmentAtRef.current === null
    ? 0
    : Math.max(0, at - lastFragmentAtRef.current);

  const wordCount = useMemo(
    () => fragments.reduce((sum, f) => sum + f.text.split(/\s+/).filter(Boolean).length, 0),
    [fragments],
  );

  return {
    state,
    fragments,
    elapsedMs,
    sinceLastFragmentMs,
    wordCount,
    error,
    isActive: state === 'listening' || state === 'paused',
    canResume: state === 'paused',
    discardPending,
    start,
    pause,
    resume,
    stop,
    requestDiscard,
    cancelDiscard,
    discard,
    appendFragment,
    reset,
  };
}
