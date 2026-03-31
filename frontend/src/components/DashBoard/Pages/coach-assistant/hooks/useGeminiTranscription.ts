/**
 * ============================================================================
 * FILE: useGeminiTranscription.ts
 * PURPOSE: Sends audio blob to backend for Gemini-powered transcription
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Takes an audio Blob from useVoiceRecorder, uploads it to
 * POST /api/ai-chat/transcribe, returns the transcribed text.
 *
 * HOW IT FITS IN THE APP:
 * useVoiceRecorder → audioBlob → useGeminiTranscription (this) → text
 *   → VoiceRecordingOverlay passes text to onTranscribed callback
 */

import { useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export type TranscriptionState = 'idle' | 'transcribing' | 'done' | 'error';

export interface UseGeminiTranscriptionReturn {
  state: TranscriptionState;
  text: string;
  error: string | null;
  transcribe: (blob: Blob) => Promise<string>;
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: API Config
// ─────────────────────────────────────────────────────────────
const API_BASE = (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export function useGeminiTranscription(): UseGeminiTranscriptionReturn {
  const [state, setState] = useState<TranscriptionState>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const transcribe = useCallback(async (blob: Blob): Promise<string> => {
    try {
      setState('transcribing');
      setError(null);

      const formData = new FormData();
      // Determine file extension from blob type
      const ext = blob.type.includes('webm') ? 'webm'
        : blob.type.includes('ogg') ? 'ogg'
        : blob.type.includes('mp4') ? 'mp4'
        : 'webm';
      formData.append('audio', blob, `recording.${ext}`);

      const res = await fetch(`${API_BASE}/api/ai-chat/transcribe`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Transcription failed (${res.status})`);
      }

      const data = await res.json();
      const transcript = data.text || data.transcript || '';
      setText(transcript);
      setState('done');
      return transcript;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setError(msg);
      setState('error');
      return '';
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setText('');
    setError(null);
  }, []);

  return { state, text, error, transcribe, reset };
}
