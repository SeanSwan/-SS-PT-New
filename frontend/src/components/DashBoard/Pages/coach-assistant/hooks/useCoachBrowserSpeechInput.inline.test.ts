/**
 * useCoachBrowserSpeechInput — inline dictation mode (`autoSend: false`).
 *
 * The Web Speech API is stubbed rather than mocked at the hook boundary, so the
 * real recogniser wiring runs: result handling, the unfinalised-tail rescue, the
 * hot-mic visibility stop, and the fact that inline mode never dispatches.
 *
 * The legacy `autoSend: true` contract is asserted too, because two other
 * surfaces were built against it and this change had to leave it alone.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FakeResult = { isFinal: boolean; 0: { transcript: string } };

class FakeRecognition {
  static instances: FakeRecognition[] = [];

  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: { results: FakeResult[] }) => void) | null = null;
  onerror: ((event?: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  stopped = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() {
    this.stopped = false;
  }

  stop() {
    this.stopped = true;
    this.onend?.();
  }

  emit(parts: Array<{ final: boolean; text: string }>) {
    this.onresult?.({
      results: parts.map((part) => {
        const result = [{ transcript: part.text }] as unknown as FakeResult;
        result.isFinal = part.final;
        return result;
      }),
    });
  }

  /** Mirrors the browser: `onerror` carries a code, then `onend` always fires. */
  emitError(code: string) {
    this.onerror?.({ error: code });
    this.onend?.();
  }
}

