/**
 * FILE: CoachCommandCenter.voiceCapture.ts
 * PURPOSE: The Coach Command Center dock's single voice entry point.
 *
 * The dock used to expose two voice behaviours that looked like one: inline
 * dictation where the Web Speech API exists, and a full-screen
 * VoiceRecordingOverlay plus a transcript-confirmation preview where it does
 * not. Finishing one spoken sentence on the second path cost four gestures.
 *
 * Both paths now resolve to `useCoachInlineDictation`: press the mic, talk,
 * press the mic, Send. Nothing opens over the composer and nothing has to be
 * confirmed twice. The overlay component still exists for the legacy assistant
 * surface, but the command center no longer renders it.
 */
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import {
  DICTATION_LISTENING_COPY,
  DICTATION_TRANSCRIBING_COPY,
  formatDictationElapsed,
  useCoachInlineDictation,
  type InlineDictationMode,
  type InlineDictationPhase,
} from './hooks/useCoachInlineDictation';

type VoiceCaptureParams = {
  commandTextRef: RefObject<HTMLTextAreaElement>;
  maxChars?: number;
  setCommandText: Dispatch<SetStateAction<string>>;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
};

/**
 * The dock's status line. Live state only — phase copy that the mic press
 * already wrote via `setSelectedStatus` would be replaced a frame later by an
 * identical string.
 */
function buildVoiceStatus(
  phase: InlineDictationPhase,
  mode: InlineDictationMode,
  interim: string,
  elapsedSeconds: number,
  error: string | null,
): string | null {
  if (error) return error;
  if (phase === 'transcribing') return DICTATION_TRANSCRIBING_COPY;
  if (phase !== 'listening') return null;
  if (interim) return `Listening: ${interim}`;
  // The RECORD branch has no interim words, so the ticking clock is the only
  // honest proof it is still running.
  if (mode === 'recorder') return `${DICTATION_LISTENING_COPY} · ${formatDictationElapsed(elapsedSeconds)}`;
  return DICTATION_LISTENING_COPY;
}

export function useCoachCommandVoiceCapture({
  commandTextRef,
  maxChars = AI_CHAT_MESSAGE_MAX_CHARS,
  setCommandText,
  setSelectedStatus,
}: VoiceCaptureParams) {
  const dictation = useCoachInlineDictation({
    commandTextRef,
    maxChars,
    setCommandText,
    setSelectedStatus,
  });

  return {
    handleVoice: dictation.toggle,
    /** Discards the open microphone without keeping the pending tail. */
    voiceCancel: dictation.cancel,
    voiceActive: dictation.phase !== 'idle',
    voiceCaptureMode: dictation.mode,
    voiceElapsedSeconds: dictation.elapsedSeconds,
    voiceLevels: dictation.levels,
    voiceMetering: dictation.metering,
    voicePhase: dictation.phase,
    voiceStatus: buildVoiceStatus(
      dictation.phase,
      dictation.mode,
      dictation.interim,
      dictation.elapsedSeconds,
      dictation.error,
    ),
    voiceSupported: dictation.supported,
  };
}
