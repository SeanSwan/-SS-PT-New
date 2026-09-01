/**
 * useSheenPointer — regression tests for the two Run-2 engine defects (SWA-224)
 * =============================================================================
 * These are written as regressions against the artifact prototype, not as
 * happy-path coverage. Each of the first two suites asserts behaviour the
 * prototype demonstrably did NOT have, so if someone reintroduces the old shape
 * the test fails rather than the page merely getting slower and nobody noticing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSheenPointer, blendHex } from './useSheenPointer';

/** Minimal controllable rAF so frames are stepped explicitly, never by wall clock. */
function makeFrameDriver() {
  let queue: FrameRequestCallback[] = [];
  return {
    raf: (cb: FrameRequestCallback) => {
      queue.push(cb);
      return queue.length;
    },
    caf: () => {
      queue = [];
    },
    /** Run exactly one frame's worth of queued callbacks. */
    step() {
      const due = queue;
      queue = [];
      for (const cb of due) cb(0);
      return due.length;
    },
    get pending() {
      return queue.length;
    },
  };
}

/** Minimal event target so listeners can be fired deterministically. */
function makeTarget() {
  const map = new Map<string, Set<EventListener>>();
  return {
    addEventListener(type: string, fn: EventListener) {
      if (!map.has(type)) map.set(type, new Set());
      map.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: EventListener) {
      map.get(type)?.delete(fn);
    },
    emit(type: string, event: Partial<PointerEvent> = {}) {
      for (const fn of map.get(type) ?? []) fn(event as Event);
    },
    count(type: string) {
      return map.get(type)?.size ?? 0;
    },
  };
}

function elementAt(left: number, top: number, width = 100, height = 40) {
  const el = document.createElement('button');
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe('useSheenPointer — D1: scroll must not force layout per event', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('coalesces many scroll events into a single measure pass per frame', () => {
    const frames = makeFrameDriver();
    const target = makeTarget();
    const engine = createSheenPointer({
      target: target as unknown as Window,
      raf: frames.raf,
      caf: frames.caf,
      prefersReducedMotion: false,
    });

    engine.register(elementAt(0, 0));
    frames.step(); // initial measure
    const baseline = engine.measureCount;

    // The prototype called getBoundingClientRect() synchronously here, 20 times.
    for (let i = 0; i < 20; i += 1) target.emit('scroll');
    expect(engine.measureCount).toBe(baseline);

    frames.step();
    expect(engine.measureCount).toBe(baseline + 1);

    engine.destroy();
  });

  it('does not measure at all while nothing is dirty', () => {
    const frames = makeFrameDriver();
    const target = makeTarget();
    const engine = createSheenPointer({
      target: target as unknown as Window,
      raf: frames.raf,
      caf: frames.caf,
      prefersReducedMotion: false,
    });

    engine.register(elementAt(0, 0));
    frames.step();
    const after = engine.measureCount;

    frames.step();
    frames.step();
    expect(engine.measureCount).toBe(after);

    engine.destroy();
  });
});

describe('useSheenPointer — D2: distant surfaces must stop being styled', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('stops writing to a far surface once it is at rest, while a near one keeps updating', () => {
    const frames = makeFrameDriver();
    const target = makeTarget();
    const engine = createSheenPointer({
      target: target as unknown as Window,
      raf: frames.raf,
      caf: frames.caf,
      prefersReducedMotion: false,
    });

    const near = elementAt(0, 0);
    const far = elementAt(5000, 5000);
    engine.register(near);
    engine.register(far);
    frames.step();

    // Pointer sits on the near surface.
    target.emit('pointermove', { clientX: 50, clientY: 20 } as PointerEvent);
    for (let i = 0; i < 40; i += 1) frames.step();

    // The far surface must have been snapped to zero and then skipped.
    expect(far.style.getPropertyValue('--opac')).toBe('0');

    // Keep moving the pointer around the NEAR surface only.
    const writesSeen: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      target.emit('pointermove', { clientX: 50 + i, clientY: 20 } as PointerEvent);
      frames.step();
      writesSeen.push(engine.lastFrameWrites);
    }

    // The prototype wrote to BOTH surfaces on every one of these frames.
    expect(Math.max(...writesSeen)).toBeLessThanOrEqual(1);

    engine.destroy();
  });

  it('wakes a surface again when the pointer comes back to it', () => {
    const frames = makeFrameDriver();
    const target = makeTarget();
    const engine = createSheenPointer({
      target: target as unknown as Window,
      raf: frames.raf,
      caf: frames.caf,
      prefersReducedMotion: false,
    });

    const el = elementAt(0, 0);
    engine.register(el);
    frames.step();

    target.emit('pointermove', { clientX: 9000, clientY: 9000 } as PointerEvent);
    for (let i = 0; i < 40; i += 1) frames.step();
    expect(el.style.getPropertyValue('--opac')).toBe('0');

    target.emit('pointermove', { clientX: 50, clientY: 20 } as PointerEvent);
    for (let i = 0; i < 40; i += 1) frames.step();
    expect(Number(el.style.getPropertyValue('--opac'))).toBeGreaterThan(0.9);

    engine.destroy();
  });
});

describe('useSheenPointer — reduced motion and teardown', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('snaps instead of easing when reduced motion is requested', () => {
    const frames = makeFrameDriver();
    const target = makeTarget();
    const engine = createSheenPointer({
      target: target as unknown as Window,
      raf: frames.raf,
      caf: frames.caf,
      prefersReducedMotion: true,
    });

    const el = elementAt(0, 0);
    engine.register(el);
    frames.step();

    target.emit('pointermove', { clientX: 50, clientY: 20 } as PointerEvent);
    frames.step();

    // One frame is enough when interpolation is disabled.
    expect(Number(el.style.getPropertyValue('--opac'))).toBe(1);
    expect(el.style.getPropertyValue('--px')).toBe('50.00%');

    engine.destroy();
  });

  it('removes every listener on destroy', () => {
    const frames = makeFrameDriver();
    const target = makeTarget();
    const engine = createSheenPointer({
      target: target as unknown as Window,
      raf: frames.raf,
      caf: frames.caf,
    });

    expect(target.count('pointermove')).toBe(1);
    expect(target.count('scroll')).toBe(1);

    engine.destroy();

    expect(target.count('pointermove')).toBe(0);
    expect(target.count('scroll')).toBe(0);
    expect(target.count('resize')).toBe(0);
  });
});

describe('blendHex', () => {
  it('blends continuously across the width rather than flipping at the midpoint', () => {
    expect(blendHex('#000000', '#FFFFFF', 0)).toEqual([0, 0, 0]);
    expect(blendHex('#000000', '#FFFFFF', 1)).toEqual([255, 255, 255]);
    const mid = blendHex('#000000', '#FFFFFF', 0.5);
    expect(mid[0]).toBeGreaterThan(120);
    expect(mid[0]).toBeLessThan(136);
  });

  it('clamps out-of-range positions', () => {
    expect(blendHex('#000000', '#FFFFFF', -2)).toEqual([0, 0, 0]);
    expect(blendHex('#000000', '#FFFFFF', 4)).toEqual([255, 255, 255]);
  });
});
