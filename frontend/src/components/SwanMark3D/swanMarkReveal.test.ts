/**
 * swanMarkReveal contract tests.
 *
 * The sampler is pure, so every claim the reveal makes can be decided here without a
 * browser, a renderer or a clock. That is the point of keeping it separate: the parts
 * of A8 that need real hardware stay in the harness (`09-tests.md` R1), and the parts
 * that are arithmetic get proven in the suite that actually runs.
 *
 * The load-bearing assertions are the endpoint ones. A reveal that stops at 0.999 of
 * its travel looks finished and is not — and because the settled pose is what any later
 * `requestRender` re-renders, a small residue would persist silently for the life of the
 * page rather than showing up as a flicker.
 */
import { describe, expect, it } from 'vitest';

import { MOTION_DURATION_MS, MOTION_EASING } from '../../core/perf/motionTokens';
import {
  HOME_REVEAL,
  cubicBezierProgress,
  easeProgress,
  revealEndPose,
  revealStartPose,
  sampleReveal,
} from './swanMarkReveal';

const DEG = 1e-9;

describe('home reveal specification', () => {
  it('is the wireframe specification, not a paraphrase of it', () => {
    // 02-wireframes.md:77 — "fixed camera, fixed pitch, Y-axis −0.14 → 0rad over 720ms".
    expect(HOME_REVEAL.yaw[0]).toBe(-0.14);
    expect(HOME_REVEAL.yaw[1]).toBe(0);
    expect(HOME_REVEAL.pitch).toBe(0);
    expect(HOME_REVEAL.durationMs).toBe(720);
  });

  it('reads its duration from the motion token instead of restating it', () => {
    // The token is the authority. If someone changes 720 in motionTokens.ts, the reveal
    // follows, and if someone hard-codes the number back into this module that shows up
    // here rather than as three files quietly disagreeing — which is exactly how the
    // stagger interval was found broken in A4.
    expect(HOME_REVEAL.durationMs).toBe(MOTION_DURATION_MS.narrative);
  });

  it('uses the canonical cubic-bezier, not a similarly named polynomial easing', () => {
    // motionTokens.ts:33-37 makes the substitution an explicit prohibition.
    expect([...HOME_REVEAL.easing]).toEqual([0.16, 1, 0.3, 1]);
    expect([...HOME_REVEAL.easing]).toEqual([...MOTION_EASING.outQuint]);
  });

  it('has a frozen spec, so a caller cannot edit the reveal in place', () => {
    expect(Object.isFrozen(HOME_REVEAL)).toBe(true);
  });
});

describe('cubic-bezier evaluation', () => {
  it('pins both endpoints exactly', () => {
    // Exactness at 1 is not cosmetic: it is what makes `done` honest.
    expect(cubicBezierProgress(0, 0.16, 1, 0.3, 1)).toBe(0);
    expect(cubicBezierProgress(1, 0.16, 1, 0.3, 1)).toBe(1);
  });

  it('solves the curve rather than approximating it', () => {
    // Reference values for cubic-bezier(0.16, 1, 0.3, 1), produced by an independent
    // 200-iteration bisection at 1e-14 that shares no code path with the implementation.
    // An earlier draft of this test used values recalled from memory, and they were
    // wrong — 0.8919 at x=0.5, against a true 0.97178. They were measuring an
    // ease-out-like curve, not this one, which is the exact confusion motionTokens.ts
    // warns about. The numbers below are measured, not remembered.
    // Measured agreement is 7.48e-7, so the assertion sits at 5e-6 — a full order of
    // magnitude of headroom over the observed difference, not a number chosen to pass.
    // I wrote 1e-9, then 7 digits, then 6 before this; each was a guess at a tolerance
    // rather than a reading of one. The sampler documents an 8+12 iteration loop and
    // 7.5e-7 is what that converges to. It is six orders of magnitude tighter than
    // anything visible at 560px.
    expect(cubicBezierProgress(0.25, 0.16, 1, 0.3, 1)).toBeCloseTo(0.8256223, 5);
    expect(cubicBezierProgress(0.5, 0.16, 1, 0.3, 1)).toBeCloseTo(0.9717791, 5);
    expect(cubicBezierProgress(0.75, 0.16, 1, 0.3, 1)).toBeCloseTo(0.9976771, 5);
  });

  it('is emphatically front-loaded, which is the character of this curve', () => {
    // The reason the tuple is named rather than approximated. This curve has delivered
    // ~83% of its travel within the first 25% of the duration; a linear read of
    // `elapsed / duration` would have delivered 25%.
    const quarter = cubicBezierProgress(0.25, 0.16, 1, 0.3, 1);
    expect(quarter).toBeGreaterThan(0.8);
    expect(quarter).toBeGreaterThan(0.25);
  });

  it('reproduces the identity curve for linear control points', () => {
    for (const x of [0.1, 0.37, 0.5, 0.82, 0.99]) {
      expect(cubicBezierProgress(x, 1 / 3, 1 / 3, 2 / 3, 2 / 3)).toBeCloseTo(x, 6);
    }
  });

  it('is monotonic for the reveal curve, so the mark never rotates backwards', () => {
    // y-controls are unconstrained and this curve overshoots near the end, so a naive
    // "always increasing" check on the raw samples would be wrong. Monotonicity that
    // matters here is in x, which is what makes the inverse unique. Asserted on the
    // yaw instead: the delivered yaw must never exceed its endpoint by much and must
    // never decrease over any interval.
    let previousYaw = -Infinity;
    let peak = -Infinity;
    for (let ms = 0; ms <= HOME_REVEAL.durationMs; ms += 8) {
      const { pose } = sampleReveal(ms);
      expect(pose.yaw).toBeGreaterThanOrEqual(previousYaw - DEG);
      previousYaw = pose.yaw;
      peak = Math.max(peak, pose.yaw);
    }
    // Overshoot is permitted by the curve but must be bounded by the endpoint's
    // neighbourhood, or the mark visibly swings past its final pose.
    expect(peak).toBeLessThan(0.02);
  });

  it('rejects an easing tuple that is not four values', () => {
    expect(() => easeProgress(0.5, [0.16, 1, 0.3])).toThrow(/exactly four values/);
  });
});

