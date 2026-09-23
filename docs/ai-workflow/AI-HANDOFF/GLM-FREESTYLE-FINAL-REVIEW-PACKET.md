# GLM-5.3 — hostile review of the completed freestyle capture layer

Fable 5 previously returned SEND-BACK on an earlier version and found 6 defects. Four were
fixed then; the remaining two (F-2 deaf overlay, F-3 buffer handed out live) plus a
zero-PII hole Fable identified are addressed in this version. YOUR JOB: find what Fable and I
both still missed.

## The privacy decision embodied here
Fable found that the RECORD pipeline uploads recorded AUDIO to a server-side model, and that
audio contains client names spoken aloud. All text tokenisation is therefore irrelevant to it.
Freestyle now uses the Web Speech API instead: recognition happens through the browser/OS and
this app never creates, transmits, or stores an audio blob. Attack that reasoning.

## Constraints (violations are findings)
- ZERO PII to models. Retention: TTL <=24h, account-keyed, purge on discard/logout/switch/TTL/unmount.
- S2 is WRITE-FREE by construction. No apply path may exist here.
- 44px touch targets, WCAG 4.5:1, prefers-reduced-motion, styled-components only, no MUI.
- Palette: Ice Wing #60C0F0 accent, Arctic Cyan #50A0F0 CHARTS ONLY, gold #C6A84B RESTRICTED,
  Wing Purple #8B5CF6. Dual-Button Glow: blue bg -> purple glow, purple bg -> cyan glow.
- Never 'AI' in user-facing copy (it is Swan Coach). Never 'yoga'/'meditation'.

## Already known - do not re-report
- One guard in useCoachCapture is knowingly untested (labelled in-code): act() flushes the
  effect whose delay creates the window. Same for F-1's smoke-only test.
- Chrome's Web Speech recogniser may itself be cloud-backed. Disclosed, platform-level.
- 2 pre-existing suite failures unrelated to this work.

## YOUR REMIT
Worst-first. Cite identifiers. For each: what breaks, under what conditions, the concrete fix.
Then:
  ## SECURITY - what would you exploit to extract client data or make a session leak?
  ## RELIABILITY - what makes a real 10-minute gym-floor session fail or lose data?
  ## ENHANCEMENTS - what would materially help a trainer using this one-handed mid-session?
No praise. If something is right, one line.


