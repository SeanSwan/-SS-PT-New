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
  /** Monotonic id; not a database key. S3 must mint its own keys. */
  id: number;
  text: string;
  /**
   * ms of ACTIVE session time (paused spans excluded) — the same clock as
   * `elapsedMs`. An earlier version measured wall time here, so a 3-minute
   * pause skewed every later fragment by 180s against the session clock S4
   * will order against. Relative, so no wall-clock leaves the device.
   */
  atMs: number;
}

/**
 * The immutable copy handed across the purge boundary when a session finishes.
 * Carries its owner so a shared-tablet parent can never associate one account's
 * words with another (the snapshot outlives every in-hook purge trigger —
 * expiry/persistence of THIS object is the S3 store's contract).
 */
export interface FreestyleSnapshot {
  fragments: readonly FreestyleFragment[];
  wordCount: number;
  elapsedMs: number;
  /** Owner at the moment of stop. */
  accountKey: string | null;
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

export type FreestylePurgeReason =
  | 'discard'
  | 'account-switch'
  | 'logout'
  | 'ttl'
  | 'unmount'
  /** A session that ran to completion and was closed — NOT a discard. */
  | 'completed';

export interface UseFreestyleSessionReturn extends FreestyleSessionSnapshot {
  isActive: boolean;
  canResume: boolean;
  /** Legal only from 'idle'/'error'. A live or stopped session is never wiped by start. */
  start: () => void;
  pause: () => void;
  resume: () => void;
  /**
   * Ends capture and returns the frozen, owner-stamped snapshot — or null if
   * there was nothing to stop. Built from refs at the moment of the call, so it
   * includes fragments flushed synchronously just beforehand (a render-closure
   * copy missed exactly those).
   */
  stop: () => FreestyleSnapshot | null;
  /** Two-step by design — see `discard`. */
  requestDiscard: () => void;
  cancelDiscard: () => void;
  discardPending: boolean;
  /** No-ops unless armed via `requestDiscard` — the two-step lives in the HOOK, not the UI. */
  discard: () => void;
  appendFragment: (text: string) => void;
  /** Marks the session failed (mic denied, engine dead). Buffer is KEPT — words already heard survive the failure. */
  fail: (message: string) => void;
  /** `reason` is receipted verbatim; do not collapse everything into 'discard'. */
  reset: (reason?: FreestylePurgeReason) => void;
}

export const FREESTYLE_TTL_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useFreestyleSession(
  options: UseFreestyleSessionOptions,
): UseFreestyleSessionReturn {
  const { accountKey, ttlMs = FREESTYLE_TTL_MS, now = Date.now, onPurge } = options;

  /**
   * `"42"` and `42` must be the SAME owner — they arrive from different auth
   * surfaces for the same account, and treating them as distinct keys would
   * make an account "switch" (and purge) out of a type coercion.
   */
  const ownerKey = accountKey === null ? null : String(accountKey);

  /**
   * The contract's 24h ceiling is a CEILING. A caller-supplied ttl above it
   * (or Infinity/NaN/negative) must not extend retention.
   */
  const effectiveTtlMs =
    Number.isFinite(ttlMs) && ttlMs > 0 ? Math.min(ttlMs, FREESTYLE_TTL_MS) : FREESTYLE_TTL_MS;

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
   * Synchronous mirror of `fragments`. `stop()` builds its snapshot from THIS,
   * not from a render closure — a flush that appended a fragment a microtask
   * ago is invisible to the closure but present here.
   */
  const fragmentsRef = useRef<FreestyleFragment[]>([]);
  /** Synchronous mirror of `discardPending` so `discard()` can enforce the two-step. */
  const discardPendingRef = useRef(false);
  /** Current owner — stamped onto the stop() snapshot; drives the switch/logout purge. */
  const ownerRef = useRef<string | null>(ownerKey);

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

  /** The ONE place refs are wiped — `start` and `clearBuffer` used to duplicate this list, a drift bug waiting. */
  const wipeRefs = useCallback(() => {
    fragmentsRef.current = [];
    setFragments([]);
    startedAtRef.current = null;
    pausedTotalRef.current = 0;
    pausedAtRef.current = null;
    lastFragmentAtRef.current = null;
    stoppedAtRef.current = null;
    nextIdRef.current = 1;
  }, []);

  const clearBuffer = useCallback((reason: FreestylePurgeReason) => {
    /**
     * Receipt ONLY when words existed. Receipting empty wipes (mount cycles,
     * unmount-after-reset, StrictMode replay) put fictional destruction events
     * in the audit — a log that cries wolf protects nothing.
     */
    const hadData = fragmentsRef.current.length > 0;
    wipeRefs();
    if (hadData) onPurgeRef.current?.(reason);
  }, [wipeRefs]);

  const start = useCallback(() => {
    /**
     * Start is NOT a wipe — from ANY state. 'listening'/'paused': no restarting
     * a live session. 'stopped': no destroying a held buffer. 'error' WITH
     * retained words: also refused — an earlier version receipted-and-wiped
     * here, which let one tap on "Start talking" after a mic failure destroy
     * captured words without the two-step discard this hook itself enforces
     * (Codex, round 2). From error-with-words the caller must go through Done
     * or a confirmed discard first.
     */
    const s = stateRef.current;
    if (s !== 'idle' && s !== 'error') return;
    if (s === 'error' && fragmentsRef.current.length > 0) return;
    wipeRefs();
    setError(null);
    setDiscardPending(false);
    discardPendingRef.current = false;
    startedAtRef.current = nowRef.current();
    stateRef.current = 'listening';
    setState('listening');
  }, [clearBuffer, wipeRefs]);

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

  const stop = useCallback((): FreestyleSnapshot | null => {
    const s = stateRef.current;
    // 'error' is stoppable too: a failed session with heard words must still be
    // able to hand its buffer off — the mic dying should not hold words hostage.
    if (s !== 'listening' && s !== 'paused' && s !== 'error') return null;
    settlePause();
    // A failed session already froze its clock in fail(); keep that timestamp.
    const stoppedAt = stoppedAtRef.current ?? nowRef.current();
    stoppedAtRef.current = stoppedAt;
    stateRef.current = 'stopped';
    setState('stopped');
    // Built from refs, not render state: fragments flushed synchronously before
    // this call are here; the render closure is one commit behind.
    const list = fragmentsRef.current;
    const startedAt = startedAtRef.current ?? stoppedAt;
    return Object.freeze({
      fragments: Object.freeze(list.map(f => Object.freeze({ ...f }))),
      wordCount: list.reduce((sum, f) => sum + f.text.split(/\s+/).filter(Boolean).length, 0),
      elapsedMs: Math.max(0, stoppedAt - startedAt - pausedTotalRef.current),
      accountKey: ownerRef.current,
    });
  }, [settlePause]);

  /**
   * Discard is two-step on purpose, and the hook itself enforces it: a
   * ten-minute session represents real work that cannot be recovered, so a
   * single mis-tap — or a single stray API call — must not destroy it.
   * `requestDiscard` arms, `discard` commits, `cancelDiscard` backs out, and
   * an armed discard DISARMS ITSELF after 10s so a stray tap minutes later
   * cannot confirm a destruction nobody remembers arming.
   */
  const requestDiscard = useCallback(() => {
    discardPendingRef.current = true;
    setDiscardPending(true);
    /**
     * Arming INTERRUPTS capture. While the confirm asks "delete this?", the
     * microphone must not keep filling the very buffer under judgment — an
     * aside spoken during the decision landed in the kept session (Codex,
     * round 3). Backing out leaves the session paused; resuming is an explicit
     * gesture, which iOS requires to re-arm the engine anyway.
     */
    if (stateRef.current === 'listening') {
      pausedAtRef.current = nowRef.current();
      stateRef.current = 'paused';
      setState('paused');
    }
  }, []);
  const cancelDiscard = useCallback(() => {
    discardPendingRef.current = false;
    setDiscardPending(false);
  }, []);

  useEffect(() => {
    if (!discardPending) return;
    const id = setTimeout(() => {
      discardPendingRef.current = false;
      setDiscardPending(false);
    }, 10_000);
    return () => clearTimeout(id);
  }, [discardPending]);

  const discard = useCallback(() => {
    if (!discardPendingRef.current) return;   // two-step enforced HERE, not in the UI
    discardPendingRef.current = false;
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

  /**
   * The failure path (mic denied, engine dead, unsupported browser). KEEPS the
   * buffer: five minutes of heard words must survive the mic dying. Without a
   * reachable 'error' state the session stayed 'listening' over a dead engine
   * and the quiet counter narrated a lie ("Still listening. Nothing heard for
   * 47s") appended to the denial copy.
   */
  const fail = useCallback((message: string) => {
    const s = stateRef.current;
    if (s !== 'listening' && s !== 'paused') return;
    settlePause();
    stoppedAtRef.current = nowRef.current();
    setError(message);
    stateRef.current = 'error';
    setState('error');
  }, [settlePause]);

  const appendFragment = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;               // never store empty interim noise
    // Fragments arriving while paused or stopped are dropped rather than
    // silently reopening a session the user believes is closed. (Paused-window
    // finals are the SURFACE's responsibility: it flushes the engine BEFORE
    // asking the session to pause — see CoachFreestyleOverlay.)
    if (stateRef.current !== 'listening') return;
    const at = nowRef.current();
    lastFragmentAtRef.current = at;
    const startedAt = startedAtRef.current ?? at;
    const id = nextIdRef.current++;
    // Active time, same clock as elapsedMs. Fragments cannot arrive while
    // paused (guard above), so the open pause span is always zero here.
    const atMs = Math.max(0, at - startedAt - pausedTotalRef.current);
    const next = [...fragmentsRef.current, { id, text: trimmed, atMs }];
    fragmentsRef.current = next;        // sync mirror FIRST — stop() reads it
    setFragments(next);
  }, []);

  const reset = useCallback((reason: FreestylePurgeReason = 'completed') => {
    discardPendingRef.current = false;
    setDiscardPending(false);
    setError(null);
    // Receipt the real reason. Every close used to be logged as a discard, which
    // made the retention audit fiction.
    clearBuffer(reason);
    stateRef.current = 'idle';
    setState('idle');
  }, [clearBuffer]);

  /**
   * ACCOUNT-SWITCH PURGE. The shared-gym-tablet guarantee: trainer A starts a
   * session, the account switches, trainer B must see nothing. Skips the first
   * run so mounting with an account does not wipe a buffer being restored.
   * A transition TO null is a logout and is receipted as one — collapsing it
   * into 'account-switch' hid every logout from the audit.
   */
  useEffect(() => {
    if (ownerRef.current === ownerKey) return;
    const wasOwned = ownerRef.current !== null;
    ownerRef.current = ownerKey;
    clearBuffer(wasOwned && ownerKey === null ? 'logout' : 'account-switch');
    discardPendingRef.current = false;
    setDiscardPending(false);
    stateRef.current = 'idle';
    setState('idle');
  }, [ownerKey, clearBuffer]);

  /** True when the buffer has outlived its ceiling. `>=`: AT the boundary is expired. */
  const isExpired = useCallback(() => {
    const startedAt = startedAtRef.current;
    return startedAt !== null && nowRef.current() - startedAt >= effectiveTtlMs;
  }, [effectiveTtlMs]);

  const purgeExpired = useCallback(() => {
    if (!isExpired()) return false;
    clearBuffer('ttl');
    // Disarm any pending discard: a confirm left armed over a purged buffer
    // offered to "delete" words that were already gone (Codex, round 4).
    discardPendingRef.current = false;
    setDiscardPending(false);
    stateRef.current = 'idle';
    setState('idle');
    return true;
  }, [isExpired, clearBuffer]);

  /** TTL purge. Checked on tick rather than by timer so a slept device is caught. */
  useEffect(() => {
    if (state === 'idle' || state === 'discarded') return;
    const id = setInterval(() => {
      if (purgeExpired()) return;
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [state, purgeExpired]);

  /**
   * Background tabs throttle/suspend intervals, so the 1s sweep alone lets
   * retention exceed the ceiling by however long the tab slept. Re-check the
   * moment the page becomes visible or focused again.
   */
  useEffect(() => {
    const onWake = () => { purgeExpired(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
  }, [purgeExpired]);

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
    fail,
    reset,
  };
}