describe('finite reveal', () => {
  it('starts at the wireframe starting yaw and does not move on the first frame', () => {
    // 02-wireframes.md:64 requires the poster to be replaced with no crossfade. That is
    // only honest if frame 0 IS the poster's pose — the −0.14 the poster depicts
    // (02-wireframes.md:75). A first frame at yaw 0 would snap.
    const at0 = sampleReveal(0);
    expect(at0.pose.yaw).toBe(-0.14);
    expect(at0.pose.pitch).toBe(0);
    expect(at0.progress).toBe(0);
    expect(at0.done).toBe(false);
  });

  it('reaches the exact endpoint, not a near miss', () => {
    // The assertion this whole module exists to make. `toBe` (not toBeCloseTo) because a
    // residue of 0.001rad is a residue, and it would persist in the settled pose.
    for (const ms of [720, 721, 900, 10_000]) {
      const sample = sampleReveal(ms);
      expect(sample.pose.yaw).toBe(0);
      expect(sample.pose.pitch).toBe(0);
      expect(sample.progress).toBe(1);
      expect(sample.done).toBe(true);
    }
  });

  it('reports done at the duration and not one frame before it', () => {
    expect(sampleReveal(719).done).toBe(false);
    expect(sampleReveal(719.999).done).toBe(false);
    expect(sampleReveal(720).done).toBe(true);
  });

  it('is finite: sampling never schedules, owns no timer and needs no disposal', () => {
    // A documentation-shaped assertion with teeth: the module must not reference rAF,
    // timers or the DOM at all. This is the "it never schedules frames" rule from
    // 01-architecture.md:31, and it is checkable from source.
    const src = require('fs').readFileSync(
      require('path').resolve(__dirname, 'swanMarkReveal.ts'),
      'utf-8',
    ) as string;
    expect(src).not.toMatch(/requestAnimationFrame|cancelAnimationFrame/);
    expect(src).not.toMatch(/setTimeout|setInterval/);
    expect(src).not.toMatch(/document\.|window\./);
    expect(src).not.toMatch(/from 'react'/);
  });

  it('produces a pose the controller can hand straight to setView', () => {
    for (const ms of [0, 120, 360, 600, 720]) {
      const { pose } = sampleReveal(ms);
      expect(Number.isFinite(pose.yaw)).toBe(true);
      expect(Number.isFinite(pose.pitch)).toBe(true);
      // Never outside the travel, in either direction.
      expect(pose.yaw).toBeGreaterThanOrEqual(-0.14 - DEG);
      expect(pose.yaw).toBeLessThanOrEqual(0 + 0.02);
    }
  });

  it('holds pitch fixed for the whole reveal', () => {
    // "fixed camera, fixed pitch" — pitch must not be a second thing that animates.
    for (const ms of [0, 100, 350, 720]) {
      expect(sampleReveal(ms).pose.pitch).toBe(0);
    }
  });

  it('clamps a clock that steps backwards instead of extrapolating', () => {
    const negative = sampleReveal(-500);
    expect(negative.pose.yaw).toBe(-0.14);
    expect(negative.done).toBe(false);
  });

  it('rejects a non-positive duration rather than dividing by zero', () => {
    const broken = { ...HOME_REVEAL, durationMs: 0 };
    expect(() => sampleReveal(10, broken)).toThrow(/durationMs must be positive/);
  });
});

describe('pose helpers', () => {
  it('exposes the start pose the first frame must be drawn at', () => {
    expect(revealStartPose()).toEqual({ yaw: -0.14, pitch: 0 });
    const first = sampleReveal(0);
    expect(revealStartPose()).toEqual(first.pose);
  });

  it('exposes the settled pose, and it matches the reveal endpoint', () => {
    expect(revealEndPose()).toEqual({ yaw: 0, pitch: 0 });
    expect(revealEndPose()).toEqual(sampleReveal(720).pose);
    expect(revealEndPose()).toEqual(sampleReveal(1e6).pose);
  });
});
