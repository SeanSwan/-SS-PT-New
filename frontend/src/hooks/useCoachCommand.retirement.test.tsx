import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../services/api.service';
import { dispatchAIWorkoutEvent } from '../utils/aiWorkoutEvents';
import { useCoachCommand } from './useCoachCommand';
import type { PublicationBinding, PublicationSnapshot } from './coachPublicationScope';

const authState = vi.hoisted(() => ({
  current: {
    user: { id: '7', role: 'trainer' },
    isAuthenticated: true,
    loading: false,
    error: null,
    token: 'test-token',
  },
}));

const paywallState = vi.hoisted(() => ({ showPaywall: vi.fn() }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState.current,
}));

vi.mock('../context/PaywallContext', () => ({
  usePaywall: () => paywallState,
}));

vi.mock('../services/api.service', () => ({
  default: { post: vi.fn() },
}));

vi.mock('../utils/aiWorkoutEvents', () => ({
  dispatchAIWorkoutEvent: vi.fn(() => true),
}));

type B2UseCoachCommand = (
  binding?: PublicationBinding,
) => ReturnType<typeof useCoachCommand>;

const useCoachCommandB2 = useCoachCommand as unknown as B2UseCoachCommand;
const postMock = apiService.post as unknown as ReturnType<typeof vi.fn>;
const dispatchMock = dispatchAIWorkoutEvent as unknown as ReturnType<typeof vi.fn>;
const StrictWrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

function snapshot(overrides: Partial<PublicationSnapshot> = {}): PublicationSnapshot {
  return Object.freeze({
    actorId: 7,
    rawRole: 'trainer',
    audienceRole: 'trainer',
    generation: 1,
    targetUserId: 4242,
    threadId: 901,
    enabled: true,
    ...overrides,
  });
}

