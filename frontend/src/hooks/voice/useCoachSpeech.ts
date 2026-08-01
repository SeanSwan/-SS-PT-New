/**
 * HOOK: useCoachSpeech (S11 — JARVIS blueprint §6.2)
 * PURPOSE: Coach talk-back. Wraps the proven browser-TTS hook with the
 * JARVIS laws:
 * - Tier-1 confirmations ONLY by default ("Logged. Bench, three by eight at
 *   one eighty-five.") — never full readbacks.
 * - NO CLIENT NAMES EVER SPOKEN: every utterance passes assertNoNames with
 *   the live roster; a name token THROWS in dev and is redacted in prod
 *   (unit-fenced). Zero PII reaches any TTS provider (browser or cloud).
 * - Half-duplex: cancelSpeech() is called by the mic press (barge-in
 *   <100ms — speechSynthesis.cancel is synchronous) and speaking NEVER
 *   opens the mic.
 * - Global mute persists (localStorage, validate-on-read).
 * - iOS unlock: first user gesture primes an empty utterance.
 * - Gemini TTS is NOT wired here — the `pro` opt-in path stays owner-gated
 *   behind VOICE_TTS_DEFAULT_ON tier review (browser TTS is the default).
 */

import { useCallback, useRef, useState } from 'react';

const MUTE_KEY = 'ss.coach.speech.muted.v1';

export const readCoachSpeechMuted = (): boolean => {
  try { return window.localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};

const writeCoachSpeechMuted = (muted: boolean): void => {
  try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* preference just won't stick */ }
};

/**
 * Name guard: dev throws (a leak is a bug, not a speech), prod redacts.
 * Matching is case-insensitive whole-word on every roster token ≥3 chars.
 */
export function assertNoNames(utterance: string, rosterNames: readonly string[]): string {
  let safe = utterance;
  for (const name of rosterNames) {
    for (const token of name.split(/\s+/)) {
      if (token.length < 3) continue;
      const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (re.test(safe)) {
        if (import.meta.env?.DEV) {
          throw new Error(`useCoachSpeech: client name token would be spoken: "${token}"`);
        }
        safe = safe.replace(re, 'your client');
      }
    }
  }
  return safe;
}

/** Tier-1: short action confirmations only — everything else stays silent. */
export const isTierOneConfirmation = (text: string): boolean =>
  /^(logged|saved|added|updated|removed|done)\b/i.test(text.trim()) && text.length <= 120;

export function useCoachSpeech(rosterNames: readonly string[] = []) {
  const [muted, setMuted] = useState(readCoachSpeechMuted);
  const [speaking, setSpeaking] = useState(false);
  const unlockedRef = useRef(false);

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  /** Call from any first user gesture — iOS refuses un-primed synthesis. */
  const unlockOnGesture = useCallback(() => {
    if (!supported || unlockedRef.current) return;
    unlockedRef.current = true;
    const primer = new SpeechSynthesisUtterance('');
    primer.volume = 0;
    window.speechSynthesis.speak(primer);
  }, [supported]);

  /** Barge-in: synchronous cancel — the mic press calls this FIRST. */
  const cancelSpeech = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speakConfirmation = useCallback((text: string) => {
    if (!supported || muted) return false;
    if (!isTierOneConfirmation(text)) return false; // tier-1 only, by law
    const safe = assertNoNames(text, rosterNames);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(safe);
    utterance.rate = 1.05;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
    return true;
  }, [supported, muted, rosterNames]);

  const toggleMute = useCallback(() => {
    setMuted(current => {
      const next = !current;
      writeCoachSpeechMuted(next);
      if (next) cancelSpeech();
      return next;
    });
  }, [cancelSpeech]);

  return { supported, muted, speaking, speakConfirmation, cancelSpeech, toggleMute, unlockOnGesture };
}
