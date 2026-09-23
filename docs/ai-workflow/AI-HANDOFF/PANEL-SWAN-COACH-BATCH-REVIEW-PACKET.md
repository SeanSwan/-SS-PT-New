# Multi-model hostile review — Swan Coach freestyle batch

You are one of several independent reviewers. Do NOT be agreeable. Your value is finding what
the others miss. Look for: BUGS, ERRORS, SECURITY/PRIVACY holes, and concrete ENHANCEMENTS.

## Product context
SwanStudios is a production personal-training SaaS. Sean is a working trainer who uses this on a
gym floor, on a phone, hands busy. The feature being built is FREESTYLE DICTATION: he talks for
up to ten minutes about several clients, several days, several record types - rambling, correcting
himself - and Coach turns it into a clean structured summary he confirms before anything is written.

## Ratified rules (decided by the owner - do not relitigate, but DO flag if the code violates them)
- Contradictions: latest-wins with a collapsible trace. Never silently discard the earlier value.
- Future-dated items: always route to a plan edit, NEVER a workout log. Not even behind a flag.
- Duplicate dates: a merge/append proposal, not a failure.
- Unplaceable fragments: become a clarification item, never dropped.
- ZERO PII to models. Names tokenised client-side; only IDs/roles leave the device.
- Retention: audio NEVER persisted server-side; TTL <=24h; account-keyed; encrypted; purge on
  discard/logout/account-switch/TTL/unmount.

## Design constraints
- styled-components only, NO Material-UI. Dark-first.
- Palette: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0 (glow/accent),
  Arctic Cyan #50A0F0 (CHARTS ONLY - never buttons/glow), Gilded Fern #C6A84B (gold; RESTRICTED
  to a PR numeral, a <=1px filigree, a focus ring, or ONE badge per scene), Frost White #E0ECF4,
  Obsidian #0A0A0F, Carbon #141419, Graphite #1A1A24, Wing Purple #8B5CF6.
- Dual-Button Glow: blue bg -> purple glow; purple bg -> cyan glow.
- 44px min touch targets. WCAG 4.5:1. prefers-reduced-motion honoured.
- RETIRED palette, any use is a defect: #0a0a1a, #00FFFF, #7851A9.
- Never say 'AI' in user-facing copy - it is 'Swan Coach'. Never 'yoga'/'meditation'.

## What is already known and does NOT need restating
- useVoiceRecorder has no useEffect at all, so it never released the MediaStream. That is why
  useCoachCapture exists.
- One guard in useCoachCapture is knowingly uncovered by tests (labelled in-code): the
  passive-effect race cannot be reproduced under act() in jsdom.
- S2 is write-free BY DESIGN. Consolidation and apply are later slices.

## YOUR REMIT
Rank findings worst-first. Cite exact identifiers/lines. For each: what breaks, under what
conditions, and the concrete fix. Then a section 'ENHANCEMENTS' - what would make this
materially better for a trainer using it one-handed mid-session, that nobody has thought of.
Finally 'WHAT I WOULD ATTACK' - if you wanted to extract client data from this feature or make
it lose a session, how would you do it?
No praise sections. If something is fine, one line.