function bind(read: () => PublicationSnapshot | null): PublicationBinding {
  return { getSnapshot: read };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function frontendDispatchResponse(success = true, payload: unknown = { exerciseName: 'Push Up' }) {
  return {
    data: {
      success,
      type: 'frontend_dispatch',
      command: 'add_exercise_to_form',
      message: 'Sent to the workout form.',
      event: 'AI_ADD_EXERCISE',
      payload,
    },
  };
}

describe('useCoachCommand B2 publication retirement', () => {
  beforeEach(() => {
    postMock.mockReset();
    dispatchMock.mockReset();
    dispatchMock.mockReturnValue(true);
    paywallState.showPaywall.mockReset();
    authState.current.user = { id: '7', role: 'trainer' };
    authState.current.isAuthenticated = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retires a delayed execute across an A-B-A publication change before dispatch and return', async () => {
    const response = deferred<ReturnType<typeof frontendDispatchResponse>>();
    let live = snapshot();
    postMock.mockReturnValue(response.promise);
    const binding = bind(() => live);
    const { result, rerender } = renderHook(() => useCoachCommandB2(binding));

    let pending!: Promise<unknown>;
    act(() => { pending = result.current.executeCommand('add push ups'); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));

    live = snapshot({ actorId: 8, generation: 2 });
    authState.current.user = { id: '8', role: 'trainer' };
    rerender();
    live = snapshot({ actorId: 7, generation: 3 });
    authState.current.user = { id: '7', role: 'trainer' };
    rerender();

    await act(async () => {
      response.resolve(frontendDispatchResponse());
      await pending;
    });

    expect(dispatchMock).not.toHaveBeenCalled();
    expect(pending).toBeDefined();
    const outcome = await Promise.resolve(pending);
    expect(outcome).toMatchObject({ type: 'error', superseded: true });
  });

  it('masks executing state on the first render after the bound scope retires', async () => {
    const response = deferred<ReturnType<typeof frontendDispatchResponse>>();
    let live = snapshot();
    postMock.mockReturnValue(response.promise);
    const binding = bind(() => live);
    const rendered: boolean[] = [];
    const { result, rerender } = renderHook(() => {
      const hook = useCoachCommandB2(binding);
      if (!live.enabled) rendered.push(hook.executingCommand);
      return hook;
    });

    let pending!: Promise<unknown>;
    act(() => { pending = result.current.executeCommand('add push ups'); });
    expect(result.current.executingCommand).toBe(true);

    live = snapshot({ enabled: false });
    rerender();
    expect(result.current.executingCommand).toBe(false);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.every(value => !value)).toBe(true);

    await act(async () => {
      response.resolve(frontendDispatchResponse());
      await pending;
    });
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('does not dispatch a malformed or false-success execute/confirm envelope', async () => {
    postMock.mockResolvedValueOnce(frontendDispatchResponse(false));
    const { result } = renderHook(() => useCoachCommandB2());

    let executeOutcome: unknown;
    await act(async () => { executeOutcome = await result.current.executeCommand('add push ups'); });
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(executeOutcome).toMatchObject({ type: 'error' });

    postMock.mockResolvedValueOnce(frontendDispatchResponse(true, 'malformed-payload'));
    let confirmOutcome: unknown;
    await act(async () => { confirmOutcome = await result.current.confirmCommand('op-1', 'digest-1', 'tap'); });
    expect(dispatchMock).not.toHaveBeenCalled();
    expect(confirmOutcome).toMatchObject({ success: false, type: 'error' });
  });

  it('preserves confirmation digest/channel while using a scoped background request', async () => {
    postMock.mockResolvedValue({ data: { success: true, type: 'executed', message: 'Done.', result: {} } });
    const { result } = renderHook(() => useCoachCommandB2());

    await act(async () => { await result.current.confirmCommand('op-2', 'sha256:rendered', 'keyboard'); });

    expect(postMock).toHaveBeenCalledWith(
      '/api/ai-command/confirm',
      { operationId: 'op-2', renderedDigest: 'sha256:rendered', confirmChannel: 'keyboard' },
      expect.objectContaining({ _isBackgroundRequest: true, signal: expect.any(AbortSignal) }),
    );
  });

  it('opens paywall only for a current 402 and suppresses a retired 402', async () => {
    const currentPaywall = Object.assign(new Error('limit'), {
      response: { status: 402, data: { featureName: 'Swan Coach' } },
    });
    postMock.mockRejectedValueOnce(currentPaywall);
    const { result } = renderHook(() => useCoachCommandB2());

    await act(async () => { await result.current.executeCommand('show plan'); });
    expect(paywallState.showPaywall).toHaveBeenCalledWith(
      'Swan Coach',
      expect.objectContaining({ featureName: 'Swan Coach' }),
    );

    const response = deferred<never>();
    let live = snapshot();
    postMock.mockReturnValueOnce(response.promise);
    const binding = bind(() => live);
    const bound = renderHook(() => useCoachCommandB2(binding));
    let pending!: Promise<unknown>;
    act(() => { pending = bound.result.current.executeCommand('show plan'); });
    live = snapshot({ enabled: false });
    bound.rerender();
    await act(async () => { response.reject(currentPaywall); await pending; });

    expect(paywallState.showPaywall).toHaveBeenCalledTimes(1);
  });

  it('does not publish a late event after StrictMode replay and unmount', async () => {
    const response = deferred<ReturnType<typeof frontendDispatchResponse>>();
    postMock.mockReturnValue(response.promise);
    const binding = bind(() => snapshot());
    const { result, unmount } = renderHook(
      () => useCoachCommandB2(binding),
      { wrapper: StrictWrapper },
    );
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.executeCommand('add push ups'); });
    expect(postMock).toHaveBeenCalledTimes(1);
    unmount();

    await act(async () => {
      response.resolve(frontendDispatchResponse());
      await pending;
    });

    expect(dispatchMock).not.toHaveBeenCalled();
  });
  it.each([{}, { type: 'not_wired' }])('rejects malformed success confirmation %j', async shape => {
    postMock.mockResolvedValue({ data: { success: true, ...shape } });
    const { result } = renderHook(() => useCoachCommandB2());
    await act(async () => { expect(await result.current.confirmCommand('op')).toMatchObject({ success: false, type: 'error' }); });
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('refuses captured execute, confirm and cancel after unbound actor A-B-A', async () => {
    postMock.mockResolvedValue(frontendDispatchResponse());
    const { result, rerender } = renderHook(() => useCoachCommandB2());
    const captured = result.current;
    authState.current.user = { id: '8', role: 'trainer' }; rerender();
    authState.current.user = { id: '7', role: 'trainer' }; rerender();
    await act(async () => {
      expect(await captured.executeCommand('stale')).toMatchObject({ superseded: true });
      expect(await captured.confirmCommand('old', 'digest', 'tap')).toMatchObject({ superseded: true });
      await captured.cancelCommand('old');
    });
    expect(postMock).not.toHaveBeenCalled();
  });

  it('keeps the newer operation busy when an older execute settles', async () => {
    const first = deferred<ReturnType<typeof frontendDispatchResponse>>();
    const second = deferred<ReturnType<typeof frontendDispatchResponse>>();
    postMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useCoachCommandB2());
    let old!: Promise<unknown>; let current!: Promise<unknown>;
    act(() => { old = result.current.executeCommand('old'); });
    act(() => { current = result.current.confirmCommand('new', 'exact', 'keyboard'); });
    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock.mock.calls[0][2]?.signal.aborted).toBe(true);
    await act(async () => { first.resolve(frontendDispatchResponse()); await old; });
    expect(result.current.executingCommand).toBe(true);
    expect(dispatchMock).not.toHaveBeenCalled();
    await act(async () => { second.resolve(frontendDispatchResponse()); await current; });
    expect(result.current.executingCommand).toBe(false);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });

  it('requires exact bound target and does not invent a confirmation channel', async () => {
    postMock.mockResolvedValue({ data: { success: true, type: 'executed', result: {} } });
    const { result } = renderHook(() => useCoachCommandB2(bind(() => snapshot())));
    await act(async () => {
      expect(await result.current.executeCommand('wrong target', { selectedClientId: 5151 })).toMatchObject({ superseded: true });
    });
    expect(postMock).not.toHaveBeenCalled();
    await act(async () => { await result.current.executeCommand('current target'); });
    expect(postMock.mock.calls[0][1].selectedClientId).toBe(4242);
    await act(async () => { await result.current.confirmCommand('op'); });
    expect(postMock.mock.calls[1][1]).toEqual({ operationId: 'op', renderedDigest: undefined, confirmChannel: undefined });
  });

  it('does not dispatch false-success confirm or unknown successful response as chat', async () => {
    postMock.mockResolvedValueOnce(frontendDispatchResponse(false));
    const { result } = renderHook(() => useCoachCommandB2());
    await act(async () => { expect(await result.current.confirmCommand('op')).toMatchObject({ success: false, type: 'error' }); });
    expect(dispatchMock).not.toHaveBeenCalled();
    postMock.mockResolvedValueOnce({ data: { success: true, type: 'unrecognized' } });
    await act(async () => { expect(await result.current.executeCommand('unknown')).toMatchObject({ type: 'error' }); });
  });

  it('preserves server confirmation policy and execute versus confirm debate envelopes', async () => {
    const { result } = renderHook(() => useCoachCommandB2());
    const policy = { operationId: 'op', tier: 'deliberate', physical: true, tierReasons: ['identity_crossing'], readBackSlots: [{ label: 'Client', value: '42' }] };
    postMock.mockResolvedValueOnce({ data: { success: true, type: 'confirmation_required', ...policy } });
    await act(async () => { expect(await result.current.executeCommand('review')).toMatchObject({ type: 'confirmation_required', ...policy }); });
    postMock.mockResolvedValueOnce({ data: { success: true, type: 'debate_started', jobId: 'job-a', debateType: 'plan' } });
    await act(async () => { expect(await result.current.executeCommand('debate')).toMatchObject({ type: 'debate_started', jobId: 'job-a', debateType: 'plan' }); });
    postMock.mockResolvedValueOnce({ data: { success: true, type: 'debate_started', result: { jobId: 'job-b', debateType: 'plan' } } });
    await act(async () => { expect(await result.current.confirmCommand('op')).toMatchObject({ success: true, type: 'debate_started', result: { jobId: 'job-b', debateType: 'plan' } }); });
  });

  it.each(['executed', 'frontend_dispatch', 'unknown'])('rejects contradictory fallback after %s', async type => {
    const { result } = renderHook(() => useCoachCommandB2());
    postMock.mockResolvedValue({ data: { success: true, type, fallbackToChat: true, event: 'AI_ADD_EXERCISE', payload: {} } });
    await act(async () => { expect(await result.current.executeCommand('contradiction')).toMatchObject({ type: 'error' }); });
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('checks live binding before confirm publication even without a React rerender', async () => {
    let live = snapshot();
    const response = deferred<ReturnType<typeof frontendDispatchResponse>>();
    postMock.mockReturnValue(response.promise);
    const { result } = renderHook(() => useCoachCommandB2(bind(() => live)));
    let pending!: Promise<unknown>;
    act(() => { pending = result.current.confirmCommand('op', 'digest', 'tap'); });
    expect(postMock).toHaveBeenCalledTimes(1);
    live = snapshot({ threadId: 902, generation: 2 });
    await act(async () => { response.resolve(frontendDispatchResponse()); expect(await pending).toMatchObject({ success: false, superseded: true }); });
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('does not publish a dispatch receipt after its listener retires the scope', async () => {
    let live = snapshot();
    postMock.mockResolvedValue(frontendDispatchResponse());
    dispatchMock.mockImplementation(() => { live = snapshot({ enabled: false }); return true; });
    const { result } = renderHook(() => useCoachCommandB2(bind(() => live)));
    await act(async () => { expect(await result.current.executeCommand('current')).toMatchObject({ superseded: true }); });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });

  it('retires local execute when cancel is issued without claiming server rollback', async () => {
    const response = deferred<ReturnType<typeof frontendDispatchResponse>>();
    postMock.mockReturnValueOnce(response.promise).mockResolvedValueOnce({ data: { success: false } });
    const { result } = renderHook(() => useCoachCommandB2());
    let old!: Promise<unknown>;
    act(() => { old = result.current.executeCommand('pending'); });
    await act(async () => { expect(await result.current.cancelCommand('op')).toBeUndefined(); });
    expect(postMock.mock.calls[0][2].signal.aborted).toBe(true);
    expect(postMock.mock.calls[1]).toEqual(['/api/ai-command/cancel', { operationId: 'op' }, expect.objectContaining({ signal: expect.any(AbortSignal), _isBackgroundRequest: true })]);
    await act(async () => { response.resolve(frontendDispatchResponse()); expect(await old).toMatchObject({ superseded: true }); });
    expect(dispatchMock).not.toHaveBeenCalled();
  });

});
