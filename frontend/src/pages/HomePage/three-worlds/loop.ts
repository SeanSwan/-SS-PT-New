/**
 * loop — the RAF frame loop factory for one mounted world.
 * @module pages/HomePage/three-worlds/loop
 *
 * Extracted from `runtime.ts` when the slot hand-off pushed that file past the
 * rule-4 line cap. The loop owns exactly one policy, and it is the reason this is
 * a module and not an inline closure: a scene that throws per-frame must STOP and
 * report ONCE. Letting it retry sixty times a second is a black rectangle pretending
 * to animate, and a frame counter that keeps climbing on a dead scene is the exact
 * false telemetry the diagnostics contract exists to prevent.
 */
import type * as THREE from 'three';
import type { WorldHandle } from './runtime';

export interface FrameLoop {
  start: () => void;
  stop: () => void;
  /** True while the RAF chain is live — the honest input for `data-running`. */
  isRunning: () => boolean;
}

export interface FrameLoopDeps {
  handle: WorldHandle;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  clock: THREE.Clock;
  /** Presented-frame counter, mutated in place; read by the diagnostics publisher. */
  framesRef: { current: number };
  /** Ensures a repeated per-frame failure is logged once, not sixty times a second. */
  reportedRef: { current: boolean };
  /** Called once per stopped loop with the formatted first-error message. */
  onError: (message: string) => void;
}

export function createFrameLoop(deps: FrameLoopDeps): FrameLoop {
  let raf = 0;
  let running = false;

  const frame = () => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(deps.clock.getDelta(), 0.05);
    try {
      deps.handle.update?.(dt, deps.clock.elapsedTime);
      deps.renderer.render(deps.scene, deps.camera);
      deps.framesRef.current += 1;
    } catch (err) {
      stop();
      const e = err as Error;
      if (!deps.reportedRef.current) {
        deps.reportedRef.current = true;
        // eslint-disable-next-line no-console
        console.error('[three-world] scene error', e?.message, e?.stack);
      }
      deps.onError(
        e?.stack
          ? `${e.message} @ ${e.stack.split('\n')[1]?.trim() ?? 'unknown'}`
          : String(e?.message ?? err),
      );
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    // Swallow the stale delta from the paused period so the first frame back does
    // not hand the scene a multi-second dt.
    deps.clock.getDelta();
    raf = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  return { start, stop, isRunning: () => running };
}
