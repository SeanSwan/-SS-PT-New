/**
 * FILE: CoachFreestyleOverlay.hearing.test.tsx
 * PURPOSE: Prove the freestyle surface actually hears, and that the buffer it
 *          hands out cannot be purged from under the receiver.
 *
 * Fable F-2 was that this overlay was DEAF: it mounted a session but nothing ever
 * called appendFragment, so the counters could only ever read zero while the status
 * line claimed to be listening. Its stated exit criterion was "a spoken word
 * increments the fragment counter". That is the first test here.
 *
 * Fable F-3 was that `onStopped` handed out the live buffer, so every purge trigger
 * afterwards emptied an array the receiver was still holding — making the retention
 * contract hollow the moment Done was tapped.
 *
 * The Web Speech API is faked at the window level, so the real useFreestyleSpeech,
 * the real useFreestyleSession and the real overlay all run.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import CoachFreestyleOverlay, { type FreestyleSnapshot } from './CoachFreestyleOverlay';

interface FakeResult { isFinal: boolean; 0: { transcript: string }; length: number }

/** The live recogniser instance the component created. */
let engine: {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<FakeResult> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
} | null = null;

let startCalls = 0;
let abortCalls = 0;

class FakeRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((e: { resultIndex: number; results: ArrayLike<FakeResult> }) => void) | null = null;
  onerror: ((e: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() { engine = this as unknown as typeof engine; }
  start() { startCalls += 1; }
  stop() { this.onend?.(); }
  abort() { abortCalls += 1; }
}

/** Emit a phrase as the browser would. */
const say = (transcript: string, isFinal = true) => {
  const result = { isFinal, 0: { transcript }, length: 1 } as FakeResult;
  act(() => {
    engine?.onresult?.({ resultIndex: 0, results: [result] });
  });
};

beforeEach(() => {
  engine = null;
  startCalls = 0;
  abortCalls = 0;
  (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = FakeRecognition;
});

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

const renderOverlay = (onStopped?: (s: FreestyleSnapshot) => void) =>
  render(
    <CoachFreestyleOverlay
      isOpen
      accountKey="trainer-a"
      onClose={vi.fn()}
      onStopped={onStopped}
    />,
  );

describe('CoachFreestyleOverlay — it actually hears (Fable F-2)', () => {
  it('a spoken phrase increments the fragment counter', () => {
    renderOverlay();
    expect(engine).not.toBeNull();          // the engine was started at all

    say('Tuesday chest and triceps');

    // Fable's exit criterion, expressed as an assertion.
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Fragments')).toBeInTheDocument();
  });

  it('counts words across several phrases', () => {
    renderOverlay();

    say('four sets of eight');
    say('then incline press');

    expect(screen.getByText('7')).toBeInTheDocument();   // 4 + 3 words
  });

  it('shows the live partial before a phrase is final', () => {
    renderOverlay();

    say('bench press one seven five', false);

    expect(screen.getByText(/bench press one seven five/)).toBeInTheDocument();
  });

  it('does not count an interim phrase as captured', () => {
    renderOverlay();

    say('still forming', false);

    // Interim text is display-only; the fragment counter must stay at zero.
    expect(screen.getByText('Fragments').previousSibling).toHaveTextContent('0');
  });

  /**
   * `continuous` is not honoured indefinitely — browsers end recognition after a
   * silence window, iOS Safari most aggressively. Without a restart a ten-minute
   * dictation dies at the first pause while the UI still claims to listen.
   */
  it('restarts the engine when the browser ends it mid-session', () => {
    renderOverlay();
    const before = startCalls;

    act(() => { engine?.onend?.(); });

    expect(startCalls).toBeGreaterThan(before);
  });

  it('stops listening when the session is paused', () => {
    renderOverlay();
    say('something');

    act(() => { screen.getByLabelText('Pause listening').click(); });

    expect(abortCalls).toBeGreaterThan(0);
  });
});

describe('CoachFreestyleOverlay — handoff cannot be purged (Fable F-3)', () => {
  it('hands out a frozen snapshot, not the live buffer', () => {
    const onStopped = vi.fn();
    renderOverlay(onStopped);

    say('client did four sets');
    act(() => { screen.getByLabelText('Finish and review').click(); });

    expect(onStopped).toHaveBeenCalledTimes(1);
    const snapshot = onStopped.mock.calls[0][0] as FreestyleSnapshot;

    expect(Object.isFrozen(snapshot.fragments)).toBe(true);
    expect(snapshot.fragments).toHaveLength(1);
    expect(snapshot.wordCount).toBe(4);
  });

  it('the snapshot survives a later purge of the session buffer', () => {
    const onStopped = vi.fn();
    const { unmount } = renderOverlay(onStopped);

    say('client did four sets');
    act(() => { screen.getByLabelText('Finish and review').click(); });
    const snapshot = onStopped.mock.calls[0][0] as FreestyleSnapshot;

    unmount();                                // fires the unmount purge

    // Previously the receiver held the session's own array, so this was 0.
    expect(snapshot.fragments).toHaveLength(1);
    expect(snapshot.fragments[0].text).toBe('client did four sets');
  });
});
