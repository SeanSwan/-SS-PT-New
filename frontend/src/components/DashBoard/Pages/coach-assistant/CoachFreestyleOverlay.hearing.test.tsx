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

  /**
   * ROUND-3 REGRESSION (Codex). Resume only flipped session state; the engine
   * was then started by a passive effect — outside the tap, which iOS Safari
   * rejects. Resume now starts the engine inside the gesture, like Start.
   */
  it('resume starts the engine inside the tap', () => {
    renderOverlay();
    say('something');
    act(() => { screen.getByLabelText('Pause listening').click(); });
    const startsBefore = startCalls;

    act(() => { screen.getByLabelText('Resume listening').click(); });

    expect(startCalls).toBeGreaterThan(startsBefore);
  });

  /**
   * ROUND-3 REGRESSION (Codex). While the "delete this?" confirm was up the
   * mic stayed hot — an aside spoken during the decision joined the very
   * buffer under judgment. Arming now flushes the mid-flight words (so they
   * are judged with the rest) and releases the microphone.
   */
  it('arming the discard releases the microphone and keeps mid-flight words', () => {
    renderOverlay();
    say('captured phrase');
    say('words mid flight', false);                 // interim at the arm
    const abortsBefore = abortCalls;

    act(() => { screen.getByLabelText('Discard session').click(); });

    expect(abortCalls).toBeGreaterThan(abortsBefore);   // engine released
    // Both the final and the flushed interim are in the buffer under judgment.
    expect(screen.getByText('Fragments').previousSibling).toHaveTextContent('2');
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

  /**
   * ROUND-2 REGRESSION (self-review). handlePause flushed the pending interim
   * but the lifecycle paths did not — the words spoken as the screen locked
   * were lost on exactly the transition the lifecycle policy protects.
   */
  it('keeps the in-flight interim phrase when the tab hides mid-sentence', () => {
    renderOverlay();
    say('finished the last set at', false);        // interim when the screen locks

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

    // The interim was promoted to a real fragment before the pause landed.
    expect(screen.getByText('Fragments').previousSibling).toHaveTextContent('1');
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
   * ROUND-2 REGRESSION (Codex MED). On the render where the fatal error first
   * appeared, the session was still 'listening' and the engine-follow effect
   * re-started the engine the denial had just killed.
   */
  it('does not restart the engine after a fatal error', () => {
    renderOverlay();
    const startsBefore = startCalls;

    act(() => { engine?.onerror?.({ error: 'not-allowed' }); });

    expect(startCalls).toBe(startsBefore);
  });

  /**
   * ROUND-2 REGRESSION (Codex MED). Every flush path was gated on the
   * want-listening flag, which the denial handler had just cleared — a denial
   * arriving mid-sentence destroyed the pending words with the engine.
   */
  it('keeps the mid-sentence words when permission is revoked', () => {
    renderOverlay();
    say('client reports shoulder pain', false);   // interim when the denial lands

    act(() => { engine?.onerror?.({ error: 'not-allowed' }); });

    expect(screen.getByText('Fragments').previousSibling).toHaveTextContent('1');
  });

  /**
   * ROUND-2 REGRESSION (Codex HIGH). Error-with-words must not offer "Start
   * talking" — session.start() refuses there, and the affordance itself would
   * invite destroying captured words. Done and Discard remain.
   */
  it('offers Done, not Start talking, when a failed session holds words', () => {
    renderOverlay();
    say('captured before the failure');

    act(() => { engine?.onerror?.({ error: 'not-allowed' }); });

    expect(screen.queryByLabelText('Start talking')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Finish and review')).toBeInTheDocument();
  });

  /**
   * ROUND-2 REGRESSION (GLM MED). audio-capture — unplugged mic, dead headset —
   * fell through the error handler into the restart loop: infinite paced
   * retries, fail() never fired, "Still listening" narrated over a microphone
   * that would never return.
   */
  it('a disconnected microphone fails the session instead of retrying forever', () => {
    renderOverlay();
    say('words heard before', false);              // mid-sentence at disconnect
    const startsBefore = startCalls;

    act(() => { engine?.onerror?.({ error: 'audio-capture' }); });
    act(() => { engine?.onend?.(); });             // the engine dies after the error

    expect(startCalls).toBe(startsBefore);          // no restart loop
    expect(screen.getByText(/microphone was disconnected/i)).toBeInTheDocument();
    // The mid-sentence words survived into the failed session's buffer.
    expect(screen.getByText('Fragments').previousSibling).toHaveTextContent('1');
  });

  /**
   * ROUND-3 REGRESSION (GLM HIGH). On a browser with no Web Speech at all,
   * retrying via "Start talking" failed with the IDENTICAL error string — the
   * failure bridge (keyed on the string alone) never re-fired, the session sat
   * in 'listening', and the UI promised "Talk as long as you need" over an
   * engine that can never exist.
   */
  it('an unsupported browser can never reach the listening promise', () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    render(
      <CoachFreestyleOverlay isOpen accountKey="trainer-a" onClose={vi.fn()} />,
    );
    expect(screen.getByText(/cannot listen continuously/i)).toBeInTheDocument();

    const startButton = screen.queryByLabelText('Start talking');
    if (startButton) act(() => { startButton.click(); });   // the designed retry path

    expect(screen.queryByText(/Talk as long as you need/)).not.toBeInTheDocument();
    expect(screen.getByText(/cannot listen continuously/i)).toBeInTheDocument();
  });

  /**
   * ROUND-2 REGRESSION (GLM LOW). The 10s auto-disarm unmounted the confirm
   * with focus inside it, stranding keyboard focus on <body> in an open modal.
   */
  it('returns focus to the controls when the discard confirm auto-disarms', () => {
    vi.useFakeTimers();
    try {
      renderOverlay();
      say('real work');
      act(() => { screen.getByLabelText('Discard session').click(); });
      expect(screen.getByLabelText(/Keep it/)).toHaveFocus();

      act(() => { vi.advanceTimersByTime(10_000); });

      const active = document.activeElement;
      expect(active?.tagName).toBe('BUTTON');
      expect(screen.getByLabelText('Freestyle dictation').contains(active)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
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
