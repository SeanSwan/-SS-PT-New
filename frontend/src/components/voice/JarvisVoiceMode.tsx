/**
 * COMPONENT: JarvisVoiceMode (S10 — JARVIS blueprint §6.2)
 * PURPOSE: The composition container for the one-mic loop: capture (S6) →
 * two-phase decode (S7) → review (S8) inside the overlay ladder (S9).
 * Voice widens input, never authority: this container only APPENDS rows to
 * local logger state via onCommitRows — the save still travels the
 * byte-pinned POST /api/workout-forms path with every Cortex gate intact.
 * Mounted by the logger ONLY when VOICE_MODE_V2 is on (S10 cutover).
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVoiceCapture, isVoiceCaptureSupported } from '../../hooks/voice/useVoiceCapture';
import { useCoachSpeech } from '../../hooks/voice/useCoachSpeech';
import { useJarvisVoiceLoop, CLARIFY_TIMEOUT_MS } from '../../hooks/voice/useJarvisVoiceLoop';
import { transcribeAudio, decodeTranscript, COACH_BUSY_MESSAGE } from '../../services/voice/decodeTranscript';
import type { ParsedWorkout } from '../WorkoutLogger/VoiceMemoUpload';
import type { ExerciseEntry } from '../../services/nasmApiService';
import VoiceModeOverlay from './VoiceModeOverlay/VoiceModeOverlay';
import ReviewDecodedWorkout from './ReviewDecodedWorkout/ReviewDecodedWorkout';

export interface JarvisVoiceModeProps {
  clientId: number;
  onCommitRows: (rows: ExerciseEntry[], meta: { needsReview: boolean }) => void;
  onUndoCommit: () => void;
  /** "Type instead" and Close both land here — the caller restores typing. */
  onExit: () => void;
}

const JarvisVoiceMode: React.FC<JarvisVoiceModeProps> = ({
  clientId, onCommitRows, onUndoCommit, onExit,
}) => {
  const { authAxios } = useAuth();
  const capture = useVoiceCapture();
  const { loop, send } = useJarvisVoiceLoop();
  const speech = useCoachSpeech(); // S11 talk-back: tier-1 confirmations only
  const [decoded, setDecoded] = React.useState<{ workout: ParsedWorkout; transcript: string } | null>(null);
  const [lockSendConfirmed, setLockSendConfirmed] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const voiceCaptureSupported = isVoiceCaptureSupported();

  // No MediaRecorder → the overlay opens straight into the honest failure
  // state with "Type instead" one tap away (never a raw crash).
  React.useEffect(() => {
    if (!voiceCaptureSupported) {
      send({ type: 'FAIL', message: 'This browser cannot record audio — type instead.' });
    }
  }, [send, voiceCaptureSupported]);

  // Abort in-flight phases on unmount (S7 contract).
  React.useEffect(() => () => abortRef.current?.abort(), []);

  // Clarify no-answer timer (S9: 3s → best-effort + needs-review).
  React.useEffect(() => {
    if (loop.state !== 'clarifying') return undefined;
    const handle = setTimeout(() => send({ type: 'CLARIFY_TIMEOUT' }), CLARIFY_TIMEOUT_MS);
    return () => clearTimeout(handle);
  }, [loop.state, send]);

  // Blob ready → run the two phases through the honest ladder.
  const processedBlobRef = React.useRef<Blob | null>(null);
  React.useEffect(() => {
    const blob = capture.audioBlob;
    if (capture.state !== 'stopped' || !blob || processedBlobRef.current === blob) return;
    // F1 lock-safety: a lock-stopped recording is RETAINED and needs the
    // trainer's explicit "Send it" before any upload happens.
    if (capture.stoppedByLock && !lockSendConfirmed) return;
    processedBlobRef.current = blob;
    setLockSendConfirmed(false);
    send({ type: 'CAPTURED' });
    const controller = new AbortController();
    abortRef.current = controller;
    void (async () => {
      const phaseA = await transcribeAudio(authAxios, blob, controller.signal);
      if (!phaseA.ok) {
        send({ type: 'FAIL', message: phaseA.failure === 'busy' ? COACH_BUSY_MESSAGE : 'Could not hear that — try again or type instead.' });
        return;
      }
      send({ type: 'TRANSCRIBED', transcript: phaseA.transcript });
      const phaseB = await decodeTranscript(authAxios, phaseA.transcript, clientId, controller.signal);
      if (!phaseB.ok || !phaseB.parsedWorkout) {
        send({ type: 'FAIL', message: phaseB.failure === 'busy' ? COACH_BUSY_MESSAGE : 'Coach could not read that — edit the words or type instead.' });
        return;
      }
      setDecoded({ workout: phaseB.parsedWorkout as ParsedWorkout, transcript: phaseB.transcript });
      send({ type: 'DECODED' });
    })();
  }, [authAxios, capture.audioBlob, capture.state, capture.stoppedByLock, lockSendConfirmed, clientId, send]);

  // Denied/errored capture surfaces through the ladder too.
  React.useEffect(() => {
    if (capture.state === 'denied' || capture.state === 'error') {
      send({ type: 'FAIL', message: capture.error ?? 'Microphone unavailable — type instead.' });
    }
  }, [capture.state, capture.error, send]);

  const lockPromptVisible = capture.stoppedByLock && !lockSendConfirmed && Boolean(capture.audioBlob);
  const canStartListening = voiceCaptureSupported
    && !lockPromptVisible
    && ['idle', 'error', 'speaking'].includes(loop.state)
    && capture.state !== 'requesting'
    && capture.state !== 'recording';
  const holdControlDisabled = lockPromptVisible || (!canStartListening && loop.state !== 'listening');

  const holdStart = () => {
    if (!canStartListening) return;
    speech.unlockOnGesture(); // iOS primes TTS on the first gesture
    speech.cancelSpeech(); // half-duplex barge-in: mic press silences Coach
    send({ type: 'LISTEN' });
    void capture.start();
  };
  const holdEnd = () => capture.stop();
  const exit = () => {
    abortRef.current?.abort();
    speech.cancelSpeech();
    capture.reset();
    send({ type: 'EXIT_TO_TYPING' });
    onExit();
  };

  if (loop.state === 'review' && decoded) {
    return (
      <ReviewDecodedWorkout
        workout={decoded.workout}
        transcript={decoded.transcript}
        onCommit={(rows, meta) => {
          onCommitRows(rows, meta);
          // S11: tier-1 confirmation only — generic counts, no names possible.
          speech.speakConfirmation(`Logged. ${rows.length} exercise${rows.length === 1 ? '' : 's'} added for review.`);
        }}
        onUndo={onUndoCommit}
        onClose={exit}
      />
    );
  }

  return (
    <VoiceModeOverlay
      loop={loop}
      getAudioLevel={capture.getAudioLevel}
      confirmPrompt={lockPromptVisible ? {
        text: 'Recording stopped when the screen locked — send it?',
        confirmLabel: 'Send it',
        onConfirm: () => setLockSendConfirmed(true),
      } : null}
      holdDisabled={holdControlDisabled}
      onHoldStart={holdStart}
      onHoldEnd={holdEnd}
      onTypeInstead={exit}
      onClose={exit}
    />
  );
};

export default JarvisVoiceMode;
