/**
 * swanMarkLoop.ts — the two frame loops, and the only place rAF is called.
 *
 * WHY THIS IS ITS OWN MODULE
 * --------------------------
 * `swanMarkScene.ts` hit Rule 4's 300-line cap. The architecture's contingency clause
 * permits one cohesive presentation helper, and that budget was spent on
 * `swanMarkPresentation.ts` (draw / blit / report). This is the second, smaller
 * extraction, and it is genuinely a different concern from the first:
 *
 *   presentation — a frame REACHING the viewer, and the caller being TOLD.
 *   loop         — WHEN the next frame is scheduled, and when to stop scheduling.
 *
 * The split matters for the property the whole rework exists to protect. There are now
 * exactly two ways this component can consume frames, and both live here:
 *
 *   - `drift`  — continuous, ends when `setDrift(0)` is called.
 *   - `reveal` — finite, ends by itself at the analytic endpoint.
 *
 * Every other path in the file coalesces to a single frame. Keeping both loops in one
 * module makes that contract auditable in one place instead of scattered across a
 * controller that also builds renderers and sizes canvases.
 *
 * The reveal's arithmetic is NOT here — that is `swanMarkReveal.ts`. This module owns
 * the clock, the rAF handle and the stop conditions; it computes no poses of its own.
 */
import { HOME_REVEAL, revealStartPose, sampleReveal, type RevealSpec } from './swanMarkReveal';

export type LoopKind = 'drift' | 'reveal';

export interface LoopCallbacks {
  /** Apply a pose and render. Called once per scheduled frame. */
  onFrame(yaw: number, pitch: number): void;
  /** Render one coalesced frame without continuing any loop. */
  onSettle(): void;
  /** A reveal finished at its exact endpoint. */
  onRevealed(): void;
}

export interface SwanMarkLoop {
  /** Start the continuous loop, if nothing else owns the frame slot. */
  startDrift(radiansPerSecond: number): void;
  /** Change drift rate. 0 stops the loop and settles on the final pose. */
  setDrift(radiansPerSecond: number): void;
  /** Schedule one coalesced frame. No-op if a loop is already running. */
  requestFrame(): void;
  /** Begin the finite reveal. Returns false if one is running or already settled. */
  beginReveal(spec?: RevealSpec): boolean;
  /** Cancel whatever is scheduled. The caller then owns no frame. */
  stop(): void;
  readonly busy: boolean;
  readonly revealState: 'idle' | 'running' | 'settled';
  readonly progress: number;
}

export function createSwanMarkLoop(
  initialYaw: number,
  initialPitch: number,
  cb: LoopCallbacks,
  requestAnimationFrameImpl: typeof requestAnimationFrame = requestAnimationFrame,
  cancelAnimationFrameImpl: typeof cancelAnimationFrame = cancelAnimationFrame,
): SwanMarkLoop {
  let rafId = 0;
  let lastTs = 0;
  let yaw = initialYaw;
  let driftRate = 0;
  let stopped = false;

  // `revealStart` is the timestamp of the FIRST PRESENTED frame, not of the beginReveal
  // call: the wireframe swaps the poster for a frame at the poster's own pose and no
  // crossfade, so the clock cannot start until a frame has actually been blitted.
  //
  // It is `null` rather than `0` because `requestAnimationFrame` legitimately delivers a
  // timestamp of 0 on its first frame, and 0 is therefore not a safe "unset" marker.
  //
  // MEASURED, so the reasoning is on the record: with `0` as the sentinel the loop still
  // settles at the correct frame — a 0-anchored reveal reaches progress 1 at ts=720 on a
  // 16ms cadence either way, because `requestAnimationFrame`'s own timestamp is what
  // anchors it and so elapsed time and absolute time coincide. It is NOT an observable
  // defect today. It is a latent one: `revealStart = 0` inside this module already
  // produced exactly this failure before the extraction, and any future caller that
  // supplies its own clock (a test, a scheduler, a driver) reintroduces it immediately.
  // The explicit `null` costs nothing and removes the trap, so it stays.
  let revealState: 'idle' | 'running' | 'settled' = 'idle';
  let revealSpec: RevealSpec = HOME_REVEAL;
  let revealStart: number | null = null;
  let revealProgress = 0;

  const schedule = (fn: (ts: number) => void) => {
    rafId = requestAnimationFrameImpl(fn);
  };

  // Continuous. Ends only via setDrift(0) or stop().
  const tick = (ts: number) => {
    if (stopped) return;
    const dt = lastTs === 0 ? 0 : Math.min((ts - lastTs) / 1000, 0.1);
    lastTs = ts;
    yaw += driftRate * dt;
    cb.onFrame(yaw, initialPitch);
    schedule(tick);
  };

  // Finite. Drops to the coalesced path on the frame the sampler reports `done`, so a
  // 720ms reveal costs about forty-three frames once and never becomes an ambient loop.
  const tickReveal = (ts: number) => {
    if (stopped) return;
    if (revealStart === null) revealStart = ts;
    const { pose, progress, done } = sampleReveal(ts - revealStart, revealSpec);
    revealProgress = progress;
    revealState = done ? 'settled' : 'running';
    yaw = pose.yaw;
    cb.onFrame(pose.yaw, pose.pitch);
    if (done) {
      rafId = 0;
      cb.onRevealed();
      // The endpoint is analytic, so one coalesced frame lands exactly on it rather
      // than on the asymptote of the eased curve.
      if (driftRate === 0) cb.onSettle();
      return;
    }
    schedule(tickReveal);
  };

  const setDrift = (rate: number) => {
    driftRate = rate;
    if (rate !== 0) {
      // A running reveal owns the frame slot; drift must not overwrite its poses.
      if (rafId === 0 && revealState !== 'running') {
        lastTs = 0;
        schedule(tick);
      }
    } else if (rafId !== 0) {
      cancelAnimationFrameImpl(rafId);
      rafId = 0;
      cb.onSettle();
    }
  };

  return {
    startDrift: (rate) => setDrift(rate),
    setDrift,
    requestFrame: () => {
      if (stopped || rafId !== 0) return;
      schedule(() => {
        rafId = 0;
        cb.onSettle();
      });
    },
    beginReveal: (spec) => {
      if (stopped || revealState !== 'idle') return false;
      revealSpec = spec ?? HOME_REVEAL;
      // Begin at the spec's own opening pose so the frame that replaces the poster is
      // the pose the poster depicts; a first frame at yaw 0 would visibly snap.
      const start = revealStartPose(revealSpec);
      yaw = start.yaw;
      cb.onFrame(start.yaw, start.pitch);
      revealState = 'running';
      revealProgress = 0;
      revealStart = null;
      // Drift and a reveal contend for the same yaw and the reveal wins.
      if (driftRate !== 0) setDrift(0);
      if (rafId === 0) schedule(tickReveal);
      return true;
    },
    stop: () => {
      stopped = true;
      if (rafId !== 0) cancelAnimationFrameImpl(rafId);
      rafId = 0;
    },
    get busy() {
      return rafId !== 0;
    },
    get revealState() {
      return revealState;
    },
    get progress() {
      return revealProgress;
    },
  };
}
