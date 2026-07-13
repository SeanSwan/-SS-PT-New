/**
 * useCoachBrowserSpeechInput runtime-failure regression
 * =====================================================
 * A browser may expose SpeechRecognition while its backing service fails.
 * The Coach mic must report that runtime failure so recorder capture can take over.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type RuntimeFailure = {
  message: string;
  canTryRecorder: boolean;
};

class MockSpeechRecognition {
  static latest: MockSpeechRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: { results: ArrayLike<never> }) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    MockSpeechRecognition.latest = this;
  }
}

async function renderSpeechProbe(onRuntimeUnavailable: (failure: RuntimeFailure) => void) {
  vi.resetModules();
  const { useCoachBrowserSpeechInput } = await import('./useCoachBrowserSpeechInput');

  function SpeechProbe() {
    const speech = useCoachBrowserSpeechInput({
      onRuntimeUnavailable,
      setInputError: vi.fn(),
      setText: vi.fn(),
    });

    return (
      <button
        type="button"
        aria-label={speech.speechSupported ? 'Speech supported' : 'Speech unavailable'}
        onClick={speech.toggleListening}
      >
        Toggle
      </button>
    );
  }

  render(<SpeechProbe />);
}

describe('useCoachBrowserSpeechInput runtime failure', () => {
  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    MockSpeechRecognition.latest = null;
  });

  it('marks browser speech unavailable and reports network failure for recorder failover', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockSpeechRecognition;
    const onRuntimeUnavailable = vi.fn();
    await renderSpeechProbe(onRuntimeUnavailable);

    fireEvent.click(screen.getByRole('button', { name: 'Speech supported' }));
    expect(MockSpeechRecognition.latest?.start).toHaveBeenCalledTimes(1);

    act(() => {
      MockSpeechRecognition.latest?.onerror?.({ error: 'network' });
    });

    expect(onRuntimeUnavailable).toHaveBeenCalledWith({
      message: expect.stringMatching(/browser dictation|speech service/i),
      canTryRecorder: true,
    });
    expect(screen.getByRole('button', { name: 'Speech unavailable' })).toBeInTheDocument();
  });

  it('does not recommend another microphone attempt when permission is blocked', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockSpeechRecognition;
    const onRuntimeUnavailable = vi.fn();
    await renderSpeechProbe(onRuntimeUnavailable);

    fireEvent.click(screen.getByRole('button', { name: 'Speech supported' }));
    act(() => {
      MockSpeechRecognition.latest?.onerror?.({ error: 'not-allowed' });
    });

    expect(onRuntimeUnavailable).toHaveBeenCalledWith({
      message: expect.stringMatching(/permission|access/i),
      canTryRecorder: false,
    });
  });
});
