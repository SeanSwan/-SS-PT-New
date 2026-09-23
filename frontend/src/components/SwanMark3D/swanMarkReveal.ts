/**
 * swanMarkReveal.ts — the hero's finite reveal, as arithmetic.
 *
 * WHY THIS IS A SEPARATE MODULE FROM THE CONTROLLER
 * -------------------------------------------------
 * `swanMarkScene.ts` sits at 281 lines against Rule 4's 300-line cap, and that cap is
 * enforced by a test which lists its own file. A8 has roughly nineteen lines of
 * headroom there, so a reveal implemented inside the controller would either breach
 * the cap or force the controller to be restructured — and restructuring a module
 * whose two-canvas blit was tuned against in-browser measurement is exactly the kind
 * of "tidy-up" that silently degrades the mark.
 *
 * The split is also the correct boundary. This module is a pure function of elapsed
 * time: no React, no renderer, no canvas, no rAF, no timers. Everything that decides
 * *when* it is called and *which frame* gets rendered stays in the controller.
 * `01-architecture.md:31` states the rule — "`swanMarkReveal` computes a pose from
 * elapsed time; it never schedules frames."
 *
 * THE SPEC, AND WHY EVERY NUMBER IN IT IS IMPORTED
 * ------------------------------------------------
 * `02-wireframes.md:77`, verbatim:
 *
 *     Motion candidate: fixed camera, fixed pitch, Y-axis −0.14 → 0rad over 720ms;
 *     canonical cubic-bezier easing.
 *
 * "Canonical cubic-bezier easing" resolves to `MOTION_EASING.outQuint`,
 * `[0.16, 1, 0.3, 1]`. `motionTokens.ts:33–37` states that this tuple denotes *that
 * exact cubic-bezier curve* and that substituting a similarly named polynomial easing
 * is an explicit prohibition — so this module solves the bezier properly rather than
 * reaching for an ease-out approximation that would look close and measure differently.
 *
 * Note what is fixed and what moves. The camera does not orbit, the pitch does not
 * change, and the starting yaw is `−0.14` — the same `−0.14` the poster must depict
 * (`02-wireframes.md:75`). Only the Y-axis rotation animates, and only to zero. A
 * reveal that drifts the pitch or dollies the camera would break the poster/scene
 * correspondence the wireframes make load-bearing.
 */
import { MOTION_DURATION_MS, MOTION_EASING } from '../../core/perf/motionTokens';

/** A yaw/pitch pose in radians. Structurally compatible with the controller's setView. */
export interface RevealPose {
  /** Y-axis rotation. */
  yaw: number;
  /** X-axis rotation. Held constant across the whole reveal. */
  pitch: number;
}

/** A resolved reveal specification: fixed end pose, moving start, finite duration. */
export interface RevealSpec {
  yaw: readonly [from: number, to: number];
  pitch: number;
  durationMs: number;
  easing: readonly number[];
}

/**
 * The home reveal, per `02-wireframes.md:77`.
 *
 * The duration is read from `MOTION_DURATION_MS.narrative` rather than written as
 * `720`, and that is deliberate: the token is documented as "the signature narrative
 * beat. Explicit to the signature, NOT a helper default." Hard-coding the number here
 * would create the second authority the token module exists to prevent — the same
 * defect class A4 fixed when the stagger interval was found to be simultaneously 0.12,
 * 0.1 and 0.06 across three files. The value is 720ms; the token says so.
 */
export const HOME_REVEAL: RevealSpec = Object.freeze({
  yaw: [-0.14, 0] as const,
  pitch: 0,
  durationMs: MOTION_DURATION_MS.narrative,
  easing: MOTION_EASING.outQuint,
});

/**
 * Evaluates a CSS-style cubic-bezier timing function at a normalised progress.
 *
 * Returns the eased *progress* in `[0, 1]`, which is what a caller interpolates a
 * value with. This is not an approximation of the curve — it inverts
 * `x(t)` by Newton–Raphson with a bisection fallback, then reads `y(t)`. Both routines
 * are bounded (8 and 12 iterations), so this is safe to call from inside a render path.
 *
 * The x-control points are constrained to `[0, 1]`, which guarantees `x(t)` is
 * monotonic and therefore that the inverse exists and is unique. The y-control points
 * are unconstrained, so this returns overshoot correctly for curves that have it.
 * `[0.16, 1, 0.3, 1]` overshoots — that gentle overshoot past the endpoint and settle
 * is the character of the curve, and an ease-out polynomial would lose it.
 */
