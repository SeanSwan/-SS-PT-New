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
