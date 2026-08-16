/**
 * FILE: useFreestyleSession.test.ts
 * PURPOSE: Behaviour and retention guarantees for a freestyle dictation session.
 *
 * The privacy tests here are not incidental. A freestyle buffer is the most
 * PII-dense thing in the product — Sean talking freely about real clients by name
 * — so account-switch, TTL, discard and unmount purges are contract obligations,
 * not conveniences. See SWAN-COACH-FREESTYLE-RETENTION-CONTRACT-2026-08-16.md.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFreestyleSession, FREESTYLE_TTL_MS } from './useFreestyleSession';

/** Controllable clock — no test may depend on wall time. */
let clock = 0;
const now = () => clock;
const advance = (ms: number) => { clock += ms; };
/**
 * Moves the clock AND lets the hook's 1s ticker re-render. `elapsedMs` is derived
 * during render, so advancing the clock alone leaves a stale value — two tests
 * here previously "passed" against a reading taken before the time they claimed
 * to be measuring had elapsed.
 */
const advanceAndRender = (ms: number) => { clock += ms; vi.advanceTimersByTime(1000); };

beforeEach(() => {
  clock = 1_000_000;
  vi.useFakeTimers();
});

const setup = (accountKey: string | number | null = 'trainer-a', onPurge?: (r: string) => void) =>
  renderHook(
    ({ account }) => useFreestyleSession({ accountKey: account, now, onPurge }),
    { initialProps: { account: accountKey } },
  );

describe('freestyle session — capture', () => {
  it('starts idle and holds nothing', () => {
    const { result } = setup();
    expect(result.current.state).toBe('idle');
    expect(result.current.fragments).toHaveLength(0);
    expect(result.current.isActive).toBe(false);
  });

  it('accumulates fragments while listening', () => {
    const { result } = setup();
    act(() => { result.current.start(); });

    act(() => { advance(2000); result.current.appendFragment('Tuesday chest and triceps'); });
    act(() => { advance(3000); result.current.appendFragment('four sets of eight'); });

    expect(result.current.fragments).toHaveLength(2);
    expect(result.current.wordCount).toBe(8);
    // Timestamps are relative to session start — no wall clock leaves the device.
    expect(result.current.fragments[0].atMs).toBe(2000);
    expect(result.current.fragments[1].atMs).toBe(5000);
  });

  it('ignores empty and whitespace-only interim noise', () => {
    const { result } = setup();
    act(() => { result.current.start(); });

    act(() => { result.current.appendFragment('   '); });
    act(() => { result.current.appendFragment(''); });

    expect(result.current.fragments).toHaveLength(0);
  });

  /**
   * A fragment arriving after the user stopped must not silently reopen a session
   * they believe is closed — speech engines commonly emit a final result late.
   */
  it('drops fragments that arrive after stop instead of reopening the session', () => {
    const { result } = setup();
    act(() => { result.current.start(); });
    act(() => { result.current.appendFragment('one'); });
    act(() => { result.current.stop(); });

    act(() => { result.current.appendFragment('late arrival'); });

    expect(result.current.state).toBe('stopped');
    expect(result.current.fragments).toHaveLength(1);
  });

  it('drops fragments that arrive while paused', () => {
    const { result } = setup();
    act(() => { result.current.start(); });
    act(() => { result.current.pause(); });

    act(() => { result.current.appendFragment('should not land'); });

    expect(result.current.fragments).toHaveLength(0);
  });
});

describe('freestyle session — pause excluded from elapsed time', () => {
  it('does not count paused time as talking time', () => {
    const { result } = setup();
    act(() => { result.current.start(); });

    act(() => { advance(5000); result.current.pause(); });
    act(() => { advance(60_000); result.current.resume(); });   // a minute away
    act(() => { advanceAndRender(5000); });

    // 10s of speech, not 70s of wall clock.
    expect(result.current.elapsedMs).toBe(10_000);
  });

  it('excludes an in-progress pause from elapsed time as it accrues', () => {
    const { result } = setup();
    act(() => { result.current.start(); });
    act(() => { advance(4000); result.current.pause(); });

    act(() => { advanceAndRender(30_000); });

    expect(result.current.elapsedMs).toBe(4000);
  });

  it('resume is a no-op unless paused, and pause a no-op unless listening', () => {
    const { result } = setup();
    act(() => { result.current.resume(); });
    expect(result.current.state).toBe('idle');

    act(() => { result.current.start(); result.current.resume(); });
    expect(result.current.state).toBe('listening');

    act(() => { result.current.stop(); result.current.pause(); });
    expect(result.current.state).toBe('stopped');
  });
});

