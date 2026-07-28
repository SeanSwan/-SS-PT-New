import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../../services/api.service', () => ({
  default: { post: postMock },
}));

describe('useGeminiTranscription', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('uploads webm audio to the server transcription endpoint and returns text', async () => {
    postMock.mockResolvedValueOnce({ data: { text: 'Log squats 3 by 10' } });
    const { useGeminiTranscription } = await import('./useGeminiTranscription');
    const hook = renderHook(() => useGeminiTranscription());
    const blob = new Blob(['voice-bytes'], { type: 'audio/webm' });

    let transcript = '';
    await act(async () => {
      transcript = await hook.result.current.transcribe(blob);
    });

    expect(transcript).toBe('Log squats 3 by 10');
    expect(hook.result.current.state).toBe('done');
    expect(hook.result.current.text).toBe('Log squats 3 by 10');
    expect(postMock).toHaveBeenCalledWith('/api/ai-chat/transcribe', expect.any(FormData));

    const formData = postMock.mock.calls[0][1] as FormData;
    const audio = formData.get('audio') as File;
    expect(audio.name).toBe('recording.webm');
    expect(audio.type).toBe('audio/webm');
  });

  it('accepts legacy transcript response field names', async () => {
    postMock.mockResolvedValueOnce({ data: { transcript: 'Start bench press 4 by 8' } });
    const { useGeminiTranscription } = await import('./useGeminiTranscription');
    const hook = renderHook(() => useGeminiTranscription());

    let transcript = '';
    await act(async () => {
      transcript = await hook.result.current.transcribe(new Blob(['voice'], { type: 'audio/ogg' }));
    });

    expect(transcript).toBe('Start bench press 4 by 8');
    const formData = postMock.mock.calls[0][1] as FormData;
    const audio = formData.get('audio') as File;
    expect(audio.name).toBe('recording.ogg');
  });

  it('fails closed with a safe user-facing error when transcription fails', async () => {
    postMock.mockRejectedValueOnce(new Error('network down'));
    const { useGeminiTranscription } = await import('./useGeminiTranscription');
    const hook = renderHook(() => useGeminiTranscription());

    let transcript = 'not-empty';
    await act(async () => {
      transcript = await hook.result.current.transcribe(new Blob(['voice'], { type: 'audio/mp4' }));
    });

    expect(transcript).toBe('');
    expect(hook.result.current.state).toBe('error');
    expect(hook.result.current.error).toBeTruthy();
  });
});