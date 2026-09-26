/**
 * Logger origin regression: real logger and command hooks, synthetic speech/HTTP.
 * Proves R3-3 producer provenance reaches the existing command request boundary.
 * Does not exercise microphone permissions, actual API authorization or writes.
 */
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../context/authContextState';
import type { AuthContextType } from '../../context/AuthContextProvider';
import { useWorkoutLoggerDictation } from './useWorkoutLoggerDictation';

/**
 * `useWorkoutLoggerDictation` submits through `useCoachCommand`, which derives the actor
 * from `useAuth` and REFUSES the command when `authenticated` is false
 * (useCoachCommand.ts:184,208). The real logger always renders inside App.tsx's
 * AuthProvider; these tests rendered the hook bare, so every send threw
 * "useAuth must be used within an AuthProvider" and 15 tests went red — a real
 * regression that sat invisible in the standing suite red.
 *
 * The value is the minimum `useCoachCommand` reads: a positive actor id, an allowed raw
 * role (isAllowedRawRole accepts admin|trainer|client) and authenticated-not-loading.
 */
const authValue = {
  user: { id: '9201', role: 'client' },
  isAuthenticated: true,
  loading: false,
} as unknown as AuthContextType;

const AuthWrapper = ({ children }: { children: ReactNode }) => (
  <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
);

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
    const { result } = renderHook(() => useWorkoutLoggerDictation({ clientId: 9201 }), { wrapper: AuthWrapper });
    if (mode === 'typed-then-spoken') act(() => result.current.setText('typed prefix'));
    act(() => capture.setText?.('log two sets of squats'));
    if (mode === 'edited') act(() => result.current.setText('log three sets of squats'));
    if (mode === 'unchanged') act(() => result.current.setText(result.current.text));
    if (mode === 'appended') act(() => capture.setText?.(previous => `${previous} at 20 kg`));
    await act(async () => result.current.send());
    expect(capture.post).toHaveBeenCalledOnce();
    // `useCoachCommand` passes a THIRD transport argument — { signal, _isBackgroundRequest } —
    // on all three command-lane calls (execute/confirm/cancel at useCoachCommand.ts:253,326,360),
    // so an arity-exact toHaveBeenCalledWith can no longer match even though every substantive
    // field does. Assert the endpoint and the payload, which is what this suite is about; the
    // transport config is not the contract. Third arg is matched but not pinned.
    expect(capture.post).toHaveBeenCalledWith('/api/ai-command/execute', expect.objectContaining({
      selectedClientId: 9201,
      routeContext: expect.objectContaining({ surface: 'workout-logger', inputMode: 'voice' }),
    }), expect.anything());
  });

  it('new typed input after explicitly clearing speech retains the typed policy', async () => {
    const { result } = renderHook(() => useWorkoutLoggerDictation({ clientId: 9201 }), { wrapper: AuthWrapper });
    act(() => capture.setText?.('dictated draft'));
    act(() => result.current.setText(''));
    act(() => result.current.setText('show my workout'));
    await act(async () => result.current.send());
    expect(capture.post.mock.calls[0][1].routeContext.inputMode).toBe('text');
  });
});