describe('freestyle session — discard is two-step', () => {
  /**
   * A ten-minute session is real, unrecoverable work. One mis-tap must not
   * destroy it, which is why arming and committing are separate calls.
   */
  it('requires arming before it will destroy a buffer', () => {
    const { result } = setup();
    act(() => { result.current.start(); result.current.appendFragment('real work'); });

    act(() => { result.current.requestDiscard(); });
    expect(result.current.discardPending).toBe(true);
    expect(result.current.fragments).toHaveLength(1);   // still intact

    act(() => { result.current.discard(); });
    expect(result.current.fragments).toHaveLength(0);
    // RE-ANCHORED (Fable F-6): discard used to settle in 'discarded', which was a
    // dead end — the overlay auto-starts only from 'idle' and hides Start in
    // terminal states, so a reopened overlay had no session and no way to make one.
    expect(result.current.state).toBe('idle');
  });

  it('can be backed out of without losing anything', () => {
    const { result } = setup();
    act(() => { result.current.start(); result.current.appendFragment('real work'); });

    act(() => { result.current.requestDiscard(); });
    act(() => { result.current.cancelDiscard(); });

    expect(result.current.discardPending).toBe(false);
    expect(result.current.fragments).toHaveLength(1);
    expect(result.current.state).toBe('listening');
  });
});

describe('freestyle session — readouts stop when capture does', () => {
  /** FABLE F-5: "Talking" kept climbing next to "Finished - N words captured". */
  it('freezes elapsed time at the moment of stop', () => {
    const { result } = setup();
    act(() => { result.current.start(); });
    act(() => { advance(8000); result.current.stop(); });
    const atStop = result.current.elapsedMs;

    act(() => { advanceAndRender(30_000); });

    expect(atStop).toBe(8000);
    expect(result.current.elapsedMs).toBe(8000);
  });
});

describe('freestyle session — discard leaves a usable surface', () => {
  /**
   * FABLE F-6: discard parked the machine in 'discarded'. The overlay auto-starts
   * only from 'idle' and hides Start in terminal states, so reopening after a
   * discard gave a dead screen — no session, no way to begin one.
   */
  it('settles to idle so a new session can begin', () => {
    const { result } = setup();
    act(() => { result.current.start(); result.current.appendFragment('work'); });
    act(() => { result.current.requestDiscard(); });
    act(() => { result.current.discard(); });

    expect(result.current.state).toBe('idle');
    expect(result.current.fragments).toHaveLength(0);

    act(() => { result.current.start(); });
    expect(result.current.state).toBe('listening');
  });
});

describe('freestyle session — retention contract', () => {
  /** The shared-gym-tablet guarantee. */
  it('purges the buffer when the account switches', () => {
    const onPurge = vi.fn();
    const { result, rerender } = renderHook(
      ({ account }) => useFreestyleSession({ accountKey: account, now, onPurge }),
      { initialProps: { account: 'trainer-a' as string } },
    );
    act(() => { result.current.start(); result.current.appendFragment('client notes'); });
    expect(result.current.fragments).toHaveLength(1);

    rerender({ account: 'trainer-b' });

    expect(result.current.fragments).toHaveLength(0);
    expect(result.current.state).toBe('idle');
    expect(onPurge).toHaveBeenCalledWith('account-switch');
  });

  it('does not purge when the account is unchanged across re-renders', () => {
    const onPurge = vi.fn();
    const { result, rerender } = renderHook(
      ({ account }) => useFreestyleSession({ accountKey: account, now, onPurge }),
      { initialProps: { account: 'trainer-a' as string } },
    );
    act(() => { result.current.start(); result.current.appendFragment('client notes'); });

    rerender({ account: 'trainer-a' });

    expect(result.current.fragments).toHaveLength(1);
    expect(onPurge).not.toHaveBeenCalled();
  });

  it('purges a buffer that outlives its TTL', () => {
    const onPurge = vi.fn();
    const { result } = setup('trainer-a', onPurge);
    act(() => { result.current.start(); result.current.appendFragment('client notes'); });

    act(() => {
      advance(FREESTYLE_TTL_MS + 1000);
      vi.advanceTimersByTime(1000);          // let the sweep run
    });

    expect(result.current.fragments).toHaveLength(0);
    expect(result.current.state).toBe('idle');
    expect(onPurge).toHaveBeenCalledWith('ttl');
  });

  it('keeps a buffer that is still inside its TTL', () => {
    const { result } = setup();
    act(() => { result.current.start(); result.current.appendFragment('client notes'); });

    act(() => {
      advance(FREESTYLE_TTL_MS - 60_000);
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.fragments).toHaveLength(1);
  });

  it('purges on unmount so a buffer cannot outlive its surface', () => {
    const onPurge = vi.fn();
    const { result, unmount } = setup('trainer-a', onPurge);
    act(() => { result.current.start(); result.current.appendFragment('client notes'); });

    unmount();

    expect(onPurge).toHaveBeenCalledWith('unmount');
  });
});

describe('freestyle session — write-free by construction', () => {
  /**
   * S2 must be incapable of writing. If a future change adds an apply path here
   * rather than in S7, this test is the tripwire.
   */
  it('exposes no method that could persist a record', () => {
    const { result } = setup();
    const surface = Object.keys(result.current);

    const writeShaped = surface.filter(k => /apply|save|commit|persist|submit|send/i.test(k));
    expect(writeShaped).toEqual([]);
  });
});
