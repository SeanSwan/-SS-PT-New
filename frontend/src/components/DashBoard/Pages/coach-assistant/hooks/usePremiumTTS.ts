/**
 * ============================================================================
 * FILE: usePremiumTTS.ts
 * PURPOSE: Gemini 2.5 Flash TTS — real AI voice, not robot text reader
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * 1. Calls POST /api/ai-chat/tts with the AI response text
 * 2. Backend sends to Gemini 2.5 Flash TTS → returns WAV audio
 * 3. Frontend plays the audio — sounds like a real person
 * 4. Falls back to browser SpeechSynthesis if backend TTS unavailable
 *
 * GEMINI VOICES (warm female picks):
 * Kore — warm, confident (default)
 * Aoede — smooth, gentle
 * Leda — bright, energetic
 */

import { useState, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export type GeminiVoice = 'Kore' | 'Aoede' | 'Leda' | 'Puck' | 'Fenrir' | 'Charon';

export interface VoiceOption {
  id: GeminiVoice;
  label: string;
  description: string;
}

export interface UsePremiumTTSReturn {
  enabled: boolean;
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  toggleEnabled: () => void;
  voice: GeminiVoice;
  setVoice: (v: GeminiVoice) => void;
  voiceOptions: VoiceOption[];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Voice Options
// ─────────────────────────────────────────────────────────────
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Kore', label: 'Kore', description: 'Warm & confident' },
  { id: 'Aoede', label: 'Aoede', description: 'Smooth & gentle' },
  { id: 'Leda', label: 'Leda', description: 'Bright & energetic' },
  { id: 'Puck', label: 'Puck', description: 'Playful & youthful' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Deep & authoritative' },
  { id: 'Charon', label: 'Charon', description: 'Calm & measured' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Config
// ─────────────────────────────────────────────────────────────
const API_BASE = (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────────────────────
// SECTION: Markdown Stripping (clean text for speech)
// ─────────────────────────────────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '. Code block omitted. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[-*] /g, ', ')
    .replace(/\|[^|]+\|/g, ' ')  // Strip table rows
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export function usePremiumTTS(): UsePremiumTTSReturn {
  const [enabled, setEnabled] = useState(false);
  const [voice, setVoice] = useState<GeminiVoice>('Kore');
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const supported = true; // Always supported — Gemini TTS is server-side

  const speakWithGemini = useCallback(async (text: string) => {
    try {
      setSpeaking(true);
      const res = await fetch(`${API_BASE}/api/ai-chat/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ text, voice }),
      });

      if (!res.ok) throw new Error(`TTS failed: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setSpeaking(false);
      };
      await audio.play();
    } catch {
      setSpeaking(false);
      // Fall back to browser TTS
      speakWithBrowser(text);
    }
  }, [voice]); // eslint-disable-line react-hooks/exhaustive-deps

  const speakWithBrowser = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    setSpeaking(true);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.15;
    utterance.volume = 0.9;

    // Try to pick a decent female voice
    const voices = window.speechSynthesis.getVoices();
    const female = voices.find(v =>
      v.lang.startsWith('en') && (
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('zira') ||
        v.name.toLowerCase().includes('aria') ||
        v.name.toLowerCase().includes('jenny')
      )
    );
    if (female) utterance.voice = female;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback((text: string) => {
    if (!enabled) return;
    const cleaned = stripMarkdown(text);
    if (!cleaned) return;
    speakWithGemini(cleaned);
  }, [enabled, speakWithGemini]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const toggleEnabled = useCallback(() => setEnabled(prev => !prev), []);

  return {
    enabled,
    supported,
    speaking,
    speak,
    stop,
    toggleEnabled,
    voice,
    setVoice,
    voiceOptions: VOICE_OPTIONS,
  };
}
