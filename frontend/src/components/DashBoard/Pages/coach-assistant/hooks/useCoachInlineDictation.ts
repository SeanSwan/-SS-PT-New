/**
 * FILE: useCoachInlineDictation.ts
 * PURPOSE: One microphone for the Coach Command Center dock, with no modal.
 *
 * WHAT THIS REPLACES
 * ------------------
 * The dock's mic used to be two different products depending on the browser.
 * Where the Web Speech API exists it dictated inline; where it does not (Brave
 * strips it, and WebViews generally withhold it) the press opened a full-screen
 * VoiceRecordingOverlay, and finishing a single sentence cost four gestures:
 * press the mic, press "Stop & Send", read the transcript preview, press "Send
 * to Swan Coach", then press Send again to actually reach the model.
 *
 * That fallback was not a niche path — it is the path a normal browser takes —
 * and it made dictation slower than typing. This hook gives both pipelines the
 * same shape as dictation in Codex and Claude Code:
 *
 *     press the mic  ->  talk  ->  press the mic  ->  Send
 *
 * WHY BOTH PIPELINES STAY
 * -----------------------
 * They are not redundant. LIVE (`useCoachBrowserSpeechInput`) streams words as
 * they are recognised, which is the whole point of the inline experience.
 * RECORD (`useCoachCapture`) produces the authoritative transcript through the
 * server and carries the lifecycle policy that releases the microphone when the
 * tab hides, the page is navigated away, or the screen locks. Removing either
 * would trade away something real, so this hook picks the best available one
 * and hides the difference from the caller.
 *
 * THE LIFECYCLE POLICY IS NOT BYPASSED
 * ------------------------------------
 * The RECORD branch goes through `useCoachCapture` — not the raw recorder and
 * transcription hooks — so the hot-microphone guarantees the overlay used to
 * own still hold now that the overlay is gone. That is the reason this hook is
 * not simply `useVoiceRecorder` with a different render.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../../hooks/aiMessageLimits';
import { appendDictatedText } from '../CoachCommandCenter.voiceText';
import { useCoachBrowserSpeechInput } from './useCoachBrowserSpeechInput';
import { CAPTURE_AUTO_STOPPED_COPY, useCoachCapture, type CaptureStatus } from './useCoachCapture';
import { useMicLevel } from './useMicLevel';

/** Bars in the dock's listening strip. */
export const MIC_LEVEL_BARS = 5;

export type InlineDictationMode = 'browser' | 'recorder' | 'none';
export type InlineDictationPhase = 'idle' | 'listening' | 'transcribing';

export const DICTATION_LISTENING_COPY = 'Listening — talk, then press the mic to stop';
export const DICTATION_TRANSCRIBING_COPY = 'Transcribing your voice…';
export const DICTATION_CAPTURED_COPY = 'Voice captured — edit if needed, then press Send';
export const DICTATION_EMPTY_COPY = 'Swan Coach could not hear anything — nothing was added';
export const DICTATION_CANCELLED_COPY = 'Voice input cancelled — nothing was added';
export const DICTATION_UNAVAILABLE_COPY = 'Voice input is not available in this browser';
/**
 * Worded for THIS surface. `CAPTURE_AUTO_STOPPED_COPY` (which the full-screen
 * overlay used) promises the audio "is still on this device for you to review
 * or discard" — the inline dock has no preview step, so that promise cannot be
 * kept here and is not made.
 */
export const DICTATION_AUTOSTOP_COPY =
  'Recording stopped because you left the screen. Nothing was sent — press the mic to record again.';

