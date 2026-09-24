/**
 * Logger origin regression: real logger and command hooks, synthetic speech/HTTP.
 * Proves R3-3 producer provenance reaches the existing command request boundary.
 * Does not exercise microphone permissions, actual API authorization or writes.
 */
import type { Dispatch, SetStateAction } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkoutLoggerDictation } from './useWorkoutLoggerDictation';

const capture = vi.hoisted(() => ({
  post: vi.fn(),
  setText: null as Dispatch<SetStateAction<string>> | null,
  stop: vi.fn(),
}));
vi.mock('../../services/api.service', () => ({ default: { post: capture.post } }));
vi.mock('../DashBoard/Pages/coach-assistant/hooks/useCoachBrowserSpeechInput', () => ({
  useCoachBrowserSpeechInput: (options: { setText: Dispatch<SetStateAction<string>> }) => {
    capture.setText = options.setText;
    return { stopListening: capture.stop, toggleListening: vi.fn(),
      speechSupported: true, listening: false, interim: '' };
  },
}));

describe('default logger command provenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capture.post.mockResolvedValue({ data: { success: true, fallbackToChat: true } });
  });

  it.each(['dictated', 'edited', 'appended', 'unchanged', 'typed-then-spoken'] as const)('%s speech cannot submit as typed input', async mode => {
    const { result } = renderHook(() => useWorkoutLoggerDictation({ clientId: 9201 }));
    if (mode === 'typed-then-spoken') act(() => result.current.setText('typed prefix'));
    act(() => capture.setText?.('log two sets of squats'));
    if (mode === 'edited') act(() => result.current.setText('log three sets of squats'));
    if (mode === 'unchanged') act(() => result.current.setText(result.current.text));
    if (mode === 'appended') act(() => capture.setText?.(previous => `${previous} at 20 kg`));
    await act(async () => result.current.send());
    expect(capture.post).toHaveBeenCalledOnce();
    expect(capture.post).toHaveBeenCalledWith('/api/ai-command/execute', expect.objectContaining({
      selectedClientId: 9201,
      routeContext: expect.objectContaining({ surface: 'workout-logger', inputMode: 'voice' }),
    }));
  });

  it('new typed input after explicitly clearing speech retains the typed policy', async () => {
    const { result } = renderHook(() => useWorkoutLoggerDictation({ clientId: 9201 }));
    act(() => capture.setText?.('dictated draft'));
    act(() => result.current.setText(''));
    act(() => result.current.setText('show my workout'));
    await act(async () => result.current.send());
    expect(capture.post.mock.calls[0][1].routeContext.inputMode).toBe('text');
  });
});