### FILE: frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachCapture.ts
```ts
/**
 * ============================================================================
 * FILE: useCoachCapture.ts
 * PURPOSE: Single entry point for the RECORD capture pipeline beneath Swan Coach.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-16
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Coach had two independent capture pipelines and no shared lifecycle policy:
 *
 *   Pipeline LIVE    useCoachBrowserSpeechInput  — Web Speech API, interim text
 *                                                  straight into a field.
 *   Pipeline RECORD  useVoiceRecorder            — MediaRecorder → Blob,
 *                    → useGeminiTranscription      then server-side transcript.
 *
 * These are NOT redundant implementations of one thing. LIVE shows words as you
 * speak but is restart-limited on iOS Safari for long sessions; RECORD survives
 * long-form capture and produces the authoritative transcript but shows nothing
 * while running. Freestyle dictation will need both. This hook owns RECORD only —
 * LIVE stays with `useCoachBrowserSpeechInput` until freestyle needs them together.
 *
 * What was missing — verified by grep, not assumed — is any lifecycle policy.
 * `useVoiceRecorder` contains no `useEffect` at all, so it never releases the
 * MediaStream on unmount, and nothing anywhere listened for `visibilitychange` or
 * `pagehide`. A capture survived tab-hide, screen lock, and in-app navigation with
 * the microphone still open. Closing that is what the freestyle retention contract
 * requires (docs/ai-workflow/AI-HANDOFF/SWAN-COACH-FREESTYLE-RETENTION-CONTRACT-2026-08-16.md).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceRecorder } from './useVoiceRecorder';
import { useGeminiTranscription } from './useGeminiTranscription';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export type CaptureStatus =
  | 'idle'
  | 'requesting'   // waiting on the mic permission prompt
  | 'capturing'
  | 'ready'        // capture finished, audio held, not yet transcribed
  | 'transcribing'
  | 'done'
  | 'error';

/** Why capture ended. `auto-*` means the lifecycle policy stopped it, not the user. */
export type CaptureStopReason = 'user' | 'auto-hidden' | 'auto-unmount';

export interface UseCoachCaptureReturn {
  status: CaptureStatus;
  duration: number;
  /** Raw audio, available once capture stops. Feed to `transcribe()`. */
  audioBlob: Blob | null;
  /** Authoritative transcript, populated after `transcribe()` resolves. */
  transcript: string;
  error: string | null;
  /** True when the last stop came from the lifecycle policy rather than the user. */
  stoppedAutomatically: boolean;
  start: () => Promise<void>;
  stop: () => void;
  transcribe: () => Promise<string>;
  reset: () => void;
  /** Clears an auto-stop notice without discarding a usable capture. */
  dismissNotice: () => void;
}

export const CAPTURE_PERMISSION_DENIED_COPY =
  'Swan Coach needs microphone access to hear you. Enable it in your browser settings, then try again.';

export const CAPTURE_AUTO_STOPPED_COPY =
  'Recording stopped because you left this screen. Nothing was saved.';

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useCoachCapture(): UseCoachCaptureReturn {
  const recorder = useVoiceRecorder();
  const transcription = useGeminiTranscription();

  const [stoppedAutomatically, setStoppedAutomatically] = useState(false);
  const [autoStopCopy, setAutoStopCopy] = useState<string | null>(null);

  /**
   * Latches a stop request from the moment it is issued until a new capture
   * begins. This is NOT merely a re-entry guard — it is what closes the
   * permission-prompt hole.
   *
   * `stop()` during `requesting` cannot cancel an in-flight `getUserMedia`:
   * `useVoiceRecorder` exposes no AbortController, so there is nothing to abort.
   * The user can therefore grant permission AFTER the page is hidden, the
   * recorder transitions to `recording`, and the microphone goes live on a hidden
   * page while the UI claims it stopped. The latch lets the effect below catch
   * that late arrival and stop it immediately.
   *
   * It also survives passive-effect timing. `visibilitychange` and `pagehide` are
   * native listeners; React does not flush pending passive effects before them,
   * so a state mirror can lag a commit behind. A latch written synchronously
   * inside `stop` cannot.
   */
  const stopRequestedRef = useRef(false);

  /**
   * Mirrors recorder state for the native listeners, which cannot read React
   * state without capturing a stale closure.
   */
  const isCapturingRef = useRef(false);
  useEffect(() => {
    /**
     * NOT COVERED BY TESTS — kept on reasoning, and labelled so nobody mistakes
     * it for verified behaviour. Removing this line kills no test in the suite.
     *
     * The argument for keeping it: `visibilitychange` and `pagehide` are native
     * listeners, and React does not flush pending passive effects before those.
     * So in a real browser this effect can run with a pre-stop snapshot of
     * `recorder.state` AFTER `stop()` already cleared the flag, resurrecting it
     * and letting the next lifecycle event stop an already-stopping recorder —
     * which throws InvalidStateError from inside a native handler.
     *
     * The reason no test covers it: under `act()` in jsdom, effects flush
     * synchronously, so the interleaving simply cannot occur in this harness.
     * Proving it needs a real browser (Playwright), not a better unit test.
     */
    if (stopRequestedRef.current) return;
    isCapturingRef.current = recorder.state === 'recording' || recorder.state === 'requesting';
  }, [recorder.state]);

  // Collaborator methods are read through refs so callbacks below stay stable.
  const recorderStopRef = useRef(recorder.stop);
  recorderStopRef.current = recorder.stop;
  const recorderStartRef = useRef(recorder.start);
  recorderStartRef.current = recorder.start;
  const recorderResetRef = useRef(recorder.reset);
  recorderResetRef.current = recorder.reset;
  const transcriptionRef = useRef(transcription);
  transcriptionRef.current = transcription;

  const stopInternal = useCallback((reason: CaptureStopReason) => {
    if (stopRequestedRef.current || !isCapturingRef.current) return;
    stopRequestedRef.current = true;
    isCapturingRef.current = false;
    if (reason !== 'user') {
      setStoppedAutomatically(true);
      setAutoStopCopy(CAPTURE_AUTO_STOPPED_COPY);
    }
    recorderStopRef.current();
  }, []);

  /** Public stop cannot forge an automatic reason. */
  const stop = useCallback(() => { stopInternal('user'); }, [stopInternal]);

  /**
   * Late-arrival guard. If the permission prompt resolves after we asked to
   * stop, the recorder starts anyway. Stop it the moment that happens —
   * without this, the hook's headline promise is false in its most important case.
   */
  useEffect(() => {
    if (stopRequestedRef.current && recorder.state === 'recording') {
      recorderStopRef.current();
    }
  }, [recorder.state]);

  /**
   * LIFECYCLE POLICY — the reason this hook exists.
   *
   * `visibilitychange` covers tab switch, app background, and screen lock.
   * `pagehide` covers navigation and bfcache eviction; it is used instead of
   * `beforeunload`, which iOS Safari does not fire reliably. Unmount covers
   * in-app route changes, which fire neither — and is the ONLY release path,
   * because `useVoiceRecorder` has no cleanup of its own.
   *
   * `stopInternal` has empty deps and is therefore stable, so these listeners
   * register once and the cleanup runs only on real unmount. If it ever gains a
   * dependency, this cleanup starts firing every render and will silently kill
   * live captures.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') stopInternal('auto-hidden');
    };
    const onPageHide = () => stopInternal('auto-hidden');

    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      stopInternal('auto-unmount');
    };
  }, [stopInternal]);

  const start = useCallback(async () => {
    if (isCapturingRef.current) return;   // no double permission prompts
    stopRequestedRef.current = false;
    setStoppedAutomatically(false);
    setAutoStopCopy(null);
    transcriptionRef.current.reset();
    await recorderStartRef.current();
  }, []);

  const transcribe = useCallback(async () => {
    const blob = recorder.audioBlob;
    if (!blob) return '';
    return transcriptionRef.current.transcribe(blob);
  }, [recorder.audioBlob]);

  const reset = useCallback(() => {
    stopInternal('user');
    stopRequestedRef.current = false;
    isCapturingRef.current = false;
    setStoppedAutomatically(false);
    setAutoStopCopy(null);
    recorderResetRef.current();
    transcriptionRef.current.reset();
  }, [stopInternal]);

  const dismissNotice = useCallback(() => setAutoStopCopy(null), []);

  // Map the two underlying machines onto one status.
  let status: CaptureStatus = 'idle';
  if (recorder.state === 'error' || transcription.state === 'error') status = 'error';
  else if (recorder.state === 'requesting') status = 'requesting';
  else if (recorder.state === 'recording') status = 'capturing';
  else if (transcription.state === 'transcribing') status = 'transcribing';
  else if (transcription.state === 'done') status = 'done';
  // A stopped recorder holding audio is NOT idle. Without this the consumer
  // cannot tell "finished, awaiting transcription" from "never started", and
  // has to re-derive it from audioBlob presence.
  else if (recorder.state === 'stopped' && recorder.audioBlob) status = 'ready';

  /**
   * A real error outranks the auto-stop notice. The reverse precedence would let
   * "you left this screen" mask a permission revocation discovered afterwards,
   * sending the user round a retry loop with the wrong explanation.
   */
  const rawError = recorder.error ?? transcription.error ?? null;
  const mappedError = rawError && /permission|denied|notallowed/i.test(rawError)
    ? CAPTURE_PERMISSION_DENIED_COPY
    : rawError;
  const error = mappedError ?? autoStopCopy;

  return {
    status,
    duration: recorder.duration,
    audioBlob: recorder.audioBlob,
    transcript: transcription.text,
    error,
    stoppedAutomatically,
    start,
    stop,
    transcribe,
    reset,
    dismissNotice,
  };
}
```

