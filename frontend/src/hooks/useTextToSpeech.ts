/**
 * ============================================================================
 * FILE: useTextToSpeech.ts
 * PURPOSE: Adaptive TTS hook — reads AI responses aloud via Web Speech Synthesis
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides text-to-speech with adaptive behavior:
 * brief confirmations for actions ("Done!"), full readback for queries.
 * Trainer can toggle TTS on/off. Respects system preferences.
 *
 * HOW IT FITS IN THE APP: Used by voice-enabled assistant surfaces to speak
 * AI responses when voice mode is active.
 *
 * KEY DECISIONS: Web Speech Synthesis API (zero-dependency, works offline).
 * Rate/pitch tuned for gym environment (slightly slower, clearer).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface UseTextToSpeechOptions {
  /** Default voice name preference (e.g., "Google US English") */
  preferredVoice?: string;
  /** Speech rate 0.1–10 (default 1.05 — slightly faster for gym) */
  rate?: number;
  /** Pitch 0–2 (default 1.0) */
  pitch?: number;
  /** Volume 0–1 (default 0.9) */
  volume?: number;
  /** Auto-enable TTS on mount */
  enabled?: boolean;
}

interface UseTextToSpeechReturn {
  /** Speak the given text. Cancels any current speech first. */
  speak: (text: string) => void;
  /** Stop speaking immediately */
  stop: () => void;
  /** Whether currently speaking */
  speaking: boolean;
  /** Whether TTS is enabled */
  enabled: boolean;
  /** Toggle TTS on/off */
  toggleEnabled: () => void;
  /** Whether browser supports speech synthesis */
  supported: boolean;
}

// Brief confirmation phrases — don't read full response for these
const BRIEF_PATTERNS = [
  /^(done|saved|created|updated|deleted|logged|added|removed|ok|got it)/i,
  /^workout (saved|logged|created)/i,
  /^client (created|updated|added)/i,
  /^session (booked|scheduled|cancelled)/i,
];

/**
 * Adaptive TTS: short confirmations for actions, full readback for queries.
 * Strips markdown formatting before speaking.
 */
function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold → plain
    .replace(/\*(.*?)\*/g, '$1') // Italic → plain
    .replace(/#{1,6}\s/g, '') // Remove heading markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links → text only
    .replace(/[|─┌┐└┘├┤╔╗╚╝║═]/g, '') // Remove table/box chars
    .replace(/\n{2,}/g, '. ') // Double newlines → pause
    .replace(/\n/g, ' ') // Single newlines → space
    .replace(/\s{2,}/g, ' ') // Collapse whitespace
    .trim();
}

function isBriefResponse(text: string): boolean {
  const cleaned = cleanForSpeech(text);
  return cleaned.length < 80 || BRIEF_PATTERNS.some((p) => p.test(cleaned));
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useTextToSpeech(
  options: UseTextToSpeechOptions = {},
): UseTextToSpeechReturn {
  const {
    preferredVoice,
    rate = 1.05,
    pitch = 1.0,
    volume = 0.9,
    enabled: initialEnabled = false,
  } = options;

  const [enabled, setEnabled] = useState(initialEnabled);
  const [speaking, setSpeaking] = useState(false);
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load preferred voice when available
  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Priority: preferred > Google US English > any English > first
      voiceRef.current =
        (preferredVoice && voices.find((v) => v.name === preferredVoice)) ||
        voices.find((v) => v.name.includes('Google US English')) ||
        voices.find((v) => v.lang.startsWith('en') && v.localService) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [supported, preferredVoice]);

  const stop = useCallback(() => {
    if (!supported) return;
    speechSynthesis.cancel();
    setSpeaking(false);
    utteranceRef.current = null;
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabled) return;

      // Cancel any current speech
      speechSynthesis.cancel();

      const cleaned = cleanForSpeech(text);
      if (!cleaned) return;

      // For brief responses, speak as-is. For long ones, truncate to first 3 sentences.
      let toSpeak = cleaned;
      if (!isBriefResponse(text) && cleaned.length > 300) {
        const sentences = cleaned.split(/[.!?]+/).filter(Boolean);
        toSpeak = sentences.slice(0, 3).join('. ') + '.';
        if (sentences.length > 3) {
          toSpeak += ' Check the terminal for full details.';
        }
      }

      const utterance = new SpeechSynthesisUtterance(toSpeak);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setSpeaking(false);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [supported, enabled, rate, pitch, volume],
  );

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      if (prev) {
        // Turning off — stop any current speech
        speechSynthesis.cancel();
        setSpeaking(false);
      }
      return !prev;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (supported) {
        speechSynthesis.cancel();
      }
    };
  }, [supported]);

  return { speak, stop, speaking, enabled, toggleEnabled, supported };
}

export default useTextToSpeech;
