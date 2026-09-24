/*
 * constellation-loop.test.ts — T-T2.
 *
 * The plan's bar, quoted:
 *
 *   "rAF controller: `document.hidden` → loop stops ≤1 frame; off-viewport
 *    (IntersectionObserver stub) → stops; remount → clean teardown (no leaked
 *    context)"
 *
 * The loop takes its clock and its rAF pair as PARAMETERS precisely so these can
 * be measured instead of inferred. jsdom has no rAF, so a test that used the
 * ambient one would be testing the mock — the same failure the D8 lesson names:
 * a green gate can mean the fixture avoided the defect.
 *
 * "Stops ≤1 frame" is asserted as a COUNT, not a status flag, because a status
 * flag reports the intent while the count reports the behaviour.
 */
import { describe, expect, it, vi } from 'vitest';
import { startLoop } from './constellation-loop';

/** A hand-driven frame pump: no timers, no real rAF, fully deterministic. */
function pump() {
  const queued: Array<{ h: number; cb: (t: number) => void }> = [];
  let nextHandle = 1;
  let t = 0;
  return {
    requestFrame: (cb: (t: number) => void) => { const h = nextHandle++; queued.push({ h, cb }); return h; },
    cancelFrame: (h: number) => { const i = queued.findIndex((q) => q.h === h); if (i >= 0) queued.splice(i, 1); },
    /** Run exactly the frames currently queued (one "tick" of the browser). */
    step(ms = 16) {
      const batch = queued.splice(0, queued.length);
      t += ms;
      for (const q of batch) q.cb(t);
      return batch.length;
    },
    queued: () => queued.length,
  };
}

describe('T-T2 the loop stops when the tab is hidden', () => {
  it('document.hidden stops it within ONE frame, and nothing re-arms', () => {
    const p = pump();
    let hidden = false;
    const loop = startLoop({
      requestFrame: p.requestFrame,
      cancelFrame: p.cancelFrame,
      isHidden: () => hidden,
      onFrame: () => {},
    });

    expect(p.step()).toBe(1);
    expect(loop.frames()).toBe(1);

    // ── the barrier: the tab is hidden between frames
    hidden = true;
    expect(p.step()).toBe(1); // the frame already queued still runs — see below
    expect(loop.frames()).toBe(1); // ...but it did NOT render
    expect(loop.stopped()).toBe(true);
    expect(p.queued()).toBe(0); // and nothing was re-armed

    // No further frames, ever.
    expect(p.step()).toBe(0);
    expect(loop.frames()).toBe(1);
  });

  it('an ALREADY-RENDERED frame is the last one; the count never grows after stop', () => {
    const p = pump();
    let hidden = false;
    const loop = startLoop({
      requestFrame: p.requestFrame, cancelFrame: p.cancelFrame, isHidden: () => hidden, onFrame: () => {},
    });
    p.step(); p.step(); p.step();
    expect(loop.frames()).toBe(3);
    hidden = true;
    p.step();
    const atStop = loop.frames();
    p.step(); p.step();
    expect(loop.frames()).toBe(atStop);
  });
});

describe('T-T2 the loop stops when off-viewport', () => {
  it('setVisible(false) stops rendering, and setVisible(true) resumes', () => {
    const p = pump();
    const loop = startLoop({
      requestFrame: p.requestFrame, cancelFrame: p.cancelFrame, isHidden: () => false, onFrame: () => {},
    });
    expect(p.step()).toBe(1);

    // ── the IntersectionObserver's lever, stubbed by hand
    loop.setVisible(false);
    p.step();
    const offscreen = loop.frames();

    p.step(); p.step();
    expect(loop.frames()).toBe(offscreen); // nothing rendered while off-screen
    expect(loop.stopped()).toBe(false); // ...but it is PAUSED, not dead

    loop.setVisible(true);
    p.step();
    expect(loop.frames()).toBe(offscreen + 1); // resumes on return
  });

  it('starts paused when the element is already off-viewport', () => {
    const p = pump();
    const loop = startLoop({
      requestFrame: p.requestFrame, cancelFrame: p.cancelFrame, isHidden: () => false,
      onFrame: () => {}, visible: false,
    });
    expect(p.step()).toBe(0);
    expect(loop.frames()).toBe(0);
  });
});