### FILE: frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts
```ts
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
    stateRef.current = 'discarded';
    setState('discarded');
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

  const at = now();
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
```

### FILE: frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx
```ts
/**
 * FILE: CoachFreestyleOverlay.tsx
 * PURPOSE: The listening surface for freestyle dictation — "just talk".
 * PARENTS: Coach command surfaces (mounted behind a flag until S4 lands).
 * STATE: Delegates entirely to useFreestyleSession; holds no buffer of its own.
 *
 * WHAT THIS SCREEN IS FOR
 * -----------------------
 * Sean talks for up to ten minutes on a gym floor with his hands busy. The screen's
 * only jobs are: prove Coach is still hearing him, stay out of the way, and never
 * lose the session to a mis-tap. It shows counters, not a transcript — reading back
 * ten minutes of text mid-session is not something anyone does.
 *
 * WRITE-FREE (S2). This surface cannot save anything. Stopping hands the buffer to
 * consolidation (S4), which does not exist yet, so `onStopped` is currently the end
 * of the road. That boundary is deliberate: a bug here can lose a draft, never
 * corrupt a client's record.
 */
import React, { useCallback, useEffect } from 'react';
import { Mic, Pause, Play, Check, Trash2, X } from 'lucide-react';
import { useFreestyleSession, type FreestyleFragment } from './hooks/useFreestyleSession';
import {
  FreestyleOverlay,
  SignalStrip,
  SignalItem,
  SignalValue,
  SignalLabel,
  Stage,
  BreathOrb,
  LivePhrase,
  StatusLine,
  ControlRow,
  ControlButton,
  DiscardConfirm,
  DiscardCopy,
} from './CoachFreestyleOverlay.styles';

interface CoachFreestyleOverlayProps {
  isOpen: boolean;
  /** Account that owns the buffer. A change purges it — shared-tablet guarantee. */
  accountKey: string | number | null;
  onClose: () => void;
  /** Handed the captured fragments when the user finishes. S4 consumes this. */
  onStopped?: (fragments: FreestyleFragment[]) => void;
}

const formatElapsed = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const CoachFreestyleOverlay: React.FC<CoachFreestyleOverlayProps> = ({
  isOpen,
  accountKey,
  onClose,
  onStopped,
}) => {
  const session = useFreestyleSession({ accountKey });

  const {
    state, fragments, elapsedMs, sinceLastFragmentMs, wordCount,
    discardPending, start, pause, resume, stop,
    requestDiscard, cancelDiscard, discard, reset,
  } = session;

  useEffect(() => {
    if (isOpen && state === 'idle') start();
  }, [isOpen, state, start]);

  const handleStop = useCallback(() => {
    stop();
    onStopped?.(fragments);
  }, [stop, onStopped, fragments]);

  const handleDiscard = useCallback(() => {
    discard();
    onClose();
  }, [discard, onClose]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  /**
   * Escape arms the discard rather than performing it. A stray key must not
   * destroy ten minutes of work — the same reasoning as the two-step control.
   */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (discardPending) cancelDiscard();
      else if (fragments.length > 0) requestDiscard();
      else handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, discardPending, fragments.length, cancelDiscard, requestDiscard, handleClose]);

  const isListening = state === 'listening';
  const isPaused = state === 'paused';
  const isStopped = state === 'stopped';

  /** After ~4s of silence, say so — otherwise silence reads as "it broke". */
  const quietFor = Math.floor(sinceLastFragmentMs / 1000);
  const isQuiet = isListening && fragments.length > 0 && quietFor >= 4;

  const latestPhrase = fragments.length > 0 ? fragments[fragments.length - 1].text : '';

  return (
    <FreestyleOverlay $isOpen={isOpen} role="dialog" aria-modal="true" aria-label="Freestyle dictation">
      <SignalStrip aria-live="off">
        <SignalItem>
          <SignalValue>{formatElapsed(elapsedMs)}</SignalValue>
          <SignalLabel>Talking</SignalLabel>
        </SignalItem>
        <SignalItem>
          <SignalValue>{wordCount}</SignalValue>
          <SignalLabel>Words</SignalLabel>
        </SignalItem>
        <SignalItem>
          <SignalValue>{fragments.length}</SignalValue>
          <SignalLabel>Fragments</SignalLabel>
        </SignalItem>
      </SignalStrip>

      <Stage>
        <BreathOrb $listening={isListening} aria-hidden="true" />

        {latestPhrase && <LivePhrase>{latestPhrase}</LivePhrase>}

        {/*
          One polite live region carries the whole status. Announcing every
          fragment would make a screen reader unusable during dictation.
        */}
        <StatusLine role="status" aria-live="polite" $muted={!isListening}>
          {isListening && !isQuiet && 'Listening. Talk as long as you need — nothing is saved yet.'}
          {isListening && isQuiet && `Still listening. Nothing heard for ${quietFor}s.`}
          {isPaused && 'Paused. Nothing is being heard.'}
          {isStopped && `Finished — ${wordCount} words captured. Nothing has been saved yet.`}
          {state === 'discarded' && 'Session discarded. Nothing was saved.'}
        </StatusLine>
      </Stage>

      {discardPending ? (
        <DiscardConfirm role="alertdialog" aria-label="Confirm discard">
          <DiscardCopy>
            Discard this session? {wordCount} words will be deleted and cannot be recovered.
          </DiscardCopy>
          <ControlRow>
            <ControlButton type="button" onClick={cancelDiscard} aria-label="Keep the session">
              <X size={18} aria-hidden="true" /> Keep it
            </ControlButton>
            <ControlButton type="button" $variant="danger" onClick={handleDiscard} aria-label="Confirm discard">
              <Trash2 size={18} aria-hidden="true" /> Discard
            </ControlButton>
          </ControlRow>
        </DiscardConfirm>
      ) : (
        <ControlRow>
          {isListening && (
            <ControlButton type="button" onClick={pause} aria-label="Pause listening">
              <Pause size={18} aria-hidden="true" /> Pause
            </ControlButton>
          )}

          {isPaused && (
            <ControlButton type="button" onClick={resume} aria-label="Resume listening">
              <Play size={18} aria-hidden="true" /> Resume
            </ControlButton>
          )}

          {(isListening || isPaused) && (
            <ControlButton type="button" $variant="primary" onClick={handleStop} aria-label="Finish and review">
              <Check size={18} aria-hidden="true" /> Done
            </ControlButton>
          )}

          {isStopped && (
            <ControlButton type="button" $variant="primary" onClick={handleClose} aria-label="Close">
              <Check size={18} aria-hidden="true" /> Close
            </ControlButton>
          )}

          {fragments.length > 0 && !isStopped && (
            <ControlButton type="button" $variant="danger" onClick={requestDiscard} aria-label="Discard session">
              <Trash2 size={18} aria-hidden="true" /> Discard
            </ControlButton>
          )}

          {fragments.length === 0 && !isStopped && (
            <ControlButton type="button" onClick={handleClose} aria-label="Cancel">
              <X size={18} aria-hidden="true" /> Cancel
            </ControlButton>
          )}
        </ControlRow>
      )}

      {!isListening && !isPaused && !isStopped && state !== 'discarded' && (
        <ControlRow>
          <ControlButton type="button" $variant="primary" onClick={start} aria-label="Start talking">
            <Mic size={18} aria-hidden="true" /> Start talking
          </ControlButton>
        </ControlRow>
      )}
    </FreestyleOverlay>
  );
};

export default CoachFreestyleOverlay;
```

