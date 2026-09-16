/**
 * runtime — the shared Three.js world harness for all 20 front-page variants.
 * @module pages/HomePage/three-worlds/runtime
 *
 * WHY A SHARED RUNTIME: rule 4 caps files at 300 lines, and twenty pages each owning a
 * renderer, loop, resize and teardown would be twenty places to fix one GPU bug.
 *
 * HOUSE CANVAS RULES (from the precedent, HomePage/v-next/hero/OpticsCanvas.tsx):
 *   1. DPR capped at 2, 0.5x on a coarse pointer.
 *   2. The loop pauses BOTH offscreen (IntersectionObserver) AND on tab-hide; one
 *      without the other still burns battery.
 *   3. The canvas is pointer-events:none and aria-hidden, so it never swallows a CTA
 *      click and never enters the a11y tree. Every control is DOM.
 *   4. The loop only runs when `motion === 'live'`; reduced-motion and the essential
 *      tier get the committed poster (design-brain adapter §7).
 *
 * A hard render budget also applies, so co-mounted variants cannot exceed the browser's
 * WebGL context cap — see renderSlots.ts. The cap only means something if slots MOVE:
 * a world that scrolls off-screen (with a 25% hysteresis margin) is torn down entirely
 * — context destroyed, canvas removed, slot released — so a newly-visible world can
 * take it. Round-4 hostile review found the "off-screen worlds release their slot"
 * claim was not implemented: the first four worlds mounted held their slots forever,
 * so on a page of 20 the other sixteen showed posters even while on screen.
 *
 * CANVAS LIFECYCLE: the canvas is created HERE, per setup, inside the empty container
 * element the caller provides, and removed on teardown. A context lost via
 * forceContextLoss can never be re-gotten on the same canvas element (getContext
 * returns the same, now-lost, context), so the element must die with each teardown.
 * React owns the empty container; this hook owns the canvas. `opts.canvasId` labels
 * the canvas with `data-world-canvas` for QA. BOUNDS: no network, no storage, no
 * globals.
 */
import * as THREE from 'three';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { resolveColors } from './tokens';
import {
  publishDiag, primitiveCount, resolveMotion, hasWebGL, startDiagTimer, type MotionMode,
} from './diagnostics';
import { acquireSlot, releaseSlot, onSlotFreed } from './renderSlots';
import { observeHost, type Observed } from './observe';
import { createContextLossPolicy, attachContextLossListeners } from './contextLoss';
import { createFrameLoop } from './loop';
import { bootWorld } from './worldBoot';

// Re-exported so a caller needs one import to mount a world, rather than reaching
// into two modules to drive one canvas. These are aliases; the implementations
// live in `diagnostics.ts`.
export { resolveMotion, hasWebGL };
export type { MotionMode };

export interface WorldContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Live size in CSS pixels. Re-read each frame if you need the latest. */
  size: { width: number; height: number };
  /** Seconds since this world mounted. */
  clock: THREE.Clock;
  /** 0 → 1 progress through the host element's scroll range. */
  scrollProgress: number;
  /** Normalized pointer, -1 → 1 on both axes. Zero before first move. */
  pointer: { x: number; y: number };
  /** Colour tokens resolved from CSS custom properties, with Swan fallbacks. */
  colors: Record<string, THREE.Color>;
}

/** What `build` must return. `dispose` is optional but strongly encouraged. */
export interface WorldHandle {
  /** Advance the scene. `dt` seconds, `elapsed` seconds. */
  update?: (dt: number, elapsed: number) => void;
  /** Release geometries/materials/textures this variant created. */
  dispose?: () => void;
}

export type WorldBuilder = (ctx: WorldContext) => WorldHandle;

/**
 * Mount a Three.js world into the container element `canvasHostRef` points at.
 *
 * The container must be an EMPTY element the runtime may fill: the canvas is created
 * and destroyed by this hook (see the canvas-lifecycle note in the header), styled by
 * the container's own CSS. `opts.canvasId` labels the created canvas with a
 * `data-world-canvas` attribute so QA can find it.
 *
 * @returns `live` whether the world is animating, `lost` whether the GPU context
 *   was lost irrecoverably, `error` the first scene error, and `frames` how many
 *   frames were presented at the last render — a live canvas that never presented
 *   is a black box, so callers and QA should assert on the `data-frames` attribute
 *   the runtime republishes, not on this render-time number.
 */
