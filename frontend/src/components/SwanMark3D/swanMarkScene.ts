/**
 * swanMarkScene.ts — framework-free host for the SwanStudios swan mark.
 *
 * Deliberately React-free so the sizing policy, the render-on-demand contract and
 * disposal can be tested without mounting a component. `SwanMark3D.tsx` is a thin
 * wrapper over this. It owns the clock, the scheduling and the disposal; the reveal's
 * arithmetic is in `swanMarkReveal.ts` and the draw/blit/report half is in
 * `swanMarkPresentation.ts`.
 *
 * THE CONSTANTS BELOW ARE MEASURED, NOT CHOSEN
 * -------------------------------------------
 * `supersample = 2` and `minBacking = 1` are the results of in-browser measurement, and
 * both were surprising — 4x was picked first from a Python model and measured WORSE.
 * The two-canvas design, the error tables, the reason there is no minimum floor and the
 * correction to the LANCZOS reasoning are recorded in full in
 * `SWANMARK-SIZING-RATIONALE.md`, beside this file.
 *
 * They live in a separate document because Rule 4 caps this file at 300 lines and this
 * file enforces that cap on itself; the rationale alone was 62 lines. Read it before
 * changing any of these numbers — every one of them was arrived at by measurement, and
 * the document records the one occasion a model predicted the wrong answer.
 *
 * WHY RENDER-ON-DEMAND
 * --------------------
 * A static logo must not cost a rAF loop forever. `requestRender()` coalesces to one
 * frame; a continuous loop runs only while something is actually moving — drift, or the
 * finite reveal. The header therefore costs zero GPU when idle, and the reveal returns
 * to the coalesced path on the frame it settles rather than becoming an ambient loop.
 */
import * as THREE from 'three';
import { createSwanMark, createFramedCamera, type SwanMarkSpec } from '../../three/swanMark/swanMarkFactory';
import { computeBacking, hasWebGL } from './sceneSupport';
import { createSwanMarkPresenter } from './swanMarkPresentation';
import type { SwanMarkPresentation } from './swanMarkPresentation';
import { createSwanMarkLoop } from './swanMarkLoop';
import {
  HOME_REVEAL,
  revealStartPose,
  sampleReveal,
  type RevealSpec,
} from './swanMarkReveal';

// Re-exported so the barrel and the sizing tests keep one import site.
export { computeBacking } from './sceneSupport';
// The presentation type moved with the code that produces it; re-exported here so
// `SwanMark3D.tsx` and any other existing consumer keeps its single import site.
// (`export type ... from` does not introduce a local binding, hence the import above.)
export type { SwanMarkPresentation } from './swanMarkPresentation';

export interface SwanMarkSceneOptions {
  /** The DISPLAYED canvas. Owned by the caller; the scene writes into it. */
  canvas: HTMLCanvasElement;
  spec: SwanMarkSpec;
  /** GL backing-store multiple of the displayed device px. Default 2. */
  supersample?: number;
  /** Lower bound on the GL backing store, in device px. Default 1 (no floor). */
  minBacking?: number;
  /** Upper bound on the GL backing store, in device px. Default 1024. */
  maxBacking?: number;
  /** Clamp on devicePixelRatio, so a 3x phone does not triple the work. Default 2. */
  maxPixelRatio?: number;
  yaw?: number;
  pitch?: number;
  badgeDepth?: number;
  relief?: number;
  /** Idle yaw drift, radians/second. 0 keeps it still. Default 0. */
  drift?: number;
  /** Fires after a completed render has been blitted to the display canvas. */
  onPresented?: (info: SwanMarkPresentation) => void;
  /** Reports a render-time failure to the boundary. Construction throws instead. */
  onError?: (error: unknown) => void;
}

/** Device-pixel dimensions of the displayed canvas and the GL scratch buffer. */
export interface SwanMarkBacking {
  width: number;
  height: number;
  glWidth: number;
  glHeight: number;
  css: { width: number; height: number };
}

/** Frame and reveal accounting, readable at any time. */
export interface SwanMarkProgress {
  frames: number;
  /** `idle` before a reveal is requested, then `running`, then `settled`. */
  reveal: 'idle' | 'running' | 'settled';
  progress: number;
}

export interface SwanMarkScene {
  /** Lay the object out at this CSS size. Recomputes both backing stores. */
  setSize(cssWidth: number, cssHeight: number): void;
  setView(yaw: number, pitch: number): void;
  /** Change the idle drift rate. 0 stops the continuous loop. */
  setDrift(radiansPerSecond: number): void;
  /** Coalesced: several calls in a frame produce one render. */
  requestRender(): void;
  /**
   * Runs the reveal once; returns false if one is already running or has settled.
   *
   * The controller owns the clock - `swanMarkReveal` computes a pose from elapsed time
   * and schedules nothing. A caller that never calls this keeps the exact prior
   * behaviour.
   */
  beginReveal(spec?: RevealSpec): boolean;
  dispose(): void;
  /** Displayed canvas and GL scratch buffer, in device px. `css` is the layout box. */
  readonly backing: SwanMarkBacking;
  readonly stats: { triangles: number; facets: number };
  /** Frame and reveal accounting. A PROPERTY so it is readable without a DOM. */
  readonly presentation: SwanMarkProgress;
}

