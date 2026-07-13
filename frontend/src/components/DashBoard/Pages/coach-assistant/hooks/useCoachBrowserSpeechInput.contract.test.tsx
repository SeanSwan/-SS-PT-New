/**
 * useCoachBrowserSpeechInput dictation-contract regression
 * ========================================================
 * Locks the 2026-07-13 rework that fixed Sean's "stops recording early and
 * places what I started to say" report:
 * (1) NO silence-based auto-stop/auto-send — dictation runs until the user
 *     taps the mic again; finals stream into the composer for review.
 * (2) Finals are processed from event.resultIndex (or a fallback cursor),
 *     never re-appended — the old index-0 loop duplicated every earlier
 *     final on each new event.
 * (3) Engine-initiated ends (Chrome session caps, quiet gaps) transparently
 *     RESTART recognition while the user is still dictating; an intentional
 *     stop does not restart.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ResultEntry = { isFinal: boolean; 0: { transcript: string } };

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = [];
  static get latest(): MockSpeechRecognition | null {
    return MockSpeechRecognition.instances[MockSpeechRecognition.instances.length - 1] ?? null;
  }

  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: { resultIndex?: number; results: ArrayLike<ResultEntry> }) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });

  constructor() {
    MockSpeechRecognition.instances.push(this);
  }
}

const finalResult = (transcript: string): ResultEntry => ({ isFinal: true, 0: { transcript } });
const interimResult = (transcript: string): ResultEntry => ({ isFinal: false, 0: { transcript } });

function TextProbe() {
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  // Imported synchronously below via the harness renderProbe.
  const speech = (TextProbe as unknown as { useHook: any }).useHook({
    setText,
    setInputError: setError,
  });
  return (
    <div>
      <span data-testid="composer">{text}</span>
      <span data-testid="interim">{speech.interim}</span>
      <span data-testid="listening">{speech.listening ? 'on' : 'off'}</span>
      <span data-testid="error">{error ?? ''}</span>
      <button type="button" onClick={speech.toggleListening}>mic</button>
    </div>
  );
}

async function renderProbe() {
  vi.resetModules();
  const { useCoachBrowserSpeechInput } = await import('./useCoachBrowserSpeechInput');
  (TextProbe as unknown as { useHook: any }).useHook = useCoachBrowserSpeechInput;
  render(<TextProbe />);
}

describe('useCoachBrowserSpeechInput dictation contract', () => {
  beforeEach(() => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockSpeechRecognition;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    MockSpeechRecognition.instances = [];
  });

  it('keeps listening through silence — no auto-stop, no auto-send (the "stops early" regression)', async () => {
    await renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'mic' }));
    const recognition = MockSpeechRecognition.latest!;

    act(() => {
      recognition.onresult?.({ resultIndex: 0, results: [finalResult('I want to build')] });
    });
    // A long mid-sentence pause — the old code stopped + sent at 750ms.
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(recognition.stop).not.toHaveBeenCalled();
    expect(screen.getByTestId('listening')).toHaveTextContent('on');
    expect(screen.getByTestId('composer')).toHaveTextContent('I want to build');

    act(() => {
      recognition.onresult?.({ resultIndex: 1, results: [finalResult('I want to build'), finalResult('a new program')] });
    });
    expect(screen.getByTestId('composer')).toHaveTextContent('I want to build a new program');
  });

  it('never re-appends earlier finals (duplicate-words regression)', async () => {
    await renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'mic' }));
    const recognition = MockSpeechRecognition.latest!;

    act(() => {
      recognition.onresult?.({ resultIndex: 0, results: [finalResult('hello')] });
    });
    // Chrome keeps earlier finals in results on every subsequent event.
    act(() => {
      recognition.onresult?.({ resultIndex: 1, results: [finalResult('hello'), interimResult('world')] });
    });
    act(() => {
      recognition.onresult?.({ resultIndex: 1, results: [finalResult('hello'), finalResult('world')] });
    });

    expect(screen.getByTestId('composer').textContent).toBe('hello world');
  });

  it('dedupes via the fallback cursor when the engine omits resultIndex', async () => {
    await renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'mic' }));
    const recognition = MockSpeechRecognition.latest!;

    act(() => {
      recognition.onresult?.({ results: [finalResult('alpha')] });
    });
    act(() => {
      recognition.onresult?.({ results: [finalResult('alpha'), finalResult('beta')] });
    });

    expect(screen.getByTestId('composer').textContent).toBe('alpha beta');
  });

  it('restarts transparently when the engine ends while the user is still dictating', async () => {
    await renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'mic' }));
    expect(MockSpeechRecognition.instances).toHaveLength(1);

    // Engine-initiated end (session cap / quiet gap) — NOT a user stop.
    act(() => {
      MockSpeechRecognition.instances[0].onend?.();
    });

    expect(MockSpeechRecognition.instances).toHaveLength(2);
    expect(MockSpeechRecognition.latest!.start).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('listening')).toHaveTextContent('on');
  });

  it('an intentional mic tap stops for good — no restart, text stays for review', async () => {
    await renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'mic' }));
    const recognition = MockSpeechRecognition.latest!;
    act(() => {
      recognition.onresult?.({ resultIndex: 0, results: [finalResult('review me')] });
    });

    fireEvent.click(screen.getByRole('button', { name: 'mic' }));

    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(MockSpeechRecognition.instances).toHaveLength(1);
    expect(screen.getByTestId('listening')).toHaveTextContent('off');
    expect(screen.getByTestId('composer')).toHaveTextContent('review me');
  });

  it('ignores a LATE onend from an abandoned instance (stop -> quick restart ping-pong regression)', async () => {
    await renderProbe();
    const mic = screen.getByRole('button', { name: 'mic' });
    fireEvent.click(mic);
    const first = MockSpeechRecognition.latest!;
    // Detach onend so stop() does NOT fire it synchronously (real engines
    // deliver it asynchronously) — we replay it late, after a new session.
    const lateEnd = first.onend!;
    first.onend = null;

    fireEvent.click(mic); // intentional stop (ref nulled first)
    fireEvent.click(mic); // quick restart -> instance B
    expect(MockSpeechRecognition.instances).toHaveLength(2);

    act(() => {
      lateEnd(); // A's async end arrives AFTER B is live
    });

    // No spurious instance C; B remains the live session.
    expect(MockSpeechRecognition.instances).toHaveLength(2);
    expect(screen.getByTestId('listening')).toHaveTextContent('on');
  });

  it('quiet cycles (sessions living past the fast-end window) never burn the restart budget', async () => {
    await renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'mic' }));

    // 20 engine-initiated ends, each after >3s of session life — the Chrome
    // silence rhythm. Old budget logic died at 6; these must all restart.
    for (let i = 0; i < 20; i += 1) {
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      act(() => {
        MockSpeechRecognition.latest!.onend?.();
      });
    }

    expect(screen.getByTestId('listening')).toHaveTextContent('on');
    expect(screen.getByTestId('error').textContent).toBe('');
    expect(MockSpeechRecognition.instances).toHaveLength(21);
  });

  it('gives up with a runtime failure after the restart budget is exhausted', async () => {
    await renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'mic' }));

    // Exhaust MAX_AUTO_RESTARTS (6) + the attempt that trips the budget.
    for (let i = 0; i < 7; i += 1) {
      act(() => {
        MockSpeechRecognition.latest!.onend?.();
      });
    }

    expect(screen.getByTestId('listening')).toHaveTextContent('off');
    expect(screen.getByTestId('error').textContent).toMatch(/recorder fallback/i);
  });
});
