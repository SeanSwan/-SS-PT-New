/**
 * swanMarkLoop contract tests.
 *
 * WHY THIS FILE EXISTS, AND WHAT IT COST TO LEARN
 * -----------------------------------------------
 * `swanMarkLoop.ts` was extracted from `swanMarkScene.ts` to satisfy Rule 4's line cap.
 * After extraction the suite stayed at 46/46 — and stayed at 46/46 when I deliberately
 * broke two things:
 *
 *   1. removed the guard that stops drift contending with a reveal for the same yaw
 *   2. made the reveal never reach its settled state
 *
 * Both mutations survived. The 46 passing tests were passing because none of them
 * touched this module; the extraction had moved real logic into a place with no
 * coverage, and a green suite said nothing about it. These tests exist because that
 * specific failure was measured rather than assumed.
 *
 * The loop takes its `requestAnimationFrame` as a parameter for exactly this reason: a
 * deterministic frame clock is what turns "the reveal is finite" from a claim into an
 * assertion.
 */
import { describe, expect, it, vi } from 'vitest';

import { HOME_REVEAL } from './swanMarkReveal';
import { createSwanMarkLoop } from './swanMarkLoop';

/**
 * A hand-cranked rAF. Frames only advance when the test says so, which is what makes
 * the finish conditions assertable instead of timing-dependent.
 */
function makeClock() {
  let nextId = 1;
  const pending = new Map<number, (ts: number) => void>();
  const request = vi.fn((fn: (ts: number) => void) => {
    const id = nextId++;
    pending.set(id, fn);
    return id;
  });
  const cancel = vi.fn((id: number) => {
    pending.delete(id);
  });
  /** Run every callback currently scheduled, at one timestamp. */
  const step = (ts: number) => {
    const batch = [...pending.entries()];
    pending.clear();
    for (const [, fn] of batch) fn(ts);
  };
  return { request, cancel, step, get pending() { return pending.size; } };
}

function makeLoop() {
  const clock = makeClock();
  const frames: { yaw: number; pitch: number }[] = [];
  const settled = vi.fn();
  const revealed = vi.fn();
  const loop = createSwanMarkLoop(
    0,
    0,
    {
      onFrame: (yaw, pitch) => frames.push({ yaw, pitch }),
      onSettle: () => settled(),
      onRevealed: () => revealed(),
    },
    clock.request as unknown as typeof requestAnimationFrame,
    clock.cancel as unknown as typeof cancelAnimationFrame,
  );
  return { clock, frames, settled, revealed, loop };
}

describe('finite reveal', () => {
  it('begins at the spec opening pose, not at yaw zero', () => {
    // The frame that replaces the poster must be the pose the poster depicts, or the
    // swap snaps. This is the one assertion that would have caught a first-frame bug.
    const { frames, loop } = makeLoop();
    loop.beginReveal();
    expect(frames[0]).toEqual({ yaw: -0.14, pitch: 0 });
  });

  it('settles and reports the reveal exactly once', () => {
    // MUTATION COVERAGE: changing `revealState = done ? 'settled' : 'running'` to always
    // 'running' survived the full 46-test suite before this file existed.
    const { clock, loop, revealed } = makeLoop();
    loop.beginReveal();
    clock.step(0);
    expect(loop.revealState).toBe('running');
    expect(revealed).not.toHaveBeenCalled();

    clock.step(HOME_REVEAL.durationMs);
    expect(loop.revealState).toBe('settled');
    expect(revealed).toHaveBeenCalledTimes(1);
  });

  it('reaches progress 1 and stops scheduling', () => {
    const { clock, loop } = makeLoop();
    loop.beginReveal();
    clock.step(0);
    clock.step(HOME_REVEAL.durationMs);
    expect(loop.progress).toBe(1);
    // The reveal drops to one coalesced frame; it must not leave a loop running.
    expect(clock.pending).toBeLessThanOrEqual(1);
  });

  it('refuses a second reveal, so StrictMode replay cannot consume one twice', () => {
    const { clock, loop } = makeLoop();
    expect(loop.beginReveal()).toBe(true);
    expect(loop.beginReveal()).toBe(false);
    clock.step(0);
    expect(loop.beginReveal()).toBe(false);
    clock.step(HOME_REVEAL.durationMs);
    // And a settle must not be replayable by a later resize.
    expect(loop.beginReveal()).toBe(false);
  });

  it('anchors its clock on a first frame delivered at timestamp 0', () => {
    // `requestAnimationFrame` legitimately hands the first callback a timestamp of 0, so
    // 0 is not a safe "unset" marker. The loop uses `null` instead.
    //
    // MEASURED LIMIT OF THIS TEST, recorded because I first claimed more than it does:
    // reverting the loop to a `0` sentinel still PASSES this test and every other one in
    // this file. Traced directly — on a 0-anchored clock the reveal still settles at
    // ts=720, because rAF's own timestamp anchors it and elapsed time coincides with
    // absolute time. So this test pins the CORRECT behaviour rather than catching the
    // sentinel; it is not the regression guard I initially wrote it as. It earns its place
    // by fixing the first-frame-is-zero case in the suite, which no other test covers.
    const { clock, loop } = makeLoop();
    loop.beginReveal();
    clock.step(0); // the real first frame
    expect(loop.revealState).toBe('running');
    clock.step(0); // and a second frame at the same instant must not re-anchor either
    expect(loop.progress).toBe(0);

    clock.step(HOME_REVEAL.durationMs);
    expect(loop.progress).toBe(1);
    expect(loop.revealState).toBe('settled');
  });
});