### FILE: frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSpeech.ts
```ts
/**
 * ============================================================================
 * FILE: useFreestyleSpeech.ts
 * PURPOSE: On-device continuous speech capture for freestyle dictation.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-16
 * ============================================================================
 *
 * WHY ON-DEVICE, AND WHY THIS IS A PRIVACY DECISION
 * -------------------------------------------------
 * The other capture path (useCoachCapture → useGeminiTranscription) uploads the
 * recorded audio to a server-side model. For freestyle that is unacceptable: Sean
 * talks freely about real clients BY NAME, so the audio itself is PII-dense. Every
 * text-tokenisation scheme in this codebase protects the transcript and does
 * nothing for the audio — masking "Sarah" in text is pointless if the recording
 * says "Sarah" out loud.
 *
 * The Web Speech API performs recognition through the browser/OS. No audio blob is
 * created, uploaded, or persisted by this application. That is the whole reason
 * freestyle uses this path rather than the RECORD pipeline.
 *
 * (Browsers may themselves use a cloud recogniser — Chrome does. That is a
 * platform property outside this app's control and is disclosed in the retention
 * contract; what this hook guarantees is that SwanStudios never transmits or
 * stores the audio.)
 *
 * THE RESTART PROBLEM
 * -------------------
 * `continuous = true` is not honoured indefinitely. Browsers end a session after a
 * silence window — iOS Safari most aggressively — firing `onend` with no error. A
 * ten-minute dictation would therefore die silently after the first pause. This
 * hook restarts recognition transparently whenever it ends while the caller still
 * wants to listen, and reports `restarts` so the surface can prove it is alive.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Browser API shims
// ─────────────────────────────────────────────────────────────

interface SpeechResultAlternative { transcript: string }
interface SpeechResult {
  isFinal: boolean;
  0: SpeechResultAlternative;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface SpeechRecognitionErrorLike { error?: string }
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const FREESTYLE_SPEECH_UNSUPPORTED_COPY =
  'This browser cannot listen continuously. Use Chrome or Safari, or type your notes instead.';

export const FREESTYLE_SPEECH_DENIED_COPY =
  'Swan Coach needs microphone access to hear you. Enable it in your browser settings, then try again.';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface UseFreestyleSpeechOptions {
  /** Called for each FINAL phrase. Interim text is never sent here. */
  onPhrase: (text: string) => void;
  lang?: string;
}

export interface UseFreestyleSpeechReturn {
  supported: boolean;
  listening: boolean;
  /** Live partial phrase — display only, never stored. */
  interim: string;
  error: string | null;
  /** How many times recognition was transparently restarted. */
  restarts: number;
  start: () => void;
  stop: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useFreestyleSpeech(
  options: UseFreestyleSpeechOptions,
): UseFreestyleSpeechReturn {
  const { onPhrase, lang = 'en-US' } = options;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [restarts, setRestarts] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  /** What the CALLER wants. Distinct from whether the engine happens to be up. */
  const wantListeningRef = useRef(false);
  const onPhraseRef = useRef(onPhrase);
  onPhraseRef.current = onPhrase;

  const supported = getRecognitionCtor() !== null;

  const teardown = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try { rec.abort(); } catch { /* already dead */ }
    recognitionRef.current = null;
  }, []);

  const startEngine = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setError(FREESTYLE_SPEECH_UNSUPPORTED_COPY); return; }

    teardown();
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      // Start at resultIndex: earlier results were already emitted, and
      // re-reading them would duplicate every phrase on each event.
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += chunk;
        else interimText += chunk;
      }
      if (finalText.trim()) onPhraseRef.current(finalText.trim());
      setInterim(interimText);
    };

    rec.onerror = (event) => {
      const kind = event?.error ?? '';
      if (kind === 'not-allowed' || kind === 'service-not-allowed') {
        wantListeningRef.current = false;      // do not fight a denied permission
        setError(FREESTYLE_SPEECH_DENIED_COPY);
        setListening(false);
        return;
      }
      // 'no-speech' and 'aborted' are routine during a long dictation: the user
      // paused, or the engine cycled. Neither is an error worth showing.
    };

    rec.onend = () => {
      setInterim('');
      if (!wantListeningRef.current) { setListening(false); return; }
      /**
       * The engine ended but the user is still talking to us. Restart it.
       * Without this a ten-minute session dies at the first long pause, silently,
       * with the UI still claiming to listen.
       */
      setRestarts(n => n + 1);
      try { rec.start(); } catch { startEngine(); }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setError(null);
    } catch {
      // start() throws if an engine is already running; treat as already-live.
      setListening(true);
    }
  }, [lang, teardown]);

  const start = useCallback(() => {
    if (!supported) { setError(FREESTYLE_SPEECH_UNSUPPORTED_COPY); return; }
    if (wantListeningRef.current) return;
    wantListeningRef.current = true;
    setRestarts(0);
    startEngine();
  }, [supported, startEngine]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    setListening(false);
    setInterim('');
    teardown();
  }, [teardown]);

  /** Release the microphone on unmount — the engine will not stop itself. */
  useEffect(() => () => {
    wantListeningRef.current = false;
    teardown();
  }, [teardown]);

  return { supported, listening, interim, error, restarts, start, stop };
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
import { useFreestyleSpeech } from './hooks/useFreestyleSpeech';
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
  /**
   * Handed a FROZEN SNAPSHOT when the user finishes — never the live buffer.
   * Passing the session's own array let the parent keep a reference that survived
   * every purge trigger, which hollowed out the retention contract the moment
   * Done was tapped.
   */
  onStopped?: (snapshot: FreestyleSnapshot) => void;
}

/** An immutable copy handed across the purge boundary. */
export interface FreestyleSnapshot {
  fragments: readonly FreestyleFragment[];
  wordCount: number;
  elapsedMs: number;
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

  /**
   * Freestyle listens ON-DEVICE. It deliberately does not use the RECORD pipeline,
   * which uploads audio to a server-side model — audio in which Sean says real
   * client names out loud. Tokenising the transcript would not help.
   */
  const speech = useFreestyleSpeech({
    onPhrase: (text) => session.appendFragment(text),
  });

  const {
    state, fragments, elapsedMs, sinceLastFragmentMs, wordCount,
    discardPending, start, pause, resume, stop,
    requestDiscard, cancelDiscard, discard, reset,
  } = session;

  useEffect(() => {
    if (isOpen && state === 'idle') start();
  }, [isOpen, state, start]);

  /**
   * The engine follows the session, not the other way round. Anything that ends
   * capture — pause, stop, discard, TTL purge, account switch — releases the
   * microphone, because every one of those states means we must not be hearing.
   */
  const speechStart = speech.start;
  const speechStop = speech.stop;
  useEffect(() => {
    // Depend on the stable callbacks, not the hook object — that object is new on
    // every render, so this effect would re-run continuously during a session.
    if (state === 'listening') speechStart();
    else speechStop();
  }, [state, speechStart, speechStop]);

  const handleStop = useCallback(() => {
    stop();
    // Frozen copy: the live array is about to become purgeable (see F-3 above).
    onStopped?.({
      fragments: Object.freeze(fragments.map(f => Object.freeze({ ...f }))),
      wordCount,
      elapsedMs,
    });
  }, [stop, onStopped, fragments, wordCount, elapsedMs]);

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

  // Prefer the live partial so the screen moves while a phrase is still forming.
  const latestPhrase = speech.interim
    || (fragments.length > 0 ? fragments[fragments.length - 1].text : '');

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
          {speech.error && ` ${speech.error}`}
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