describe('T-T2 remount → clean teardown', () => {
  it('stop() cancels the queued frame and the count freezes', () => {
    const p = pump();
    const seen: number[] = [];
    const loop = startLoop({
      requestFrame: p.requestFrame, cancelFrame: p.cancelFrame, isHidden: () => false,
      onFrame: (ms) => seen.push(ms),
    });
    p.step(); p.step();
    const before = seen.length;

    // ── the barrier: unmount
    loop.stop();

    expect(p.queued()).toBe(0); // the pending frame was cancelled, not orphaned
    expect(loop.stopped()).toBe(true);
    p.step(); p.step();
    expect(seen.length).toBe(before); // the callback cannot fire again
  });

  it('stop() is idempotent — a double unmount is harmless', () => {
    const p = pump();
    const loop = startLoop({
      requestFrame: p.requestFrame, cancelFrame: p.cancelFrame, isHidden: () => false, onFrame: () => {},
    });
    p.step();
    loop.stop();
    expect(() => { loop.stop(); loop.stop(); }).not.toThrow();
    expect(loop.frames()).toBe(1);
  });

  it('a stop() after stop() does not resurrect the loop via setVisible', () => {
    const p = pump();
    const loop = startLoop({
      requestFrame: p.requestFrame, cancelFrame: p.cancelFrame, isHidden: () => false, onFrame: () => {},
    });
    loop.stop();
    loop.setVisible(true); // a late observer callback, arriving after teardown
    expect(p.step()).toBe(0);
    expect(loop.frames()).toBe(0);
  });
});

describe('T-T2 reduced motion is ONE frame, not an animation (T-E3 item 3)', () => {
  it('renders a static frame and stops', () => {
    const p = pump();
    const loop = startLoop({
      requestFrame: p.requestFrame, cancelFrame: p.cancelFrame, isHidden: () => false,
      onFrame: () => {}, reducedMotion: true,
    });
    expect(p.step()).toBe(1);
    expect(loop.frames()).toBe(1);
    expect(loop.stopped()).toBe(true);
    expect(p.queued()).toBe(0);

    p.step(); p.step();
    expect(loop.frames()).toBe(1); // still exactly one
  });
});

// ── D3 (Astra 2026-09-22, confirmed): visibility flapping must not multiply
// the loop. The tests above all DRAIN the pending frame between hide and show —
// the exact interleaving that hides the bug. This one deliberately does not.
describe('D3 flapping visibility must not multiply the loop', () => {
  it('hide -> show WITHOUT draining the pending frame keeps exactly ONE chain', () => {
    const p = pump();
    const loop = startLoop({
      requestFrame: p.requestFrame, cancelFrame: p.cancelFrame, isHidden: () => false, onFrame: () => {},
    });
    expect(p.step()).toBe(1);
    expect(loop.frames()).toBe(1);
    expect(p.queued()).toBe(1); // one re-armed chain

    // The observer's lever flips between two frames, before the pending one
    // runs — a scroll past the panel and straight back.
    loop.setVisible(false);
    loop.setVisible(true);

    // Pre-fix: setVisible(false) left the pending callback queued and
    // setVisible(true) armed a SECOND one, so two independent re-arm chains
    // now exist — frames multiply with every flap.
    expect(p.queued()).toBe(1); // the old chain was cancelled, not orphaned
    expect(p.step()).toBe(1);   // one browser tick runs exactly one callback
    expect(loop.frames()).toBe(2);

    // The chain stays singular going forward — a doubled chain would gain 2+.
    expect(p.step()).toBe(1);
    expect(loop.frames()).toBe(3);
  });
});

// ── D11 (Astra 2026-09-22): the rAF-ABSENT fallback must stamp frames with the
// SAME clock `last` was initialised with. It used `Date.now()` while startLoop
// used `performance.now()`, so the first fallback delta was epoch-sized and the
// entry dolly completed instantly on any browser without rAF.
describe('D11 the setTimeout fallback uses one clock, not two', () => {
  it('first fallback delta is near the scheduled interval, not epoch-sized', () => {
    // Two facts have to be pinned: the rAF-ABSENT path must actually run (jsdom
    // HAS rAF, so it is deleted for the duration — without that this test goes
    // green through the rAF path and proves nothing about the fallback), and the
    // two clocks must be given DIFFERENT epochs so any Date.now()/now() mix shows
    // up as a delta of millions rather than sliding through as zero.
    vi.useFakeTimers({ now: 5_000_000 }); // Date.now() epoch for the fallback
    const g = globalThis as { requestAnimationFrame?: unknown; cancelAnimationFrame?: unknown };
    const savedRAF = g.requestAnimationFrame;
    const savedCAF = g.cancelAnimationFrame;
    delete g.requestAnimationFrame;
    delete g.cancelAnimationFrame;
    try {
      let cur = 1_000_000; // the loop's `now()` epoch — deliberately NOT Date's
      const deltas: number[] = [];
      const loop = startLoop({
        isHidden: () => false,
        now: () => cur,
        onFrame: (ms) => deltas.push(ms),
      });
      cur += 16;
      vi.advanceTimersByTime(16);
      expect(deltas.length).toBe(1);
      // Pre-fix: fallback stamped with Date.now() (5,000,016) against a `last`
      // of 1,000,000 → delta ≈ 4,000,016, instantly completing the dolly.
      expect(deltas[0]).toBeGreaterThanOrEqual(0);
      expect(deltas[0]).toBeLessThan(1000);
      loop.stop();
    } finally {
      g.requestAnimationFrame = savedRAF;
      g.cancelAnimationFrame = savedCAF;
      vi.useRealTimers();
    }
  });
});
