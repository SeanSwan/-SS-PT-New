/**
 * useCoachInlineRecorder.ts
 * =========================
 * Inline (no-modal) recorder lane for the coach console dock.
 *
 * Browser dictation has always been inline. The MediaRecorder fallback was not:
 * it opened a full-screen overlay and made the speaker walk
 *   record -> Stop & Send -> preview -> Send/Edit -> composer -> Send
 * for a single sentence. This lane gives the recorder the same inline shape as
 * dictation — press the mic, talk, press the mic, and the words land in the
 * composer — by reusing the two hooks the overlay already used
 * (useVoiceRecorder, useGeminiTranscription) and adding only the staging policy.
 *
 * Staging obeys the live publication admission: a transcript that resolves
 * after the binding retired must not stage words, so `onTranscribed` returns
 * whether the stage was accepted and the status line reports that truth rather
 * than assuming success.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeminiTranscription } from './useGeminiTranscription';
import { useVoiceRecorder } from './useVoiceRecorder';

export const INLINE_RECORDER_LISTENING_COPY = 'Listening — tap the mic when you finish';
export const INLINE_RECORDER_TRANSCRIBING_COPY = 'Transcribing your voice…';
export const INLINE_RECORDER_CAPTURED_COPY = 'Voice command captured — press Send to continue';
export const INLINE_RECORDER_EMPTY_COPY = 'Swan Coach could not hear anything — nothing was added';
export const INLINE_RECORDER_DISCARDED_COPY = 'Voice recording discarded';

interface UseCoachInlineRecorderParams {
  /**
   * Stage a finished transcript into the scoped composer. Returns false when
   * the live admission refuses it — the lane must then report that nothing was
   * added rather than claim a capture that never landed.
   */
  onTranscribed: (text: string) => boolean;
  setSelectedStatus: (status: string) => void;
  setVoiceInputError: (error: string | null) => void;
}

export function useCoachInlineRecorder({
  onTranscribed,
  setSelectedStatus,
  setVoiceInputError,
}: UseCoachInlineRecorderParams) {
  // Destructured rather than read off the hook objects, deliberately: every one
  // of these is a useCallback with a STABLE identity (useVoiceRecorder keys
  // start/stop/abort/reset/getAudioLevel off its own [cleanup], and cleanup is
  // []; useGeminiTranscription's transcribe/reset are []). Naming them directly
  // is what makes the dependency arrays below both complete and stable —
  // depending on the hook OBJECT instead would re-run every effect on every
  // render, and `recorder.abort` in a dep array is the same object-member shape
  // the lint rule cannot prove stable.
  const {
    abort: abortRecording,
    audioBlob,
    duration,
    error: recorderError,
    getAudioLevel,
    reset: resetRecorder,
    start: startRecording,
    state: recorderState,
    stop: stopRecording,
  } = useVoiceRecorder();
  const {
    error: transcriptionError,
    reset: resetTranscription,
    state: transcriptionState,
    text: transcriptionText,
    transcribe,
  } = useGeminiTranscription();
  const [transcribing, setTranscribing] = useState(false);
  // One stage per recording: the done-effect must not stage the same blob twice.
  const stagedRef = useRef(false);

  const isListening = recorderState === 'recording' || recorderState === 'requesting';
  const active = isListening || transcribing;

  const abort = useCallback(() => {
    // Latch the stage guard first: an in-flight transcribe() can still resolve
    // after this, and a discarded recording must never reach the composer.
    stagedRef.current = true;
    abortRecording();
    resetTranscription();
    setTranscribing(false);
  }, [abortRecording, resetTranscription]);

  const toggle = useCallback(() => {
    if (isListening) {
      setTranscribing(true);
      setSelectedStatus(INLINE_RECORDER_TRANSCRIBING_COPY);
      stopRecording();
      return;
    }
    if (transcribing) {
      // Escape hatch: the transcribe request has no client timeout, so a
      // stalled upload would otherwise strand the speaker with no way out.
      abort();
      setSelectedStatus(INLINE_RECORDER_DISCARDED_COPY);
      return;
    }
    stagedRef.current = false;
    setVoiceInputError(null);
    setSelectedStatus(INLINE_RECORDER_LISTENING_COPY);
    void startRecording();
  }, [
    abort,
    isListening,
    setSelectedStatus,
    setVoiceInputError,
    startRecording,
    stopRecording,
    transcribing,
  ]);

  // Capture stopped -> hand the blob to transcription.
  useEffect(() => {
    if (recorderState !== 'stopped') return;
    if (!audioBlob) {
      // A stop that produced no audio is not a transcript. Without this the lane
      // would sit on "Transcribing your voice…" forever, since nothing else
      // clears `transcribing`.
      setTranscribing(false);
      setSelectedStatus(INLINE_RECORDER_EMPTY_COPY);
      resetRecorder();
      return;
    }
    if (transcriptionState !== 'idle') return;
    setTranscribing(true);
    setSelectedStatus(INLINE_RECORDER_TRANSCRIBING_COPY);
    void transcribe(audioBlob);
  }, [audioBlob, recorderState, resetRecorder, setSelectedStatus, transcribe, transcriptionState]);

  // A denied microphone or device error must surface. The optimistic
  // "Listening" copy is written on intent, so without this the status line
  // would keep promising a live microphone over one that never opened.
  useEffect(() => {
    if (recorderState !== 'error') return;
    setTranscribing(false);
    setVoiceInputError(recorderError || 'Microphone unavailable');
  }, [recorderError, recorderState, setVoiceInputError]);

  useEffect(() => {
    if (transcriptionState !== 'error') return;
    setTranscribing(false);
    setVoiceInputError(transcriptionError || 'Transcription failed');
  }, [setVoiceInputError, transcriptionError, transcriptionState]);

  // Transcript ready -> stage it, then release both lanes.
  useEffect(() => {
    if (transcriptionState !== 'done') return;
    if (stagedRef.current) return;
    stagedRef.current = true;
    const text = transcriptionText.trim();
    setTranscribing(false);
    if (!text) {
      setSelectedStatus(INLINE_RECORDER_EMPTY_COPY);
    } else {
      const staged = onTranscribed(text);
      setSelectedStatus(staged ? INLINE_RECORDER_CAPTURED_COPY : INLINE_RECORDER_EMPTY_COPY);
    }
    resetRecorder();
    resetTranscription();
  }, [
    onTranscribed,
    resetRecorder,
    resetTranscription,
    setSelectedStatus,
    transcriptionState,
    transcriptionText,
  ]);

  return {
    abort,
    active,
    duration,
    /** Live mic RMS 0..1 — the recorder's own analyser, so the meter needs no second capture. */
    getLevel: getAudioLevel,
    isListening,
    toggle,
  };
}
