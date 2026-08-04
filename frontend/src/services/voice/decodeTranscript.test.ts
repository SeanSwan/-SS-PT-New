/**
 * decodeTranscript.test.ts — S7 acceptance fence.
 * Locks: both phases use the EXISTING endpoints only; retry-once on 5xx;
 * 429 → 'busy' class (transcript retained/editable); abort is quiet; Phase B
 * sends the transcript field + clientId to the parse lane.
 */
import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { transcribeAudio, decodeTranscript, COACH_BUSY_MESSAGE } from './decodeTranscript';

const axiosWith = (post: ReturnType<typeof vi.fn>) => ({ post }) as unknown as AxiosInstance;
const httpError = (status: number) => Object.assign(new Error(`http ${status}`), { response: { status } });

describe('S7 two-phase decode service', () => {
  it('Phase A posts the blob to /api/ai-chat/transcribe and returns the raw transcript', async () => {
    const post = vi.fn().mockResolvedValue({ data: { text: 'bench three by eight at 185' } });
    const result = await transcribeAudio(axiosWith(post), new Blob(['x'], { type: 'audio/webm' }));
    expect(post).toHaveBeenCalledWith('/api/ai-chat/transcribe', expect.any(FormData), expect.anything());
    expect(result).toEqual({ ok: true, transcript: 'bench three by eight at 185' });
  });

  it('retries exactly once on 5xx, then succeeds', async () => {
    const post = vi.fn()
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValue({ data: { text: 'ok' } });
    const result = await transcribeAudio(axiosWith(post), new Blob(['x']));
    expect(post).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it('429 maps to the busy class with the transcript kept editable by the caller', async () => {
    const post = vi.fn().mockRejectedValue(httpError(429));
    const result = await decodeTranscript(axiosWith(post), 'edited words', 7);
    expect(result).toEqual({ ok: false, transcript: 'edited words', parsedWorkout: null, failure: 'busy' });
    expect(COACH_BUSY_MESSAGE).toMatch(/busy/i);
    expect(post).toHaveBeenCalledTimes(1); // 429 is NOT retried
  });

  it('Phase B rides the EXISTING parse lane with the transcript field', async () => {
    const post = vi.fn().mockResolvedValue({ data: { success: true, transcript: 'redacted words', parsedWorkout: { exercises: [] } } });
    const result = await decodeTranscript(axiosWith(post), 'raw words', 42);
    expect(post.mock.calls[0][0]).toBe('/api/workout-logs/upload');
    const sent = post.mock.calls[0][1] as FormData;
    expect(sent.get('transcript')).toBe('raw words');
    expect(sent.get('clientId')).toBe('42');
    expect(result.ok).toBe(true);
    expect(result.parsedWorkout).toEqual({ exercises: [] });
  });

  it('abort is quiet — no busy classification, transcript retained', async () => {
    const post = vi.fn().mockRejectedValue(Object.assign(new Error('canceled'), { name: 'CanceledError' }));
    const result = await decodeTranscript(axiosWith(post), 'kept', 1);
    expect(result.failure).toBe('error');
    expect(result.transcript).toBe('kept');
  });
});
