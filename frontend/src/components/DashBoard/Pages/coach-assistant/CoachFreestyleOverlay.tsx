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
import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Mic, Pause, Play, Check, Trash2, X } from 'lucide-react';
import {
  useFreestyleSession,
  type FreestyleSnapshot,
  type FreestylePurgeReason,
} from './hooks/useFreestyleSession';
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
  QuietCount,
  ControlRow,
  ControlButton,
  DiscardConfirm,
  DiscardCopy,
} from './CoachFreestyleOverlay.styles';

/** Re-exported so existing consumers keep their import path. */
export type { FreestyleSnapshot } from './hooks/useFreestyleSession';

interface CoachFreestyleOverlayProps {
  isOpen: boolean;
  /** Account that owns the buffer. A change purges it — shared-tablet guarantee. */
  accountKey: string | number | null;
  onClose: () => void;
  /**
   * Handed a FROZEN, OWNER-STAMPED snapshot when the user finishes — never the
   * live buffer. Passing the session's own array let the parent keep a reference
   * that survived every purge trigger, which hollowed out the retention contract
   * the moment Done was tapped.
   */
  onStopped?: (snapshot: FreestyleSnapshot) => void;
  /**
   * Purge receipts, passed straight to the session. Without a mount-point sink
   * every purge — discard, TTL, account switch — happens unreceipted, and the
   * retention audit the hook promises is fiction.
   */
  onPurge?: (reason: FreestylePurgeReason) => void;
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
  onPurge,
}) => {
  const session = useFreestyleSession({ accountKey, onPurge });

  /**
   * Freestyle uses the Web Speech API rather than the RECORD pipeline (which
   * uploads recorded audio — audio in which Sean says real client names out
   * loud — to a server-side model). That is a TRANSPORT choice, not a privacy
   * guarantee: on Chrome the recogniser is cloud-backed. See the
   * useFreestyleSpeech header for the full caveat and the open owner decision.
   */
  const speech = useFreestyleSpeech({
    onPhrase: (text) => session.appendFragment(text),
  });

  const {
    state, fragments, elapsedMs, sinceLastFragmentMs, wordCount, error,
    discardPending, start, pause, resume, stop, fail,
    requestDiscard, cancelDiscard, discard, reset,
  } = session;

  /**
   * Auto-start at most ONCE per open. The previous version keyed on `state ===
   * 'idle'`, but a TTL purge settles to 'idle' — so an overlay left open on a
   * shared tablet re-engaged the microphone every cycle, each one legitimately
   * "purged", listening indefinitely to an empty room.
   */
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) { autoStartedRef.current = false; return; }
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    if (state === 'idle') start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /**
   * EVERY pause path flushes first — the words spoken as the screen hides or
   * the thumb hits Pause are words. handlePause flushed but the lifecycle
   * paths did not, losing the pending interim on exactly the transitions the
   * lifecycle policy exists to protect.
   */
  const speechFlushRef = useRef(speech.flush);
  speechFlushRef.current = speech.flush;
  const speechStopRef = useRef(speech.stop);
  speechStopRef.current = speech.stop;
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  /**
   * Flush (session still listening, so the words land), then stop the engine
   * SYNCHRONOUSLY, then pause. The engine release must not wait for the follow
   * effect: on pagehide/screen-lock the browser can freeze the page before
   * React runs another effect, and with `wantListening` still true the
   * recogniser's onend would restart it — hearing after the lifecycle event
   * that promised silence (Codex, round 5). The follow effect remains as
   * defense-in-depth; this is the guarantee.
   */
  const pauseWithFlush = useCallback(() => {
    speechFlushRef.current();
    speechStopRef.current();
    pauseRef.current();
  }, []);

  /**
   * ACCOUNT SWITCH kills the engine BEFORE PAINT. The session view masks to
   * idle synchronously, but the follow effect that actually releases the
   * cloud-backed recogniser is passive — so trainer A's microphone kept
   * hearing briefly under trainer B's boundary (Codex, round 10). Layout
   * effects run before paint. No flush: at this instant the ownership guard
   * refuses appends, so A's in-flight words are dropped — fail-closed, never
   * mis-owned.
   */
  // NORMALIZED, matching the session's owner rule (42 === "42"): comparing the
  // raw prop let a type-only change kill the engine under a session that,
  // correctly, never switched owners — "Listening" over a dead recogniser
  // (Codex, round 17). The normalization has been the owner law since round 8;
  // this consumer had not inherited it.
  const normalizedAccountKey = accountKey === null ? null : String(accountKey);
  const prevAccountRef = useRef(normalizedAccountKey);
  useLayoutEffect(() => {
    if (prevAccountRef.current === normalizedAccountKey) return;
    prevAccountRef.current = normalizedAccountKey;
    speechStopRef.current();
  }, [normalizedAccountKey]);

  /**
   * S4: `isOpen` only toggles visibility — the component stays mounted. Without
   * this, hiding the overlay left the session listening and the recogniser
   * running behind invisible UI.
   */
  useLayoutEffect(() => {
    // Layout, not passive (GLM, round 14): a parent-driven close usually means
    // navigation — exactly when the browser may freeze before passive effects
    // run. Release before paint, mirroring the account-switch precedent.
    if (!isOpen && (state === 'listening')) pauseWithFlush();
  }, [isOpen, state, pauseWithFlush]);

  /**
   * DIRECT UNMOUNT (route change with the overlay still open) was the one
   * exit left to a passive cleanup — the speech hook's own useEffect teardown
   * runs in the passive phase, after this layout cleanup. Kill the engine in
   * the layout phase of the removing commit (Codex, round 15); the hook's
   * cleanup remains defense-in-depth.
   */
  useLayoutEffect(() => () => { speechStopRef.current(); }, []);

  /**
   * The engine follows the session AND the surface. Anything that ends capture —
   * pause, stop, discard, TTL purge, account switch — releases the microphone,
   * and so does hiding the overlay: without the `isOpen` gate, an invisible
   * (keyboard-reachable) Resume press could take the microphone live behind
   * closed UI. No state change may start the engine while the surface is hidden.
   */
  const speechStart = speech.start;
  const speechStop = speech.stop;
  useEffect(() => {
    // Depend on the stable callbacks, not the hook object — that object is new on
    // every render, so this effect would re-run continuously during a session.
    // The !speech.error gate matters: on the render where a fatal error first
    // appears the session is still 'listening' (fail() runs in a later effect),
    // and without the gate this effect immediately re-started the engine the
    // denial had just killed (Codex, round 2). Recovery from error goes through
    // handleStart, which clears the error inside a real user gesture.
    if (isOpen && state === 'listening' && !speech.error) speechStart();
    else speechStop();
  }, [isOpen, state, speech.error, speechStart, speechStop]);

  /**
   * Lifecycle policy, same doctrine as useCoachCapture: tab hide, app
   * background, and screen lock must not leave a session hearing. Freestyle had
   * no `visibilitychange`/`pagehide` handling at all — the engine kept its
   * restart loop alive in a backgrounded tab. Pause (not stop): the user comes
   * back and taps Resume; resuming is a gesture, which iOS requires anyway.
   */
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') pauseWithFlush();
    };
    const onPageHide = () => pauseWithFlush();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [pauseWithFlush]);

  /**
   * A speech failure becomes a SESSION failure. Leaving the session 'listening'
   * over a dead engine made the quiet counter narrate a lie ("Still listening.
   * Nothing heard for 47s") next to the denial copy. `fail` keeps the buffer —
   * words already heard survive the mic dying.
   */
  const failRef = useRef(fail);
  failRef.current = fail;
  useEffect(() => {
    /**
     * Keyed on state AS WELL AS the error string. A retry that fails with the
     * IDENTICAL error (persistent start failure; unsupported browser) never
     * changes `speech.error`, so an error-string-only dependency let
     * handleStart commit the session to 'listening' and nothing ever failed it
     * — "Talk as long as you need" over an engine that can never start (GLM,
     * round 3). Re-entering capture re-evaluates the bridge; fail() no-ops
     * outside listening/paused, so the healthy path is unaffected.
     */
    if (speech.error) failRef.current(speech.error);
  }, [speech.error, state]);

  const handleStop = useCallback(() => {
    // speech.stop() flushes the pending interim WHILE the session is still
    // 'listening' (so the words land), then kills the engine SYNCHRONOUSLY —
    // Done used to leave the recogniser to the passive follow effect, the same
    // still-hearing window closed for Pause and tab-hide in round 5, surviving
    // on this button until round 13 (Codex). session.stop() then builds the
    // snapshot from refs, so the just-flushed words are included.
    speechStopRef.current();
    const snapshot = stop();
    if (snapshot) onStopped?.(snapshot);
  }, [stop, onStopped]);

  /** Flush before pausing — the words spoken as the thumb hits Pause are words. */
  const handlePause = pauseWithFlush;

  /**
   * Explicit start: session first, then the ENGINE inside the same click.
   * Starting the engine in the gesture (a) satisfies iOS Safari's activation
   * requirement on the retry path, and (b) is the only route back from a
   * speech error — speech.start() re-runs the engine, whose success clears
   * the error that gates the follow effect above.
   */
  /**
   * Both gesture starters carry their own isOpen guard. They start the engine
   * DIRECTLY (inside the tap, as iOS requires) — which bypasses the follow
   * effect's isOpen gate, so without this check an invisible button press on
   * the closed overlay would re-arm the microphone behind closed UI: the exact
   * round-1 HIGH, reintroduced by the round-3 gesture fix and caught by its
   * regression test.
   */
  const handleStart = useCallback(() => {
    if (!isOpen) return;
    // An unsupported browser can never listen — committing the session to
    // 'listening' first would flash a promise the engine cannot keep. The
    // unsupported copy from the failed auto-start stays on screen instead.
    if (!speech.supported) return;
    // Engine starts ONLY if the session actually transitioned — a refused
    // start (error-with-words) must not open a microphone over a session
    // that never began (Codex, round 16 — same class as handleResume).
    if (start()) speechStart();
  }, [isOpen, speech.supported, start, speechStart]);

  /** Resume needs the same gesture treatment as Start — iOS requires the engine start inside the tap (Codex, round 3). */
  const handleResume = useCallback(() => {
    if (!isOpen) return;
    // Engine only on a REAL resume: an expired session purges and refuses,
    // and starting the recogniser anyway opened a live microphone over an
    // idle session until the follow effect noticed (Codex, round 16).
    if (resume()) speechStart();
  }, [isOpen, resume, speechStart]);

  /**
   * Arming the discard stops the ENGINE synchronously (speech.stop flushes
   * first, so the words mid-flight at the tap are judged with the rest) —
   * leaving it to the follow effect kept the mic hot through the confirm's
   * first frames (Codex, round 13). The session pause lives in the hook.
   */
  const handleRequestDiscard = useCallback(() => {
    speechStopRef.current();
    requestDiscard();
  }, [requestDiscard]);

  const handleDiscard = useCallback(() => {
    discard();
    onClose();
  }, [discard, onClose]);

  const handleClose = useCallback(() => {
    // Synchronous stop FIRST — Cancel while listening (zero fragments) reached
    // this path and left the engine to the follow effect, falsifying the
    // "every exit stops synchronously" claim one round after it was made
    // (Codex, round 14). stop() flushes while the session is still listening,
    // so a mid-flight phrase lands before reset purges (receipted) — words are
    // never silently dropped between the tap and the close.
    speechStopRef.current();
    reset('completed');
    onClose();
  }, [reset, onClose]);

  const isListening = state === 'listening';
  const isPaused = state === 'paused';
  const isStopped = state === 'stopped';

  /**
   * Escape arms the discard rather than performing it. A stray key must not
   * destroy ten minutes of work — the same reasoning as the two-step control.
   * Once STOPPED the snapshot has already been handed off, so arming a discard
   * there was pure theatre guarding data that had already left — close instead.
   */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (discardPending) cancelDiscard();
      else if (!isStopped && fragments.length > 0) handleRequestDiscard();
      else handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isStopped, discardPending, fragments.length, cancelDiscard, handleRequestDiscard, handleClose]);

  /**
   * FOCUS LIFECYCLE for an aria-modal dialog: focus moves in on open, cycles
   * inside while open (a modal that lets Tab wander the page behind it is not
   * modal), jumps to the confirm when discard arms, and returns to the opener
   * on close. All done by hand — this surface earns no dependency.
   */
  const overlayRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    overlayRef.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { openerRef.current?.focus?.(); };
  }, [isOpen]);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  useEffect(() => {
    if (!isOpen || !discardPending) return;
    // The interrupt owns focus: land on "Keep it", the safe answer.
    overlayRef.current
      ?.querySelector<HTMLElement>('[role="alertdialog"] button')
      ?.focus();
    return () => {
      /**
       * DISARM also moves focus. The confirm unmounts with the focused button
       * inside it — via "Keep it", Escape, or the 10s auto-disarm — and focus
       * fell to <body> inside a still-open modal (GLM, round 2). Restore to
       * the first main control. Skip when the whole overlay is closing: the
       * open-effect's cleanup restores the opener, and fighting it would steal
       * focus back into a hidden dialog.
       */
      if (!isOpenRef.current) return;
      overlayRef.current?.querySelector<HTMLElement>('button')?.focus();
    };
  }, [isOpen, discardPending]);

  useEffect(() => {
    if (!isOpen) return;
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const root = overlayRef.current;
      if (!root) return;
      const buttons = Array.from(root.querySelectorAll<HTMLElement>('button'));
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [isOpen]);

  /** After ~4s of silence, say so — otherwise silence reads as "it broke". */
  const quietFor = Math.floor(sinceLastFragmentMs / 1000);
  const isQuiet = isListening && fragments.length > 0 && quietFor >= 4;

  /**
   * Only the tail of the current phrase, never a running transcript. Rendering
   * whole spoken sentences put client names in large type on a gym floor where
   * anyone can read them — and contradicted this file's own doctrine line.
   * Three words is enough to prove Coach is hearing you.
   */
  const tailWords = (text: string) => text.trim().split(/\s+/).slice(-3).join(' ');
  /**
   * Rendered ONLY while the masked session is actively listening. The session
   * mask does not reach the speech transport's interim state, so during the
   * account-switch window trainer A's in-flight phrase could still render
   * under trainer B (Codex, round 9) — and a paused/stopped screen keeping
   * words up on a gym floor was never right anyway. isListening derives from
   * the MASKED state, so the mismatch window reads idle and shows nothing.
   */
  const latestPhrase = !isOpen || !isListening
    ? ''
    : speech.interim
      ? tailWords(speech.interim)
      : (fragments.length > 0 ? tailWords(fragments[fragments.length - 1].text) : '');

  return (
    <FreestyleOverlay
      ref={overlayRef}
      $isOpen={isOpen}
      role="dialog"
      aria-modal="true"
      aria-label="Freestyle dictation"
      aria-hidden={!isOpen}
    >
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
        {speech.restarts > 0 && (
          <SignalItem>
            <SignalValue>{speech.restarts}</SignalValue>
            <SignalLabel>Reconnects</SignalLabel>
          </SignalItem>
        )}
      </SignalStrip>

      <Stage>
        <BreathOrb $listening={isListening} aria-hidden="true" />

        {latestPhrase && <LivePhrase>{latestPhrase}</LivePhrase>}

        {/*
          One polite live region carries the whole status, and every string in it
          is STABLE for its state. A ticking counter in a live region re-announces
          every second — the flooding this comment used to claim to prevent — so
          the seconds live in a separate, aria-hidden element below.
        */}
        <StatusLine role="status" aria-live="polite" $muted={!isListening}>
          {isListening && !isQuiet && 'Listening. Talk as long as you need — no record is created until you review it.'}
          {isListening && isQuiet && 'Still listening. Nothing heard for a little while.'}
          {isPaused && 'Paused. Nothing is being heard.'}
          {isStopped && `Finished — ${wordCount} words captured. No record has been created yet.`}
          {/*
            The recovery instruction must name a control that is actually
            rendered in this state (GLM, round 4): with words, Start is hidden
            (it cannot wipe them) so the instruction points at Done/Discard;
            with no words on a supported browser, Start is the retry; on an
            unsupported browser there is no retry to promise.
          */}
          {state === 'error' && `${error ?? 'Listening stopped unexpectedly.'}${
            fragments.length > 0
              ? ' Finish and review to keep these words, or discard them.'
              : speech.supported ? ' Tap Start talking to try again.' : ''
          }`}
          {state === 'discarded' && 'Session discarded. Nothing was saved.'}
        </StatusLine>
        {isListening && isQuiet && (
          <QuietCount aria-hidden="true">{quietFor}s quiet</QuietCount>
        )}
      </Stage>

      {discardPending ? (
        <DiscardConfirm role="alertdialog" aria-label="Discard this session?">
          <DiscardCopy>
            Discard this session? {wordCount} words will be deleted and cannot be recovered.
          </DiscardCopy>
          <ControlRow>
            <ControlButton type="button" onClick={cancelDiscard} aria-label="Keep it — do not discard the session">
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
            <ControlButton type="button" onClick={handlePause} aria-label="Pause listening">
              <Pause size={18} aria-hidden="true" /> Pause
            </ControlButton>
          )}

          {isPaused && (
            <ControlButton type="button" onClick={handleResume} aria-label="Resume listening">
              <Play size={18} aria-hidden="true" /> Resume
            </ControlButton>
          )}

          {(isListening || isPaused || (state === 'error' && fragments.length > 0)) && (
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
            <ControlButton type="button" $variant="danger" onClick={handleRequestDiscard} aria-label="Discard session">
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

      {/*
        No Start in error-with-words: session.start() refuses there (one tap
        must not destroy captured words), so offering the button would be a
        dead control at best and a data-loss affordance at worst. The user
        chooses Done or a confirmed Discard first. No Start on an unsupported
        browser either — handleStart refuses there, and a retry affordance
        that is guaranteed to no-op is furniture, not a control.
      */}
      {speech.supported &&
        !isListening && !isPaused && !isStopped && state !== 'discarded' &&
        !(state === 'error' && fragments.length > 0) && (
        <ControlRow>
          <ControlButton type="button" $variant="primary" onClick={handleStart} aria-label="Start talking">
            <Mic size={18} aria-hidden="true" /> Start talking
          </ControlButton>
        </ControlRow>
      )}
    </FreestyleOverlay>
  );
};

export default CoachFreestyleOverlay;