export function createSwanMarkScene(opts: SwanMarkSceneOptions): SwanMarkScene {
  const {
    canvas,
    spec,
    supersample = 2,
    minBacking = 1,
    maxBacking = 1024,
    maxPixelRatio = 2,
    drift = 0,
  } = opts;

  if (!hasWebGL()) {
    throw new Error('SwanMarkScene: WebGL is unavailable');
  }

  // The GL canvas is a detached scratch buffer; only `canvas` is ever displayed.
  const glCanvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    // Required: the blit reads the GL canvas after the render call returns.
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(1); // backing sizes are computed explicitly below
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  // The 2D context lives in the presenter module now, which throws if it is
  // unavailable. `scene`/`camera`/`swan` are built first so a construction failure in
  // either place unwinds the renderer rather than leaking a GL context.
  const scene = new THREE.Scene();
  const camera = createFramedCamera(1);
  const swan = createSwanMark(spec, {
    yaw: opts.yaw ?? 0,
    pitch: opts.pitch ?? 0,
    ...(opts.badgeDepth !== undefined ? { badgeDepth: opts.badgeDepth } : {}),
    ...(opts.relief !== undefined ? { relief: opts.relief } : {}),
  });
  scene.add(swan.group);

  let cssW = 1;
  let cssH = 1;
  let glW = 1;
  let glH = 1;
  let disposed = false;
  let yaw = opts.yaw ?? 0;
  const pitch = opts.pitch ?? 0;
  const stats = { triangles: spec.mesh.triangles.length, facets: spec.facets.length };

  // The draw/blit/report half and the frame scheduling half each live in their own
  // module. See the headers there: Rule 4's 300-line cap is part of the reason, but the
  // real one is that "a frame reaching the viewer", "when the next frame is scheduled"
  // and "the shape of the reveal" are three concerns that were only tangled together
  // because they arrived in the same file.
  const presenter = createSwanMarkPresenter({
    canvas,
    glCanvas,
    renderer,
    scene,
    camera,
    ...(opts.onPresented ? { onPresented: opts.onPresented } : {}),
    ...(opts.onError ? { onError: opts.onError } : {}),
    readProgress: () => loop.progress,
    readSettled: () => loop.revealState === 'settled',
  });
  const draw = presenter.draw;

  const loop = createSwanMarkLoop(yaw, pitch, {
    onFrame: (y, p) => {
      yaw = y;
      swan.setView(y, p);
      draw();
    },
    onSettle: presenter.draw,
    onRevealed: () => {
      /* the presenter reports settled state through readSettled */
    },
  });

  const requestRender = () => {
    if (disposed) return;
    loop.requestFrame();
  };

  if (drift !== 0) loop.startDrift(drift);

  const setSize = (w: number, h: number) => {
    cssW = Math.max(1, w);
    cssH = Math.max(1, h);
    const dpr = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    const longCss = Math.max(cssW, cssH);
    const shortCss = Math.min(cssW, cssH);

    // Displayed pixels: exactly the device pixels the element occupies.
    const dispLong = Math.max(1, Math.round(longCss * dpr));
    const dispShort = Math.max(1, Math.round((dispLong * shortCss) / longCss));

    // GL scratch: supersampled relative to the DISPLAYED device px, then clamped.
    const g = computeBacking(dispLong, 1, supersample, minBacking, maxBacking);
    const gShort = Math.max(1, Math.round((g * dispShort) / dispLong));

    if (canvas.width !== dispLong || canvas.height !== dispShort) {
      canvas.width = dispLong;
      canvas.height = dispShort;
    }
    if (glCanvas.width !== g || glCanvas.height !== gShort) {
      glCanvas.width = g;
      glCanvas.height = gShort;
      renderer.setSize(g, gShort, false);
    }
    glW = g;
    glH = gShort;

    // Fit by the shorter axis so a non-square container letterboxes rather than
    // distorting: orthographic, so the two axes are independent.
    const aspect = g / gShort;
    camera.left = -0.5 * aspect;
    camera.right = 0.5 * aspect;
    camera.top = 0.5;
    camera.bottom = -0.5;
    camera.updateProjectionMatrix();
    requestRender();
  };

  return {
    setSize,
    setView: (y, p) => {
      yaw = y;
      swan.setView(y, p);
      requestRender();
    },
    setDrift: loop.setDrift,
    requestRender,
    beginReveal: loop.beginReveal,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      presenter.dispose(); // stops callbacks before any teardown
      loop.stop();         // and before any rAF is cancelled
      swan.dispose();
      scene.clear();
      renderer.dispose();
      // Free the GL context immediately rather than waiting for GC; a page that
      // mounts/unmounts logos repeatedly would otherwise exhaust contexts.
      renderer.forceContextLoss?.();
    },
    get backing() {
      return {
        width: canvas.width,
        height: canvas.height,
        glWidth: glW,
        glHeight: glH,
        css: { width: cssW, height: cssH },
      };
    },
    stats,
    get presentation() {
      return { frames: presenter.frames, reveal: loop.revealState, progress: loop.progress };
    },
  };
}