### FILE: frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.styles.ts
```ts
/**
 * FILE: CoachFreestyleOverlay.styles.ts
 * PURPOSE: Styling for the freestyle dictation listening surface.
 *
 * DESIGN INTENT
 * -------------
 * This screen is looked at for ten minutes while Sean talks on a gym floor with
 * his hands busy. It is therefore a CALM surface, not a showpiece: one slow
 * breathing signal, generous type, controls in the thumb arc, and nothing that
 * moves for decoration. Coach Command is a calm zone — response motion only, no
 * ambient loop, no signature flourish (Swan V3 UX contract).
 *
 * Palette is Crystalline Swan via tokens with fallbacks. Gold is not used here at
 * all: the gold law reserves it for a PR numeral, a 1px filigree, a focus ring, or
 * one badge per scene, and a listening screen earns none of those.
 */
import styled, { keyframes, css } from 'styled-components';

/** One slow breath. Deliberately not a pulse — this runs for minutes. */
const breathe = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50%      { transform: scale(1.06); opacity: 0.9; }
`;

const motionSafe = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

export const FreestyleOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent);
  backdrop-filter: blur(14px);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.25s ease;
  padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
  ${motionSafe}
`;

/** Counters live at the top, out of the thumb arc — read, never pressed. */
export const SignalStrip = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  width: 100%;
  max-width: 560px;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 80%, transparent);
`;