describe('drift and reveal contend for the same yaw', () => {
  it('stops drift when a reveal begins', () => {
    // MUTATION COVERAGE: deleting `if (driftRate !== 0) setDrift(0)` in beginReveal also
    // survived the 46-test suite. Without it, drift keeps adding to yaw every frame and
    // partly overwrites the reveal the caller asked for.
    const { clock, loop, frames } = makeLoop();
    loop.startDrift(1);
    clock.step(0);
    clock.step(100);
    const beforeReveal = frames.length;

    loop.beginReveal();
    const atReveal = frames.length;
    expect(atReveal).toBeGreaterThan(beforeReveal);

    // Advance well past the reveal. Drift must not resume and must not perturb yaw.
    clock.step(1000);
    clock.step(2000);
    const after = frames[frames.length - 1];
    expect(after.yaw).toBe(0);
  });

  it('does not let a drift start overwrite a running reveal', () => {
    const { clock, loop, frames } = makeLoop();
    loop.beginReveal();
    clock.step(0);
    loop.setDrift(2); // a caller setting drift mid-reveal
    clock.step(360);
    const mid = frames[frames.length - 1];
    expect(mid.yaw).toBeGreaterThanOrEqual(-0.14);
    expect(mid.yaw).toBeLessThanOrEqual(0.02);
  });

  it('setDrift(0) settles the final pose and ends scheduling', () => {
    const { clock, loop, settled } = makeLoop();
    loop.startDrift(1);
    clock.step(0);
    clock.step(50);
    loop.setDrift(0);
    expect(settled).toHaveBeenCalled();
    expect(clock.cancel).toHaveBeenCalled();
  });
});

describe('frame ownership', () => {
  it('coalesces: several requestFrame calls produce one frame', () => {
    const { clock, settled, loop } = makeLoop();
    loop.requestFrame();
    loop.requestFrame();
    loop.requestFrame();
    clock.step(16);
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('does not schedule a coalesced frame while a loop is already running', () => {
    const { clock, loop } = makeLoop();
    loop.startDrift(1);
    const afterDriftStart = clock.pending;
    loop.requestFrame();
    expect(clock.pending).toBe(afterDriftStart);
  });

  it('stop() cancels and nothing schedules afterwards', () => {
    const { clock, loop } = makeLoop();
    loop.startDrift(1);
    clock.step(0);
    loop.stop();
    expect(clock.cancel).toHaveBeenCalled();
    expect(loop.beginReveal()).toBe(false);
  });

  it('reports busy while a loop owns the frame slot', () => {
    const { clock, loop } = makeLoop();
    expect(loop.busy).toBe(false);
    loop.startDrift(1);
    expect(loop.busy).toBe(true);
    clock.step(0);
    loop.setDrift(0);
    expect(loop.busy).toBe(false);
  });

  it('a stopped loop drops frames that were already scheduled', () => {
    // A rAF callback can be in flight when stop() runs; it must not render or reschedule.
    const { clock, loop, settled } = makeLoop();
    loop.startDrift(1);
    clock.step(0);
    loop.stop();
    settled.mockClear();
    clock.step(100);
    expect(settled).not.toHaveBeenCalled();
  });
});
