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

/**
 * Precise on purpose. The old copy said "Nothing was saved," while the recorded
 * audio was (and is) still held in memory on this device — `dismissNotice`
 * deliberately keeps a usable capture. "Saved"/"sent" claims must match what the
 * code does: nothing leaves the device or reaches an account without the user.
 */
export const CAPTURE_AUTO_STOPPED_COPY =
  'Recording stopped because you left this screen. Nothing was sent or saved to your account — the audio is still on this device for you to review or discard.';

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
    /**
     * Set SYNCHRONOUSLY, before awaiting the recorder. The passive mirror effect
     * only runs after `recorder.state` commits, so between this call and that
     * flush the flag would otherwise be false — and a `pagehide` landing in that
     * window would make `stopInternal` bail on `!isCapturingRef.current`, leaving
     * the latch unset. Permission would then resolve and the microphone would go
     * live on a hidden page: the exact hole this hook exists to close.
     */
    isCapturingRef.current = true;
    setStoppedAutomatically(false);
    setAutoStopCopy(null);
    // A new capture inherits nothing: the previous capture's pending upload
    // must not be handed to this one's transcribe() (GLM, round 4).
    transcribeInFlightRef.current = null;
    transcriptionRef.current.reset();
    try {
      await recorderStartRef.current();
    } catch (err) {
      isCapturingRef.current = false;    // never strand the flag on a failed start
      throw err;
    }
  }, []);

  /**
   * In-flight guard: a double-tap on a "transcribe" affordance must not upload
   * the same audio twice (double model cost, and a second copy of PII-dense
   * audio in transit). Concurrent callers share the one pending promise.
   *
   * NOTE — enforcement location: the "never auto-transcribe after an automatic
   * stop" rule is currently enforced by consumers (VoiceRecordingOverlay checks
   * `stoppedAutomatically` before calling this). The hook cannot distinguish a
   * user gesture from an effect, so it cannot own that rule without an API
   * change; recorded as an open question in the retention contract.
   */
  const transcribeInFlightRef = useRef<{ blob: Blob; promise: Promise<string> } | null>(null);
  const transcribe = useCallback(async () => {
    const blob = recorder.audioBlob;
    if (!blob) return '';
    /**
     * The shared flight belongs to THIS blob only. An unkeyed guard returned
     * whatever promise was pending regardless of which capture spawned it —
     * so capture B could inherit (and mis-attribute) discarded capture A's
     * upload, and A's audio finished uploading after its discard (GLM, round 4).
     */
    const inFlight = transcribeInFlightRef.current;
    if (inFlight && inFlight.blob === blob) return inFlight.promise;
    const promise = transcriptionRef.current
      .transcribe(blob)
      .finally(() => {
        if (transcribeInFlightRef.current?.blob === blob) {
          transcribeInFlightRef.current = null;
        }
      });
    transcribeInFlightRef.current = { blob, promise };
    return promise;
  }, [recorder.audioBlob]);

  const reset = useCallback(() => {
    stopInternal('user');
    /**
     * Deliberately does NOT clear `stopRequestedRef`. Clearing it here removed the
     * latch while a `getUserMedia` prompt could still be in flight, so the
     * late-arrival guard never fired and recording could begin after a reset.
     * Only `start()` clears the latch, because only `start()` means a new capture.
     */
    isCapturingRef.current = false;
    setStoppedAutomatically(false);
    setAutoStopCopy(null);
    // Reset means abandon: a discarded capture's upload must not survive to be
    // inherited (or awaited) by whatever comes next (GLM, round 4).
    transcribeInFlightRef.current = null;
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
