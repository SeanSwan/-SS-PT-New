/**
 * SERVICE: decodeTranscript (S7 — JARVIS blueprint §6.2, ruling A9)
 * PURPOSE: The two-phase voice pipeline. NO new endpoints:
 *   Phase A transcribeAudio(blob)  → existing POST /api/ai-chat/transcribe
 *   Phase B decodeTranscript(text) → existing POST /api/workout-logs/upload
 *                                    (the S7 `transcript` field — same parser,
 *                                    same server-side Rule-8 redaction, which
 *                                    now FAILS CLOSED before any LLM hop)
 * Contract: abortable (pass an AbortSignal, abort on unmount); retry ONCE on
 * 5xx; 429 surfaces "Coach is busy — try again" and keeps the transcript
 * editable (the caller keeps the text; we only report the failure class).
 */

import type { AxiosInstance } from 'axios';

export interface TranscribeResult {
  ok: boolean;
  transcript: string;
  /** 'busy' = 429; 'error' = anything else that failed after one retry. */
  failure?: 'busy' | 'error';
}

export interface DecodeResult {
  ok: boolean;
  transcript: string;
  parsedWorkout: unknown | null;
  failure?: 'busy' | 'error';
}

interface HttpErrorLike { response?: { status?: number }; name?: string }

const statusOf = (err: unknown): number => (err as HttpErrorLike)?.response?.status ?? 0;
const isAbort = (err: unknown): boolean => (err as HttpErrorLike)?.name === 'CanceledError'
  || (err as HttpErrorLike)?.name === 'AbortError';

const failureClass = (err: unknown): 'busy' | 'error' => (statusOf(err) === 429 ? 'busy' : 'error');

/** User-facing copy for the busy class — the transcript stays editable. */
export const COACH_BUSY_MESSAGE = 'Coach is busy — try again in a moment.';

async function withRetryOnce<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (statusOf(err) >= 500 && statusOf(err) <= 599) return run(); // retry once on 5xx
    throw err;
  }
}

/** Phase A: audio blob → raw transcript (shown FIRST and editable — the receipt). */
export async function transcribeAudio(
  authAxios: AxiosInstance,
  blob: Blob,
  signal?: AbortSignal,
): Promise<TranscribeResult> {
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  const formData = new FormData();
  formData.append('audio', blob, `recording.${ext}`);
  try {
    const { data } = await withRetryOnce(() => authAxios.post<{ text?: string; transcript?: string }>(
      '/api/ai-chat/transcribe',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, signal },
    ));
    return { ok: true, transcript: data.text || data.transcript || '' };
  } catch (err) {
    if (isAbort(err)) return { ok: false, transcript: '', failure: 'error' };
    return { ok: false, transcript: '', failure: failureClass(err) };
  }
}

/** Phase B: edited transcript → decoded workout rows (server redacts, fail-closed). */
export async function decodeTranscript(
  authAxios: AxiosInstance,
  transcript: string,
  clientId: number,
  signal?: AbortSignal,
): Promise<DecodeResult> {
  const formData = new FormData();
  formData.append('transcript', transcript);
  formData.append('clientId', String(clientId));
  try {
    const { data } = await withRetryOnce(() => authAxios.post<{
      success?: boolean; transcript?: string; parsedWorkout?: unknown;
    }>('/api/workout-logs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000, signal,
    }));
    if (data?.success && data.parsedWorkout) {
      return { ok: true, transcript: data.transcript ?? transcript, parsedWorkout: data.parsedWorkout };
    }
    return { ok: false, transcript, parsedWorkout: null, failure: 'error' };
  } catch (err) {
    if (isAbort(err)) return { ok: false, transcript, parsedWorkout: null, failure: 'error' };
    return { ok: false, transcript, parsedWorkout: null, failure: failureClass(err) };
  }
}
