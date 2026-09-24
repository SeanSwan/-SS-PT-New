/**
 * G06/T30 — unique final segments for coach browser dictation.
 *
 * Speaker echo and engine restart re-emission must not duplicate a final
 * segment in the composer: one final draft segment per spoken segment.
 * Interim text stays display-only and never reaches the draft.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex?: number; results: ArrayLike<SpeechResult> };

class MockRecognition {
  static latest: MockRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: SpeechEvent) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    MockRecognition.latest = this;
  }
}

function emitResults(instance: MockRecognition, results: SpeechResult[], resultIndex = 0) {
  instance.onresult?.({ resultIndex, results });
}

function final_(transcript: string): SpeechResult {
  return { isFinal: true, 0: { transcript } };
}

function interim_(transcript: string): SpeechResult {
  return { isFinal: false, 0: { transcript } };
}

/** Replay the setText updater chain the way React would to observe the draft. */
function composedText(setText: ReturnType<typeof vi.fn>): string {
  let text = '';
  for (const [updater] of setText.mock.calls) {
    text = (updater as (previous: string) => string)(text);
  }
  return text;
}

async function renderSpeechProbe() {
  vi.resetModules();
  const { useCoachBrowserSpeechInput } = await import('./useCoachBrowserSpeechInput');
  const setText = vi.fn();

  function SpeechProbe() {
    const speech = useCoachBrowserSpeechInput({
      onRuntimeUnavailable: vi.fn(),
      setInputError: vi.fn(),
      setText,
    });
    return (
      <button
        type="button"
        aria-label={speech.listening ? 'Stop dictation' : 'Speech supported'}
        onClick={speech.toggleListening}
      >
        Toggle
      </button>
    );
  }

  render(<SpeechProbe />);
  return { setText };
}

function armDictation() {
  fireEvent.click(screen.getByRole('button', { name: 'Speech supported' }));
}

describe('useCoachBrowserSpeechInput unique final segments (G06/T30)', () => {
  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    MockRecognition.latest = null;
  });

  it('appends one spoken segment exactly once when the engine echoes the same final', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockRecognition;
    const { setText } = await renderSpeechProbe();
    armDictation();

    act(() => emitResults(MockRecognition.latest as MockRecognition, [final_('program push day')]));
    act(() => emitResults(MockRecognition.latest as MockRecognition, [final_('program push day')]));

    expect(composedText(setText)).toBe('program push day');
  });

  it('suppresses a duplicate final inside one event batch but keeps distinct finals', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockRecognition;
    const { setText } = await renderSpeechProbe();
    armDictation();

    act(() => emitResults(MockRecognition.latest as MockRecognition, [
      final_('bench press'),
      final_('bench press'),
      final_('three sets'),
    ]));

    expect(composedText(setText)).toBe('bench press three sets');
  });

  it('keeps interim text display-only so it never reaches the draft', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockRecognition;
    const { setText } = await renderSpeechProbe();
    armDictation();

    act(() => emitResults(MockRecognition.latest as MockRecognition, [interim_('program push')]));
    act(() => emitResults(MockRecognition.latest as MockRecognition, [interim_('program push day')]));

    expect(composedText(setText)).toBe('');
    expect(setText).not.toHaveBeenCalled();
  });

  it('dedupes across an engine restart while the session is still armed', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockRecognition;
    const { setText } = await renderSpeechProbe();
    armDictation();

    const first = MockRecognition.latest as MockRecognition;
    act(() => emitResults(first, [final_('log squats')]));
    act(() => {
      first.onend?.();
    });
    const restarted = MockRecognition.latest as MockRecognition;
    expect(restarted).not.toBe(first);
    act(() => emitResults(restarted, [final_('log squats')]));

    expect(composedText(setText)).toBe('log squats');
  });

  it('catches an adjacent [A, B] pair re-emitted by a restart, not just the last final', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockRecognition;
    const { setText } = await renderSpeechProbe();
    armDictation();

    const first = MockRecognition.latest as MockRecognition;
    act(() => emitResults(first, [final_('program push day'), final_('then mobility')]));
    act(() => {
      first.onend?.();
    });
    const restarted = MockRecognition.latest as MockRecognition;
    act(() => emitResults(restarted, [final_('program push day'), final_('then mobility')]));

    expect(composedText(setText)).toBe('program push day then mobility');
  });

  it('hostile round 2: a full-session re-emission of three finals lands once each', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockRecognition;
    const { setText } = await renderSpeechProbe();
    armDictation();

    const first = MockRecognition.latest as MockRecognition;
    act(() => emitResults(first, [
      final_('program push day'),
      final_('then mobility'),
      final_('then core'),
    ]));
    act(() => {
      first.onend?.();
    });
    const restarted = MockRecognition.latest as MockRecognition;
    act(() => emitResults(restarted, [
      final_('program push day'),
      final_('then mobility'),
      final_('then core'),
    ]));

    expect(composedText(setText)).toBe('program push day then mobility then core');
  });

  it('resets the dedupe cursor on a fresh arm so resumption is a new session', async () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockRecognition;
    const { setText } = await renderSpeechProbe();
    armDictation();

    act(() => emitResults(MockRecognition.latest as MockRecognition, [final_('yes')]));
    fireEvent.click(screen.getByRole('button', { name: 'Stop dictation' }));
    armDictation();
    act(() => emitResults(MockRecognition.latest as MockRecognition, [final_('yes')]));

    expect(composedText(setText)).toBe('yes yes');
  });
});