/** `m:ss`, shared with the strip's clock and the dock's status line. */
export function formatDictationElapsed(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

type InlineDictationParams = {
  commandTextRef: RefObject<HTMLTextAreaElement>;
  maxChars?: number;
  setCommandText: Dispatch<SetStateAction<string>>;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
};

function isRecorderSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return typeof window.MediaRecorder !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

export function useCoachInlineDictation({
  commandTextRef,
  maxChars = AI_CHAT_MESSAGE_MAX_CHARS,
  setCommandText,
  setSelectedStatus,
}: InlineDictationParams) {
  const [voiceInputError, setVoiceInputError] = useState<string | null>(null);

  const speech = useCoachBrowserSpeechInput({
    autoSend: false,
    maxChars,
    // Never reached in inline mode — nothing is dispatched without an explicit
    // Send. Passed only because the hook's contract requires it.
    onSend: () => undefined,
    setText: setCommandText,
    setInputError: setVoiceInputError,
  });

  const capture = useCoachCapture();
  const recorderSupported = useMemo(isRecorderSupported, []);

  const mode: InlineDictationMode = speech.speechSupported
    ? 'browser'
    : recorderSupported ? 'recorder' : 'none';

  const recording = capture.status === 'capturing' || capture.status === 'requesting';
  const transcribing = capture.status === 'transcribing';
  const listening = mode === 'browser' ? speech.listening : recording;

  /**
   * The meter only has a stream to read on the RECORD branch — the Web Speech
   * API does not hand out the microphone's audio. On that branch the strip
   * proves itself with live words instead, which is stronger evidence anyway.
   */
  const meter = useMicLevel(capture.getStream, mode === 'recorder' && recording, MIC_LEVEL_BARS);

  const focusComposer = useCallback(() => {
    window.setTimeout(() => commandTextRef.current?.focus(), 0);
  }, [commandTextRef]);

  /**
   * RECORD: audio is held until `transcribe()` is called. Nothing else calls
   * it now that the overlay is gone, so the dock has to — and it must not fire
   * after an automatic stop, where the coach has already left the screen and
   * shipping their audio to a model would contradict the notice they saw.
   */
  useEffect(() => {
    if (mode !== 'recorder') return;
    if (capture.status !== 'ready') return;
    if (capture.stoppedAutomatically) return;
    void capture.transcribe();
  }, [mode, capture.status, capture.stoppedAutomatically, capture.transcribe]);

  /**
   * One injection per capture. Keyed on a latch rather than on the transcript
   * string: dictating the same sentence twice is a legitimate thing to do, and
   * a value comparison would silently drop the second one.
   */
  const awaitingTranscriptRef = useRef(false);

  useEffect(() => {
    if (mode !== 'recorder') return;
    if (!awaitingTranscriptRef.current) return;
    if (capture.status !== 'done' && capture.status !== 'error') return;

    awaitingTranscriptRef.current = false;
    const transcript = capture.transcript;

    if (capture.status === 'error') {
      // `capture.error` is surfaced through the hook's `error` return; the
      // reset below would clear it from the hook, so mirror it into local state.
      if (capture.error) setVoiceInputError(capture.error);
    } else if (transcript.trim()) {
      setCommandText((current) => appendDictatedText(current, transcript));
      setSelectedStatus(DICTATION_CAPTURED_COPY);
      setVoiceInputError(null);
      focusComposer();
    } else {
      setSelectedStatus(DICTATION_EMPTY_COPY);
    }

    capture.reset();
  }, [
    mode,
    capture.status,
    capture.transcript,
    capture.error,
    capture.reset,
    setCommandText,
    setSelectedStatus,
    focusComposer,
  ]);

  /**
   * AUTO-STOP (tab hidden, app backgrounded, screen lock) leaves the audio
   * held and unclaimed, and nothing on this surface can claim it: the inline
   * dock has no transcript-preview step, so there is no review affordance, and
   * transcribing is forbidden — the policy refuses to ship audio to a model
   * after a stop the speaker never asked for. The audio is not really "kept"
   * either: `useVoiceRecorder.start()` drops the previous blob the instant the
   * mic is pressed again. So say plainly what happened and release it.
   *
   * `capture.reset()` also clears the notice out of the hook's error channel.
   * Left there it is a permanent, highest-priority status: `displaySelectedStatus`
   * returns `voiceStatus` whenever it is non-null, so one auto-stop would mask
   * every later status line for the rest of the session.
   */
  useEffect(() => {
    if (mode !== 'recorder' || !capture.stoppedAutomatically) return;
    setSelectedStatus(DICTATION_AUTOSTOP_COPY);
    capture.reset();
  }, [mode, capture.stoppedAutomatically, capture.reset, setSelectedStatus]);

  const start = useCallback(() => {
    setVoiceInputError(null);
    if (mode === 'browser') {
      speech.toggleListening();
      setSelectedStatus(DICTATION_LISTENING_COPY);
      return;
    }
    setSelectedStatus(DICTATION_LISTENING_COPY);
    void capture.start();
  }, [mode, speech, capture, setSelectedStatus]);

  const stop = useCallback(() => {
    if (mode === 'browser') {
      // Flushes any word the recogniser never promoted to final.
      speech.stopListening();
      /**
       * "Voice captured" over an untouched composer is the kind of status that
       * teaches a speaker to distrust the status line — and the RECORD branch
       * already says so plainly. Same honesty here.
       */
      setSelectedStatus(speech.heardSpeech ? DICTATION_CAPTURED_COPY : DICTATION_EMPTY_COPY);
      focusComposer();
      return;
    }
    // Latched BEFORE stopping: `stop()` queues the recorder's final events, so
    // a synchronous transition here would otherwise be missed and the
    // transcript would be produced and then thrown away.
    awaitingTranscriptRef.current = true;
    capture.stop();
    setSelectedStatus(DICTATION_TRANSCRIBING_COPY);
  }, [mode, speech, capture, setSelectedStatus, focusComposer]);

  /**
   * Stop without rescuing the pending tail, and without touching the composer.
   * Two callers, one meaning — "the words in flight are not wanted":
   *   - the composer is submitted mid-dictation, where the text being sent is
   *     already decided and a late word must not land in the next message;
   *   - the speaker presses the mic during TRANSCRIPTION, which is the only
   *     escape from a stalled upload (see `toggle`).
   */
  const cancel = useCallback(() => {
    if (mode === 'browser') {
      speech.cancelListening();
      return;
    }
    capture.reset();
    awaitingTranscriptRef.current = false;
  }, [mode, speech, capture]);

  const toggle = useCallback(() => {
    if (mode === 'none') {
      setSelectedStatus(DICTATION_UNAVAILABLE_COPY);
      return;
    }
    if (listening) {
      stop();
      return;
    }
    if (transcribing) {
      /**
       * ESCAPE HATCH, not a no-op. Transcription is a POST with no client
       * timeout (`api.service` sets one only for /api/health), so a stalled
       * upload leaves this state up indefinitely — and this used to `return`
       * silently, which stranded the speaker on "Transcribing your voice…"
       * with a mic that did nothing. Pressing the mic here is an explicit "I
       * don't want this"; discard it and say so.
       */
      cancel();
      setSelectedStatus(DICTATION_CANCELLED_COPY);
      return;
    }
    start();
  }, [mode, listening, transcribing, start, stop, cancel, setSelectedStatus]);

  const phase: InlineDictationPhase = listening
    ? 'listening'
    : transcribing ? 'transcribing' : 'idle';

  /**
   * The auto-stop notice is not an error — it has its own effect above, which
   * words it for this surface and releases the audio. Letting it through here
   * would make it a permanent highest-priority status.
   */
  const captureError = capture.error === CAPTURE_AUTO_STOPPED_COPY ? null : capture.error;
  /**
   * The LIVE branch has its own failure channel — the recogniser's `onerror`.
   * Without it, `start()`'s optimistic "Listening" copy was the last word the
   * status line ever got after a denied microphone.
   */
  const error = voiceInputError ?? (mode === 'browser' ? speech.error : captureError);

  return {
    cancel,
    elapsedSeconds: capture.duration,
    error,
    interim: mode === 'browser' ? speech.interim : '',
    levels: meter.levels,
    metering: meter.metering,
    mode,
    phase,
    supported: mode !== 'none',
    toggle,
  };
}

export type { CaptureStatus };