export const SignalItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
`;

export const SignalValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  font-variant-numeric: tabular-nums;
`;

export const SignalLabel = styled.span`
  font-family: 'Sora', sans-serif;
  /* 12px floor for micro-type, matching the messaging surface. */
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
`;

export const Stage = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  width: 100%;
`;

export const BreathOrb = styled.div<{ $listening: boolean }>`
  width: 128px;
  height: 128px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 45%,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent),
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent) 70%,
    transparent 72%
  );
  ${({ $listening }) => $listening && css`
    animation: ${breathe} 4s ease-in-out infinite;
  `}
  ${motionSafe}
`;

/**
 * The live phrase. Bounded height so a long session cannot push the controls
 * off-screen — the transcript is reviewable later; what matters here is
 * confirmation that Coach is still hearing you.
 */
export const LivePhrase = styled.p`
  margin: 0;
  max-width: 560px;
  max-height: 6.5rem;
  overflow: hidden;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 1.0625rem;
  line-height: 1.5;
  color: var(--text-primary, #E0ECF4);
`;

export const StatusLine = styled.p<{ $muted?: boolean }>`
  margin: 0;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  color: ${({ $muted }) =>
    $muted
      ? 'var(--text-muted, rgba(224, 236, 244, 0.7))'
      : 'var(--text-primary, #E0ECF4)'};
`;

/** Controls sit at the bottom: one-handed reach on a phone held mid-session. */
export const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  width: 100%;
  max-width: 560px;
`;

export const ControlButton = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 52px;
  min-width: 52px;
  padding: 0 1.25rem;
  border-radius: 14px;
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  ${({ $variant = 'ghost' }) => {
    if ($variant === 'primary') {
      return css`
        /* Blue background throws a purple glow — Dual-Button Glow law. */
        background: var(--bg-primary, #002060);
        border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
        color: var(--text-primary, #E0ECF4);
        &:hover {
          box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
        }
      `;
    }
    if ($variant === 'danger') {
      return css`
        background: color-mix(in srgb, var(--danger-text, #C92A54) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--danger-text, #C92A54) 38%, transparent);
        /* Soft danger value for TEXT: the saturated one fails 4.5:1 on dark. */
        color: var(--danger-soft-text, #FF8FA3);
        &:hover {
          background: color-mix(in srgb, var(--danger-text, #C92A54) 22%, transparent);
        }
      `;
    }
    return css`
      background: transparent;
      border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
      color: var(--text-primary, #E0ECF4);
      &:hover {
        background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
      }
    `;
  }}

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  ${motionSafe}
`;

/** Discard confirmation. Deliberately interrupts — it destroys real work. */
export const DiscardConfirm = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 560px;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--danger-text, #C92A54) 34%, transparent);
  background: color-mix(in srgb, var(--danger-text, #C92A54) 10%, var(--bg-surface, #1A1A24));
`;

export const DiscardCopy = styled.p`
  margin: 0;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.9375rem;
  color: var(--text-primary, #E0ECF4);
`;
```
