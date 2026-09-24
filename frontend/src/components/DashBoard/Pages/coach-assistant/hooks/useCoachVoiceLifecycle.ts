/**
 * useCoachVoiceLifecycle.ts
 * =========================
 * G06/S7 — one foreground voice lifecycle for the coach surface.
 *
 * Composes the three existing voice lanes (browser dictation, recorder
 * transcription fallback, TTS output) under a single foreground contract:
 *
 * - Backgrounding the tab (visibilitychange -> hidden, pagehide), logout
 *   (authenticated -> anonymous), and surface teardown stop BOTH the audio
 *   output and the capture (mic tracks + dictation).
 * - `bargeIn` stops output only — starting capture must silence playback
 *   without touching the capture lane.
 * - A voice stop NEVER touches the action lane: cancelling or aborting an
 *   in-flight write is owned by CoachCommand/useAIChat, and this hook holds
 *   no reference to either. Audio stop and action cancel are separate by
 *   construction.
 *
 * The stop callbacks are held in refs so listener identity stays stable and
 * late events cannot fire a stale closure.
 */

import { useCallback, useEffect, useRef } from 'react';

export type CoachVoiceStopReason = 'background' | 'logout' | 'surface-switch' | 'manual';

interface UseCoachVoiceLifecycleParams {
  /** Stop TTS/playback output (Gemini audio + browser speechSynthesis). */
  stopSpeechOutput: () => void;
  /** Stop capture: browser dictation + recorder overlay + mic tracks. */
  stopCapture: () => void;
  /** Auth signal; a true -> false flip is treated as logout. */
  authenticated: boolean;
}

export function useCoachVoiceLifecycle({
  stopSpeechOutput,
  stopCapture,
  authenticated,
}: UseCoachVoiceLifecycleParams) {
  const outputStopRef = useRef(stopSpeechOutput);
  const captureStopRef = useRef(stopCapture);
  outputStopRef.current = stopSpeechOutput;
  captureStopRef.current = stopCapture;
  const authenticatedRef = useRef(authenticated);

  /** Stop output + capture. Safe to call when idle — every lane stop is a
   * no-op when nothing is live, so background events attach unconditionally
   * and close the race where dictation arms between state and event. */
  const stopAll = useCallback((_reason: CoachVoiceStopReason) => {
    outputStopRef.current();
    captureStopRef.current();
  }, []);

  /** Output-only stop for capture start (barge-in). */
  const bargeIn = useCallback(() => {
    outputStopRef.current();
  }, []);

  // Background/pagehide. Fires regardless of voiceActive: all stops are
  // safe no-ops when idle and the alternative is a mic that survives the
  // tab losing the foreground.
  useEffect(() => {
    const onHidden = () => {
      if (!document.hidden) return;
      stopAll('background');
    };
    const onPageHide = () => stopAll('background');
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [stopAll]);

  // Logout: authenticated -> anonymous ends the foreground voice session.
  useEffect(() => {
    if (authenticatedRef.current && !authenticated) stopAll('logout');
    authenticatedRef.current = authenticated;
  }, [authenticated, stopAll]);

  // Surface switch/teardown.
  useEffect(() => () => stopAll('surface-switch'), [stopAll]);

  return { bargeIn, stopAll };
}