export function useThreeWorld(
  canvasHostRef: RefObject<HTMLElement>,
  hostRef: RefObject<HTMLElement>,
  motion: MotionMode,
  build: WorldBuilder,
  opts?: { canvasId?: string },
): { live: boolean; lost: boolean; error: string | null; frames: number } {
  const [live, setLive] = useState(false);
  const [lost, setLost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Bumped when another world frees a render slot, so this one can retry. */
  const [slotTick, setSlotTick] = useState(0);
  /**
   * HAND-OFF. Flipping this to false tears the world down through the normal effect
   * cleanup — context destroyed, slot released — and a flip back to true rebuilds it.
   * The IO below carries a hysteresis margin so boundary jitter cannot flap a world
   * between teardown and rebuild on every scroll tick.
   */
  const [onScreen, setOnScreen] = useState(true);
  const buildRef = useRef(build);
  buildRef.current = build;
  /** Frames actually presented. A live canvas with 0 draws is a black rectangle. */
  const framesRef = useRef(0);
  /** Ensures a repeated per-frame failure is logged once, not sixty times a second. */
  const reportedRef = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    const canvasHost = canvasHostRef.current;
    // Poster path: no tier, no slot attempt, no context, nothing to clean up. An
    // off-screen world takes the same path — that IS the hand-off.
    if (!canvasHost || !host || motion !== 'live' || !onScreen) {
      setLive(false);
      return;
    }

    // RENDER BUDGET. Browsers cap live WebGL contexts (~8–16 in Chrome) and silently
    // evict the oldest, which fires `webglcontextlost` on a canvas that is still in
    // use — and a lost context is what makes Three's parseUniform dereference a null
    // uniform. Twenty co-mounted variants exceed that cap by construction, so the
    // budget is enforced here rather than discovered by the browser. A world without a
    // slot keeps its committed poster, which is the same static path reduced-motion uses.
    if (!acquireSlot()) {
      setLive(false);
      // Wake when another world gives its slot up, then try again.
      return onSlotFreed(() => setSlotTick((n) => n + 1));
    }

    // Canvas + renderer construction lives in worldBoot.ts (see that module for why
    // the canvas element is per-setup and must never be reused across a teardown).
    // A refused context MUST release the slot, or four failed mounts would
    // permanently exhaust the pool for the whole session.
    const boot = bootWorld(canvasHost, opts?.canvasId);
    if (!boot) {
      releaseSlot();
      setLive(false);
      return;
    }
    const { canvas, renderer, removeCanvas } = boot;

    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * (coarse ? 0.5 : 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    const clock = new THREE.Clock();
    const colors = resolveColors(host);
    // Re-resolve hook for the token-mutation probe. Without it the palette assertion is
    // tautological: the declarations are generated from the same table the resolver
    // reads, so a fallback count of zero is true by construction. The probe mutates a
    // token, re-resolves, and asserts the value CHANGED — the only check that fails if
    // the palette is inert.
    (host as HTMLElement & { __resolveColors?: () => void }).__resolveColors = () => resolveColors(host);
    const size = { width: 1, height: 1 };
    // Host-derived values. `scroll`/`pointer` are read by the context getters below,
    // so the observed object IS the source of truth the scenes see.
    const observed: Observed = { progress: 0, pointer: { x: 0, y: 0 } };

    const ctx: WorldContext = {
      scene, camera, renderer, size, clock, colors,
      get scrollProgress() { return observed.progress; },
      get pointer() { return observed.pointer; },
    };

    let handle: WorldHandle;
    try {
      handle = buildRef.current(ctx);
    } catch (err) {
      // Round-4 fix: this path previously disposed the renderer but never released
      // the slot or destroyed the context, and it returned no cleanup — so four
      // throwing scenes would permanently exhaust the pool for the whole session.
      renderer.forceContextLoss?.();
      renderer.dispose();
      removeCanvas();
      releaseSlot();
      setError(String((err as Error)?.message ?? err));
      setLive(false);
      return;
    }

    const resize = () => {
      const rect = host.getBoundingClientRect();
      size.width = Math.max(1, Math.round(rect.width));
      size.height = Math.max(1, Math.round(rect.height));
      renderer.setPixelRatio(dpr);
      renderer.setSize(size.width, size.height, false);
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    };
    resize();

    // Loop gating: paused when the tab is hidden. Off-screen is no longer a pause —
    // it is a teardown (the hand-off above), so it is not part of this gate. The
    // loop itself lives in loop.ts (rule-4 extraction): a scene that throws per-frame
    // stops and reports once, never sixty times a second.
    const loop = createFrameLoop({
      handle, renderer, scene, camera, clock, framesRef, reportedRef,
      onError: (message) => { setError(message); setLive(false); },
    });
    let tabVisible = document.visibilityState !== 'hidden';
    const sync = () => { if (tabVisible) loop.start(); else loop.stop(); };
    const onVisibility = () => { tabVisible = document.visibilityState !== 'hidden'; sync(); };
    document.addEventListener('visibilitychange', onVisibility);

    /**
     * Hand-off observer. The 12% rootMargin is hysteresis: a world must be more
     * than that past the edge before it counts as gone, so boundary jitter cannot
     * flap it between teardown and rebuild. A percentage scales the dead band with
     * the viewport — a larger fixed margin can exceed a short QA page's whole
     * scrollable range, and then slots never travel.
     */
    let diagOnScreen = true;
    const io = new IntersectionObserver(
      (entries) => {
        const now = entries.some((e) => e.isIntersecting);
        diagOnScreen = now;
        if (!now) loop.stop();
        setOnScreen(now);
      },
      { threshold: 0.01, rootMargin: '12% 0px 12% 0px' },
    );
    io.observe(host);

    // Scroll progress is computed in observe.ts (see scrollProgressFor).

    // Host observation lives in observe.ts: it owns the ResizeObserver (without which a
    // host measured at zero area stays a 1x1 buffer forever) and the scroll formula.
    const hostObservation = observeHost(host, observed, resize);

    // Context loss lives in contextLoss.ts so its transitions are testable without a
    // GPU. Two rules three reviewers had to find: STOP the loop (render on a lost
    // context is a silent no-op, so frames would keep climbing on a black canvas), and
    // show the poster on the FIRST loss (gating it on the second left the user watching
    // a frozen canvas while data-live claimed health).
    const lossPolicy = createContextLossPolicy();
    const detachLoss = attachContextLossListeners(canvas, lossPolicy, {
      onLost: () => { loop.stop(); setLive(false); },
      onGiveUp: () => setLost(true),
      onRestored: () => {
        setLost(false);
        setLive(true);              // the poster can step aside again
        hostObservation.refresh();  // the backing store is gone; re-derive size
        sync();
      },
    });
    sync();
    setLive(true);

    // Live diagnostics are published on the host element rather than through React
    // state: the frame counter changes every frame, and putting it in state would
    // re-render the page sixty times a second. See `diagnostics.ts` for the honesty
    // contract — `contextLost` exists so telemetry cannot look healthy on a dead
    // canvas.
    const cancelDiag = startDiagTimer(host, () => {
      const loss = lossPolicy.read();
      return {
        frames: framesRef.current,
        running: loop.isRunning(),
        onScreen: diagOnScreen,
        tabVisible,
        contextLost: loss.contextLost,
        contextLosses: loss.losses,
        drawCalls: renderer.info.render.calls,
        primitives: primitiveCount(renderer.info.render),
      };
    });

    return () => {
      cancelDiag();
      loop.stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      hostObservation.disconnect();
      detachLoss();
      handle.dispose?.();
      // `dispose()` frees GPU resources but does NOT release the CONTEXT. Without
      // this, every mount leaks a context until the browser's LRU evicts one —
      // firing `webglcontextlost` on a canvas that is still live. Caught by Fable 5.1.
      renderer.forceContextLoss?.();
      renderer.dispose();
      // The canvas dies WITH its context — a force-lost context can never be
      // re-gotten on the same element, so the container is emptied for the next setup.
      removeCanvas();
      releaseSlot();
      setLive(false);
    };
  }, [canvasHostRef, hostRef, motion, slotTick, onScreen]);

  return { live, lost, error, frames: framesRef.current };
}
