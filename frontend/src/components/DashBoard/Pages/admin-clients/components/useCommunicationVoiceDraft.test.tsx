import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCommunicationVoiceDraft } from './useCommunicationVoiceDraft';

class FakeSpeechRecognition {
  static instance: FakeSpeechRecognition | null = null;

  interimResults = false;
  lang = '';
  maxAlternatives = 0;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null = null;
  abort = vi.fn();
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    FakeSpeechRecognition.instance = this;
  }
}

function setSpeechRecognition(value: unknown) {
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true,
    value,
  });
}

describe('useCommunicationVoiceDraft', () => {
  afterEach(() => {
    setSpeechRecognition(undefined);
    FakeSpeechRecognition.instance = null;
  });

  it('captures browser speech into the outgoing communication draft', () => {
    setSpeechRecognition(FakeSpeechRecognition);
    const onStatus = vi.fn();
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useCommunicationVoiceDraft({ onStatus, onTranscript }));

    act(() => result.current.toggle());

    expect(result.current.listening).toBe(true);
    expect(FakeSpeechRecognition.instance?.start).toHaveBeenCalledTimes(1);

    act(() => {
      FakeSpeechRecognition.instance?.onresult?.({
        results: [{ 0: { transcript: 'Please confirm tomorrow session' } }],
      });
    });

    expect(onTranscript).toHaveBeenCalledWith('Please confirm tomorrow session');
    expect(onStatus).toHaveBeenLastCalledWith('Voice message captured. Review it before sending.');
  });

  it('reports unsupported speech instead of pretending the mic works', () => {
    const onStatus = vi.fn();
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useCommunicationVoiceDraft({ onStatus, onTranscript }));

    act(() => result.current.toggle());

    expect(result.current.supported).toBe(false);
    expect(onTranscript).not.toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith('Voice messaging is not available in this browser. Type the message instead.');
  });

  it('appends only the new speech delta when browser results are cumulative', () => {
    setSpeechRecognition(FakeSpeechRecognition);
    const onStatus = vi.fn();
    const onTranscript = vi.fn();
    const { result } = renderHook(() => useCommunicationVoiceDraft({ onStatus, onTranscript }));

    act(() => result.current.toggle());
    act(() => {
      FakeSpeechRecognition.instance?.onresult?.({
        results: [{ 0: { transcript: 'Please confirm' } }],
      });
    });
    act(() => {
      FakeSpeechRecognition.instance?.onresult?.({
        results: [{ 0: { transcript: 'Please confirm tomorrow session' } }],
      });
    });

    expect(onTranscript).toHaveBeenNthCalledWith(1, 'Please confirm');
    expect(onTranscript).toHaveBeenNthCalledWith(2, 'tomorrow session');
  });
});