// Must be installed before the module is evaluated: it reads window.SpeechRecognition
// once, at import time.
(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeRecognition;

const { useCoachBrowserSpeechInput } = await import('./useCoachBrowserSpeechInput');

const lastRecognition = () => {
  const instance = FakeRecognition.instances.at(-1);
  if (!instance) throw new Error('no recognition instance was created');
  return instance;
};

function renderSpeech(autoSend: boolean) {
  const onSend = vi.fn();
  const setInputError = vi.fn();
  const setText = vi.fn();
  const view = renderHook(() => useCoachBrowserSpeechInput({
    autoSend,
    maxChars: 4000,
    onSend,
    setInputError,
    setText,
  }));
  return { ...view, onSend, setInputError, setText };
}

/** Apply the most recent functional `setText` updater to a starting value. */
const applyLastSetText = (setText: ReturnType<typeof vi.fn>, starting: string): string => {
  const updater = setText.mock.calls.at(-1)?.[0];
  return typeof updater === 'function' ? updater(starting) : String(updater);
};

const setVisibility = (value: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useCoachBrowserSpeechInput — inline mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeRecognition.instances = [];
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('streams recognised words into the field', () => {
    const { result, setText } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    expect(result.current.listening).toBe(true);

    act(() => { lastRecognition().emit([{ final: true, text: 'log squats' }]); });

    expect(applyLastSetText(setText, '')).toBe('log squats');
  });

  it('exposes interim words without writing them to the field twice', () => {
    const { result } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emit([{ final: false, text: 'three by ten' }]); });

    expect(result.current.interim).toBe('three by ten');
  });

  /** The whole point: nothing is dispatched until the speaker presses Send. */
  it('never dispatches, however long the speaker pauses', () => {
    const { result, onSend } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emit([{ final: true, text: 'log squats three by ten' }]); });
    act(() => { vi.advanceTimersByTime(10_000); });

    expect(onSend).not.toHaveBeenCalled();
    expect(result.current.cancelPillVisible).toBe(false);
  });

  it('rescues a tail the recogniser never promoted to final when stopped', () => {
    const { result, setText } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emit([{ final: true, text: 'log squats' }]); });
    act(() => { lastRecognition().emit([{ final: false, text: ' three by ten' }]); });
    act(() => { result.current.stopListening(); });

    // Without the rescue the last two words are lost silently.
    expect(applyLastSetText(setText, 'log squats')).toBe('log squats three by ten');
    expect(result.current.listening).toBe(false);
  });

  it('discards the tail when the composer is submitted mid-dictation', () => {
    const { result, setText } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emit([{ final: true, text: 'log squats' }]); });
    act(() => { lastRecognition().emit([{ final: false, text: ' three by ten' }]); });
    const callsBeforeCancel = setText.mock.calls.length;
    act(() => { result.current.cancelListening(); });

    // No append after the cancel — the message being sent is already decided.
    expect(setText.mock.calls.length).toBe(callsBeforeCancel);
    expect(result.current.listening).toBe(false);
  });

  /**
   * Hot-mic hygiene: the recogniser used to outlive a tab switch, leaving the
   * microphone open on a page nobody was speaking to.
   */
  it('releases the microphone when the tab is hidden', () => {
    const { result } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    const recognition = lastRecognition();

    act(() => { setVisibility('hidden'); });

    expect(recognition.stopped).toBe(true);
    expect(result.current.listening).toBe(false);
  });

  /**
   * A missing separator was invisible while `autoSend` cleared the field on
   * every dispatch. Inline dictation KEEPS the field, so the defect became
   * reachable on the dock: type "bench press", dictate "225 for 5", and get
   * "bench press225 for 5".
   */
  it('separates dictated words from text already in the field', () => {
    const { result, setText } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emit([{ final: true, text: '225 for 5' }]); });

    expect(applyLastSetText(setText, 'bench press')).toBe('bench press 225 for 5');
  });

  it('reports whether anything was heard at all', () => {
    const { result } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    expect(result.current.heardSpeech).toBe(false);

    // Interim counts: the speaker said it, even if it never finalised.
    act(() => { lastRecognition().emit([{ final: false, text: 'three by ten' }]); });
    expect(result.current.heardSpeech).toBe(true);
  });

  /**
   * The recogniser's failure was swallowed entirely, so a denied microphone
   * left the dock's status line promising "Listening — talk, then press the mic
   * to stop" over an engine that had already died.
   */
  it('surfaces a denied microphone as an actionable error', () => {
    const { result } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emitError('not-allowed'); });

    expect(result.current.error).toMatch(/microphone access/i);
    expect(result.current.listening).toBe(false);
  });

  /**
   * `aborted` is what our own stop() produces, and `no-speech` is a quiet room
   * — the recogniser keeps listening through both. Flagging either would put a
   * red banner over a working microphone.
   */
  it('does not treat a quiet room or our own stop as a failure', () => {
    const { result } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emitError('no-speech'); });
    expect(result.current.error).toBeNull();

    act(() => { lastRecognition().emitError('aborted'); });
    expect(result.current.error).toBeNull();
  });

  it('clears a previous failure when the speaker tries again', () => {
    const { result } = renderSpeech(false);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emitError('not-allowed'); });
    expect(result.current.error).not.toBeNull();

    act(() => { result.current.toggleListening(); });
    expect(result.current.error).toBeNull();
  });
});

describe('useCoachBrowserSpeechInput — legacy auto-send mode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeRecognition.instances = [];
    setVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('still dispatches one spoken command after the quiet window', () => {
    const { result, onSend } = renderSpeech(true);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emit([{ final: true, text: 'log squats three by ten' }]); });

    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.cancelPillVisible).toBe(true);

    act(() => { vi.advanceTimersByTime(2000); });

    expect(onSend).toHaveBeenCalledWith('log squats three by ten');
  });

  it('lets the speaker cancel inside the window', () => {
    const { result, onSend } = renderSpeech(true);

    act(() => { result.current.toggleListening(); });
    act(() => { lastRecognition().emit([{ final: true, text: 'log squats three by ten' }]); });
    act(() => { vi.advanceTimersByTime(800); });
    act(() => { result.current.handleCancelSend(); });
    act(() => { vi.advanceTimersByTime(5000); });

    expect(onSend).not.toHaveBeenCalled();
  });
});