export function cubicBezierProgress(
  progress: number,
  controlX1: number,
  controlY1: number,
  controlX2: number,
  controlY2: number,
): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;

  // Cubic bezier with P0 = (0,0) and P3 = (1,1), expanded to polynomial form.
  const curveAt = (t: number, p1: number, p2: number): number => {
    const u = 1 - t;
    return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
  };
  const slopeAt = (t: number, p1: number, p2: number): number => {
    const u = 1 - t;
    return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (1 - p2);
  };

  let t = progress; // x is near-identity for most curves, so this is a good seed.
  for (let i = 0; i < 8; i += 1) {
    const x = curveAt(t, controlX1, controlX2) - progress;
    if (Math.abs(x) < 1e-6) return curveAt(t, controlY1, controlY2);
    const slope = slopeAt(t, controlX1, controlX2);
    if (Math.abs(slope) < 1e-6) break;
    t -= x / slope;
  }

  // Newton can leave the domain on a curve with a near-flat segment; bisection always
  // converges because x(t) is monotonic in t over [0, 1].
  let low = 0;
  let high = 1;
  t = progress;
  for (let i = 0; i < 12; i += 1) {
    const x = curveAt(t, controlX1, controlX2);
    if (Math.abs(x - progress) < 1e-6) break;
    if (x < progress) low = t;
    else high = t;
    t = (low + high) / 2;
  }
  return curveAt(t, controlY1, controlY2);
}

/** Applies a `MOTION_EASING` tuple to a normalised progress. */
export function easeProgress(progress: number, easing: readonly number[]): number {
  const [x1, y1, x2, y2] = easing;
  if (
    x1 === undefined ||
    y1 === undefined ||
    x2 === undefined ||
    y2 === undefined
  ) {
    throw new Error('easeProgress: an easing tuple needs exactly four values');
  }
  return cubicBezierProgress(progress, x1, y1, x2, y2);
}

/**
 * Samples the reveal at a point in time.
 *
 * `elapsedMs` is measured from the first presented frame, not from construction and
 * not from the call site — the controller owns that clock. Passing 0 yields the
 * starting pose and therefore produces no visible jump at the handover from poster
 * to scene, which is why `02-wireframes.md:64` can require a replacement with no
 * crossfade: the poster and the first frame are the same composition.
 *
 * The result is clamped at both ends. Negative input (a clock that steps backwards)
 * returns the start pose rather than extrapolating; input past the duration returns the
 * end pose exactly rather than at the asymptote of the curve. `done` reports that the
 * reveal is finite and finished, which is the controller's signal to stop scheduling.
 */
export function sampleReveal(
  elapsedMs: number,
  spec: RevealSpec = HOME_REVEAL,
): { pose: RevealPose; progress: number; done: boolean } {
  const duration = spec.durationMs;
  if (!(duration > 0)) {
    throw new Error('sampleReveal: durationMs must be positive');
  }

  if (!(elapsedMs > 0)) {
    return {
      pose: { yaw: spec.yaw[0], pitch: spec.pitch },
      progress: 0,
      done: false,
    };
  }
  if (elapsedMs >= duration) {
    return {
      pose: { yaw: spec.yaw[1], pitch: spec.pitch },
      progress: 1,
      done: true,
    };
  }

  const linear = elapsedMs / duration;
  const eased = easeProgress(linear, spec.easing);
  const [from, to] = spec.yaw;
  return {
    pose: { yaw: from + (to - from) * eased, pitch: spec.pitch },
    progress: eased,
    done: false,
  };
}

/**
 * The pose to show before the first frame: the start of the reveal.
 *
 * Exported because the controller must render its *first* frame at this pose. Creating
 * the scene at yaw 0 and then cutting to −0.14 on the first tick would show a visible
 * snap on exactly one frame — a defect that is easy to introduce, hard to see in a
 * still, and trivial to prevent by naming the starting pose.
 */
export function revealStartPose(spec: RevealSpec = HOME_REVEAL): RevealPose {
  return { yaw: spec.yaw[0], pitch: spec.pitch };
}

/** The settled pose. After this, no frame is needed until something else changes. */
export function revealEndPose(spec: RevealSpec = HOME_REVEAL): RevealPose {
  return { yaw: spec.yaw[1], pitch: spec.pitch };
}
