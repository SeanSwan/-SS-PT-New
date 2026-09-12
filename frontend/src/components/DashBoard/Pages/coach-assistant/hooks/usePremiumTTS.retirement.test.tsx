import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import apiService from '../../../../../services/api.service';
import { usePremiumTTS } from './usePremiumTTS';
import type { PublicationBinding, PublicationSnapshot } from '../../../../../hooks/coachPublicationScope';

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

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => authState.current,
}));

vi.mock('../../../../../context/PaywallContext', () => ({
  usePaywall: () => paywallState,
}));

vi.mock('../../../../../services/api.service', () => ({
  default: { post: vi.fn() },
}));

type B2UsePremiumTTS = (
  binding?: PublicationBinding,
) => ReturnType<typeof usePremiumTTS>;

const usePremiumTTSB2 = usePremiumTTS as unknown as B2UsePremiumTTS;
const postMock = apiService.post as unknown as ReturnType<typeof vi.fn>;
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

class FakeAudio {
  static instances: FakeAudio[] = [];
  static playResults: Promise<void>[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentTime = 0;
  paused = false;
  play = vi.fn<() => Promise<void>>(() => FakeAudio.playResults.shift() ?? Promise.resolve());
  pause = vi.fn(() => { this.paused = true; });

  constructor(public readonly url: string) {
    FakeAudio.instances.push(this);
  }
}

const speech = {
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
  speak: vi.fn(),
};

const OriginalSpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance;
const OriginalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

function blobResponse(text = 'audio') {
  return { data: new Blob([text], { type: 'audio/wav' }) };
}

describe('usePremiumTTS B2 publication retirement', () => {
  beforeEach(() => {
    postMock.mockReset();
    FakeAudio.instances = [];
    FakeAudio.playResults = [];
    speech.cancel.mockReset();
    speech.getVoices.mockReset();
    speech.speak.mockReset();
    paywallState.showPaywall.mockReset();
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => `blob:${FakeAudio.instances.length + 1}`),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('speechSynthesis', speech);
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: unknown;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public readonly text: string) {}
    });
    authState.current.user = { id: '7', role: 'trainer' };
    authState.current.isAuthenticated = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (OriginalSpeechSynthesisUtterance) vi.stubGlobal('SpeechSynthesisUtterance', OriginalSpeechSynthesisUtterance);
    if (OriginalVisibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', OriginalVisibilityDescriptor);
    } else {
      Reflect.deleteProperty(document, 'visibilityState');
    }
  });

  it('does not create audio or browser speech when a pending TTS response retires', async () => {
    const response = deferred<ReturnType<typeof blobResponse>>();
    let live = snapshot();
    postMock.mockReturnValue(response.promise);
    const binding = bind(() => live);
    const { result, rerender } = renderHook(() => usePremiumTTSB2(binding));

    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('hello coach'); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock.mock.calls[0][2]).toEqual(expect.objectContaining({
      _isBackgroundRequest: true,
      signal: expect.any(AbortSignal),
    }));

    live = snapshot({ enabled: false });
    rerender();
    await act(async () => { response.resolve(blobResponse()); await Promise.resolve(); });

    expect(FakeAudio.instances).toHaveLength(0);
    expect(speech.speak).not.toHaveBeenCalled();
    expect(result.current.speaking).toBe(false);
  });

  it('stop and toggle-off retire pending work without revoking or clearing newer state', async () => {
    const first = deferred<ReturnType<typeof blobResponse>>();
    postMock.mockReturnValue(first.promise);
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('first'); });
    act(() => { result.current.stop(); });
    act(() => { result.current.toggleEnabled(); });
    await act(async () => { first.resolve(blobResponse('late')); await Promise.resolve(); });

    expect(FakeAudio.instances).toHaveLength(0);
    expect(speech.speak).not.toHaveBeenCalled();
    expect(result.current.speaking).toBe(false);
  });

  it('does not let an older play rejection invoke browser fallback for newer speech', async () => {
    const first = deferred<ReturnType<typeof blobResponse>>();
    const second = deferred<ReturnType<typeof blobResponse>>();
    const firstPlay = deferred<void>();
    FakeAudio.playResults = [firstPlay.promise];
    postMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });

    act(() => { result.current.speak('first'); });
    await act(async () => { first.resolve(blobResponse('first')); await Promise.resolve(); });
    expect(FakeAudio.instances).toHaveLength(1);

    act(() => { result.current.speak('second'); });
    await act(async () => { second.resolve(blobResponse('second')); await Promise.resolve(); });
    expect(FakeAudio.instances).toHaveLength(2);
    const secondAudio = FakeAudio.instances[1];
    const secondUrl = secondAudio.url;

    await act(async () => { firstPlay.reject(new Error('autoplay')); await Promise.resolve(); });
    expect(speech.speak).not.toHaveBeenCalled();
    expect(secondAudio.play).toHaveBeenCalledTimes(1);
    expect(result.current.speaking).toBe(true);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(secondUrl);
  });

  it('keeps current play rejection browser fallback and voice preference intact', async () => {
    const rejectedPlay = deferred<void>();
    FakeAudio.playResults = [rejectedPlay.promise];
    postMock.mockResolvedValue(blobResponse());
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.setVoice('Aoede'); });
    await act(async () => { result.current.speak('**hello** coach'); await Promise.resolve(); });
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    await act(async () => { rejectedPlay.reject(new Error('autoplay')); await Promise.resolve(); });

    expect(postMock).toHaveBeenCalledWith(
      '/api/ai-chat/tts',
      { text: 'hello coach', voice: 'Aoede' },
      expect.objectContaining({ _isBackgroundRequest: true, signal: expect.any(AbortSignal) }),
    );
    expect(speech.speak).toHaveBeenCalledTimes(1);
  });

  it('retires pending TTS on actor change, visibility change, and StrictMode unmount', async () => {
    const response = deferred<ReturnType<typeof blobResponse>>();
    let live = snapshot();
    postMock.mockReturnValue(response.promise);
    const binding = bind(() => live);
    const { result, rerender, unmount } = renderHook(
      () => usePremiumTTSB2(binding),
      { wrapper: StrictWrapper },
    );
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('pending'); });
    live = snapshot({ actorId: 8, generation: 2 });
    authState.current.user = { id: '8', role: 'trainer' };
    rerender();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    unmount();

    await act(async () => { response.resolve(blobResponse()); await Promise.resolve(); });
    expect(FakeAudio.instances).toHaveLength(0);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('does not let a captured actor-A speak issue after B and A-B-A rebinds', async () => {
    let live = snapshot();
    const binding = bind(() => live);
    postMock.mockReturnValue(new Promise(() => {}));
    const { result, rerender } = renderHook(() => usePremiumTTSB2(binding));
    act(() => { result.current.toggleEnabled(); });
    const capturedSpeak = result.current.speak;

    live = snapshot({ actorId: 8, generation: 2 });
    authState.current.user = { id: '8', role: 'trainer' };
    rerender();
    live = snapshot({ actorId: 7, generation: 3 });
    authState.current.user = { id: '7', role: 'trainer' };
    rerender();

    act(() => { capturedSpeak('stale actor A'); });
    expect(postMock).not.toHaveBeenCalled();
  });

  it('does not issue a captured enabled speak after toggle-off', async () => {
    const binding = bind(() => snapshot());
    postMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePremiumTTSB2(binding));

    act(() => { result.current.toggleEnabled(); });
    const capturedEnabledSpeak = result.current.speak;
    act(() => { result.current.toggleEnabled(); });
    act(() => { capturedEnabledSpeak('toggle-off stale'); });
    expect(postMock).not.toHaveBeenCalled();
  });

  it('does not issue a current speak after the document enters the background', async () => {
    const binding = bind(() => snapshot());
    postMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePremiumTTSB2(binding));

    act(() => { result.current.toggleEnabled(); });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { result.current.speak('background stale'); });
    expect(postMock).not.toHaveBeenCalled();
  });

  it('masks speaking inside the first render callback after an unbound actor change', async () => {
    const response = deferred<ReturnType<typeof blobResponse>>();
    postMock.mockReturnValue(response.promise);
    const observedDuringRender: boolean[] = [];
    const { result, rerender } = renderHook(() => {
      const value = usePremiumTTSB2();
      if (authState.current.user?.id === '8') observedDuringRender.push(value.speaking);
      return value;
    });

    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('actor A'); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    authState.current.user = { id: '8', role: 'trainer' };
    rerender();

    expect(observedDuringRender.length).toBeGreaterThan(0);
    expect(observedDuringRender.every(value => value === false)).toBe(true);
    await act(async () => { response.resolve(blobResponse()); await Promise.resolve(); });
  });

  it('masks speaking inside the first render callback after a same-actor bound target/thread change', async () => {
    const response = deferred<ReturnType<typeof blobResponse>>();
    let live = snapshot();
    const binding = bind(() => live);
    postMock.mockReturnValue(response.promise);
    const observedDuringRender: boolean[] = [];
    const { result, rerender } = renderHook(() => {
      const value = usePremiumTTSB2(binding);
      if (live.targetUserId === 5151 || live.threadId === 902) observedDuringRender.push(value.speaking);
      return value;
    });

    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('target A'); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    live = snapshot({ targetUserId: 5151, threadId: 902, generation: 2 });
    rerender();

    expect(observedDuringRender.length).toBeGreaterThan(0);
    expect(observedDuringRender.every(value => value === false)).toBe(true);
    await act(async () => { response.resolve(blobResponse()); await Promise.resolve(); });
  });

  it('retires a visibility-only pending response after proving the TTS POST was issued', async () => {
    const response = deferred<ReturnType<typeof blobResponse>>();
    postMock.mockReturnValue(response.promise);
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('visibility pending'); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await act(async () => { response.resolve(blobResponse()); await Promise.resolve(); });

    expect(FakeAudio.instances).toHaveLength(0);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('retires an unmount-only pending response after proving the TTS POST was issued', async () => {
    const response = deferred<ReturnType<typeof blobResponse>>();
    postMock.mockReturnValue(response.promise);
    const { result, unmount } = renderHook(() => usePremiumTTSB2(), { wrapper: StrictWrapper });
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('unmount pending'); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    unmount();

    await act(async () => { response.resolve(blobResponse()); await Promise.resolve(); });
    expect(FakeAudio.instances).toHaveLength(0);
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it.each(['onended', 'onerror'] as const)('ignores an old %s callback without clearing or revoking newer audio', async handler => {
    postMock.mockResolvedValue(blobResponse());
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('first audio'); });
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    const oldAudio = FakeAudio.instances[0];
    const oldHandler = oldAudio[handler];

    act(() => { result.current.speak('second audio'); });
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(2));
    const newerAudio = FakeAudio.instances[1];
    const newerUrl = newerAudio.url;
    expect(result.current.speaking).toBe(true);
    expect(newerAudio.play).toHaveBeenCalledTimes(1);

    oldHandler?.();
    expect(result.current.speaking).toBe(true);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(newerUrl);
  });

  it('shows the current 402 paywall and suppresses a retired 402', async () => {
    const paywall = Object.assign(new Error('plan limit'), {
      response: { status: 402, data: { featureName: 'Swan Coach', reason: 'limit' } },
    });
    postMock.mockRejectedValueOnce(paywall);
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('current limit'); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    await act(async () => { await Promise.resolve(); });
    expect(paywallState.showPaywall).toHaveBeenCalledWith(
      'Swan Coach',
      expect.objectContaining({ featureName: 'Swan Coach' }),
    );

    paywallState.showPaywall.mockClear();
    const response = deferred<ReturnType<typeof blobResponse>>();
    postMock.mockReturnValueOnce(response.promise);
    const bound = renderHook(() => usePremiumTTSB2());
    act(() => { bound.result.current.toggleEnabled(); });
    act(() => { bound.result.current.speak('retired limit'); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(2));
    act(() => { bound.result.current.stop(); });
    await act(async () => { response.reject(paywall); await Promise.resolve(); });
    expect(paywallState.showPaywall).not.toHaveBeenCalled();
  });
  it('decodes bounded JSON billing blobs and checks retirement after asynchronous decoding', async () => {
    const body = new Blob([JSON.stringify({ requiredTier: 'pro', featureName: 'Voice' })], { type: 'application/json' });
    Object.defineProperty(body, 'text', { value: vi.fn().mockResolvedValue(JSON.stringify({ requiredTier: 'pro', featureName: 'Voice' })) });
    postMock.mockRejectedValueOnce({ response: { status: 402, data: body } });
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    await act(async () => { result.current.speak('current'); await Promise.resolve(); });
    await waitFor(() => expect(paywallState.showPaywall).toHaveBeenCalledWith('Swan Coach', { requiredTier: 'pro', featureName: 'Voice' }));
    paywallState.showPaywall.mockClear(); speech.speak.mockClear();
    const decoded = deferred<string>();
    const late = new Blob(['{}'], { type: 'application/json' });
    const read = vi.fn(() => decoded.promise);
    Object.defineProperty(late, 'text', { value: read });
    postMock.mockRejectedValueOnce({ response: { status: 402, data: late } });
    act(() => { result.current.speak('retired'); });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    act(() => { result.current.stop(); });
    await act(async () => { decoded.resolve(JSON.stringify({ requiredTier: 'pro' })); await Promise.resolve(); });
    expect(paywallState.showPaywall).not.toHaveBeenCalled();
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it.each(['oversized', 'invalid-json', 'wrong-type'])('handles %s billing blobs without exposing opaque data', async kind => {
    const body = new Blob([kind === 'oversized' ? 'x'.repeat(32769) : '{}'], { type: kind === 'wrong-type' ? 'text/html' : 'application/json' });
    const read = vi.fn().mockResolvedValue('invalid-json');
    Object.defineProperty(body, 'text', { value: read });
    postMock.mockRejectedValueOnce({ response: { status: 402, data: body } });
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    await act(async () => { result.current.speak('current'); await Promise.resolve(); });
    await waitFor(() => expect(paywallState.showPaywall).toHaveBeenCalledWith('Swan Coach', {}));
    expect(read).toHaveBeenCalledTimes(kind === 'invalid-json' ? 1 : 0);
  });

  it('preserves authenticated raw-user speech without aliasing it to client or staff', async () => {
    authState.current.user = { id: '7', role: 'user' };
    postMock.mockReturnValue(new Promise(() => {}));
    const { result, rerender } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    const captured = result.current.speak;
    act(() => { result.current.speak('my speech'); });
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0][1]).toEqual({ text: 'my speech', voice: 'Kore' });
    authState.current.user = { id: '8', role: 'user' }; rerender();
    authState.current.user = { id: '7', role: 'user' }; rerender();
    act(() => { captured('stale user'); });
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0][2].signal.aborted).toBe(true);
  });

  it.each(['unknown', 'owner'])('does not grant unknown raw role %s speech authority', role => {
    authState.current.user = { id: '7', role };
    const { result } = renderHook(() => usePremiumTTSB2());
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('denied'); });
    expect(postMock).not.toHaveBeenCalled();
  });

  it('does not let raw-user speech adopt a staff/client publication binding', () => {
    authState.current.user = { id: '7', role: 'user' };
    const { result } = renderHook(() => usePremiumTTSB2(bind(() => snapshot())));
    act(() => { result.current.toggleEnabled(); });
    act(() => { result.current.speak('wrong authority'); });
    expect(postMock).not.toHaveBeenCalled();
  });

});
