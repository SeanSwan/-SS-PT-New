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

  /**
   * RE-ANCHORED (GLM S5). This previously asserted the WHOLE phrase rendered.
   * That put full spoken sentences — including client names — in large type on a
   * gym floor where anyone can read them, and contradicted the file's own
   * "counters, not a transcript" doctrine. Only the tail is shown now, which is
   * enough to prove Coach is hearing you. The truncation IS the security property,
   * so the test asserts the leading words are absent.
   */
  it('shows only the tail of the live partial, never the whole phrase', () => {
    renderOverlay();

    say('Sarah bench press one seven five', false);

    expect(screen.getByText('one seven five')).toBeInTheDocument();
    expect(screen.queryByText(/Sarah/)).not.toBeInTheDocument();
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
   *
   * ROUND-1 CHANGE (known R2): restarts are now PACED. An engine that dies
   * within 3s of starting (dead zone — Chrome's recogniser needs network) backs
   * off instead of hot-looping start/abort forever. A normal silence-window death
   * after a healthy run still restarts immediately.
   */
  it('paces the restart when the engine dies quickly, then restarts', () => {
    vi.useFakeTimers();
    try {
      renderOverlay();
      const before = startCalls;

      act(() => { engine?.onend?.(); });          // died < 3s after start

      expect(startCalls).toBe(before);            // NOT a synchronous hot restart
      act(() => { vi.advanceTimersByTime(1100); });
      expect(startCalls).toBeGreaterThan(before); // …but it does come back
    } finally {
      vi.useRealTimers();
    }
  });

  it('restarts immediately after a healthy run ends', () => {
    vi.useFakeTimers();
    try {
      renderOverlay();
      act(() => { vi.advanceTimersByTime(5000); });   // a healthy 5s of life
      const before = startCalls;

      act(() => { engine?.onend?.(); });

      expect(startCalls).toBeGreaterThan(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops listening when the session is paused', () => {
    renderOverlay();
    say('something');

    act(() => { screen.getByLabelText('Pause listening').click(); });

    expect(abortCalls).toBeGreaterThan(0);
  });
});

describe('CoachFreestyleOverlay — it stops listening when it should (GLM S1/S4)', () => {
  /**
   * GLM S4. `isOpen` only toggles visibility — the component stays mounted. The
   * session previously kept listening and the recogniser kept running behind
   * invisible UI, appending fragments nobody could see.
   */
  it('pauses when the overlay is hidden without unmounting', () => {
    const { rerender } = renderOverlay();
    say('something');
    const abortsBefore = abortCalls;

    rerender(
      <CoachFreestyleOverlay isOpen={false} accountKey="trainer-a" onClose={vi.fn()} />,
    );

    expect(abortCalls).toBeGreaterThan(abortsBefore);
  });

  /**
   * GLM S1. A TTL purge settles the machine to 'idle'. The old auto-start effect
   * keyed on `state === 'idle'`, so an overlay left open on a shared tablet
   * re-engaged the microphone every cycle — each one legitimately "purged" —
   * listening indefinitely to an empty room.
   */
  it('does not re-arm the microphone after the session returns to idle', () => {
    renderOverlay();
    say('something');
    const startsAfterFirstArm = startCalls;

    // Discard settles to 'idle' — the same state a TTL purge produces.
    act(() => { screen.getByLabelText('Discard session').click(); });
    act(() => { screen.getByLabelText('Confirm discard').click(); });

    expect(startCalls).toBe(startsAfterFirstArm);
  });

  /**
   * ROUND-1 REGRESSION (GLM HIGH). The closed overlay hides with CSS, so its
   * buttons still exist in the DOM. Activating the invisible "Resume" used to
   * take the microphone live behind closed UI — the engine-follow effect had no
   * isOpen gate. The session may change state; the ENGINE must not start.
   */
  it('does not start the engine for state changes while the overlay is closed', () => {
    const { rerender } = renderOverlay();
    say('something');
    rerender(
      <CoachFreestyleOverlay isOpen={false} accountKey="trainer-a" onClose={vi.fn()} />,
    );                                           // auto-paused by the close effect
    const startsWhileClosed = startCalls;

    // An invisible Resume press (keyboard reachability is CSS-dependent; the
    // engine gate must hold even if the click lands).
    act(() => { screen.getByLabelText('Resume listening').click(); });

    expect(startCalls).toBe(startsWhileClosed);
  });

  it('marks the closed overlay hidden for assistive technology', () => {
    const { rerender } = renderOverlay();
    rerender(
      <CoachFreestyleOverlay isOpen={false} accountKey="trainer-a" onClose={vi.fn()} />,
    );
    expect(screen.getByLabelText('Freestyle dictation')).toHaveAttribute('aria-hidden', 'true');
  });

  /**
   * ROUND-1 REGRESSION (Codex HIGH). Freestyle had no visibilitychange/pagehide
   * handling at all — backgrounding the tab left the recogniser (or its restart
   * loop) running. Same lifecycle doctrine as useCoachCapture.
   */
  it('pauses when the tab is hidden', () => {
    renderOverlay();
    say('something');
    const abortsBefore = abortCalls;

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    expect(abortCalls).toBeGreaterThan(abortsBefore);
    expect(screen.getByText('Paused. Nothing is being heard.')).toBeInTheDocument();
  });
});

describe('CoachFreestyleOverlay — failure is told the truth (known R5)', () => {
  /**
   * ROUND-1 REGRESSION. Permission denial used to leave the session 'listening':
   * the quiet counter narrated "Still listening. Nothing heard for 47s" — a lie
   * appended to the denial copy. Denial now fails the session.
   */
  it('a permission denial becomes a visible session failure, not a fake listen', () => {
    renderOverlay();

    act(() => { engine?.onerror?.({ error: 'not-allowed' }); });

    expect(screen.getByText(/microphone access/i)).toBeInTheDocument();
    expect(screen.queryByText(/Still listening/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Talk as long as you need/)).not.toBeInTheDocument();
  });

  /**
   * ROUND-1 REGRESSION (Kimi / GLM). The quiet readout used to interpolate a
   * per-second counter INSIDE the polite live region, so a screen reader
   * announced the countdown forever. The live string is now stable; the ticking
   * number lives in a separate aria-hidden element.
   */
  it('keeps the ticking quiet counter out of the live region', () => {
    vi.useFakeTimers();
    try {
      renderOverlay();
      say('a phrase');

      act(() => { vi.advanceTimersByTime(6000); });

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Still listening. Nothing heard for a little while.');
      expect(status.textContent).not.toMatch(/\d+s/);
      const counter = screen.getByText(/\d+s quiet/);
      expect(counter).toHaveAttribute('aria-hidden', 'true');
    } finally {
      vi.useRealTimers();
    }
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
    // Owner-stamped: a shared-tablet parent can never mis-attribute the words.
    expect(snapshot.accountKey).toBe('trainer-a');
  });

  /**
   * ROUND-1 REGRESSION (Codex MEDIUM). The words being spoken AS the thumb hits
   * Done were interim-only, never finalised, and vanished from the snapshot.
   * Done now flushes the pending interim through the session before stopping.
   */
  it('includes the in-flight interim phrase in the snapshot when Done is tapped', () => {
    const onStopped = vi.fn();
    renderOverlay(onStopped);

    say('logged the warm up', true);
    say('and the client hit one seventy five', false);   // still forming at the tap

    act(() => { screen.getByLabelText('Finish and review').click(); });

    const snapshot = onStopped.mock.calls[0][0] as FreestyleSnapshot;
    expect(snapshot.fragments).toHaveLength(2);
    expect(snapshot.fragments[1].text).toBe('and the client hit one seventy five');
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
