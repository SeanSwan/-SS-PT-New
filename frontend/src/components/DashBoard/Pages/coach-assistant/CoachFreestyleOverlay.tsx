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
import React, { useCallback, useEffect, useRef } from 'react';
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
   * S4: `isOpen` only toggles visibility — the component stays mounted. Without
   * this, hiding the overlay left the session listening and the recogniser
   * running behind invisible UI.
   */
  useEffect(() => {
    if (!isOpen && (state === 'listening')) pause();
  }, [isOpen, state, pause]);

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
    if (isOpen && state === 'listening') speechStart();
    else speechStop();
  }, [isOpen, state, speechStart, speechStop]);

  /**
   * Lifecycle policy, same doctrine as useCoachCapture: tab hide, app
   * background, and screen lock must not leave a session hearing. Freestyle had
   * no `visibilitychange`/`pagehide` handling at all — the engine kept its
   * restart loop alive in a backgrounded tab. Pause (not stop): the user comes
   * back and taps Resume; resuming is a gesture, which iOS requires anyway.
   */
  const pauseRef = useRef(pause);
  pauseRef.current = pause;
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') pauseRef.current();
    };
    const onPageHide = () => pauseRef.current();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  /**
   * A speech failure becomes a SESSION failure. Leaving the session 'listening'
   * over a dead engine made the quiet counter narrate a lie ("Still listening.
   * Nothing heard for 47s") next to the denial copy. `fail` keeps the buffer —
   * words already heard survive the mic dying.
   */
  const failRef = useRef(fail);
  failRef.current = fail;
  useEffect(() => {
    if (speech.error) failRef.current(speech.error);
  }, [speech.error]);

  const handleStop = useCallback(() => {
    // Order matters: flush promotes the pending interim into the session WHILE
    // it is still 'listening'; stop() then builds the snapshot from refs, so the
    // just-flushed words are included. The old render-closure copy missed them.
    speech.flush();
    const snapshot = stop();
    if (snapshot) onStopped?.(snapshot);
  }, [speech, stop, onStopped]);

  /** Flush before pausing — the words spoken as the thumb hits Pause are words. */
  const handlePause = useCallback(() => {
    speech.flush();
    pause();
  }, [speech, pause]);

  const handleDiscard = useCallback(() => {
    discard();
    onClose();
  }, [discard, onClose]);

  const handleClose = useCallback(() => {
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
      else if (!isStopped && fragments.length > 0) requestDiscard();
      else handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isStopped, discardPending, fragments.length, cancelDiscard, requestDiscard, handleClose]);

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

  useEffect(() => {
    if (!isOpen || !discardPending) return;
    // The interrupt owns focus: land on "Keep it", the safe answer.
    overlayRef.current
      ?.querySelector<HTMLElement>('[role="alertdialog"] button')
      ?.focus();
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
  const latestPhrase = speech.interim
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
          {state === 'error' && (error ?? 'Listening stopped unexpectedly.')}
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
            <ControlButton type="button" onClick={resume} aria-label="Resume listening">
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
