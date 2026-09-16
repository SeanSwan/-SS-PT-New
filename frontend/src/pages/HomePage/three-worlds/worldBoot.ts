/**
 * worldBoot — canvas + renderer construction for one world setup.
 * @module pages/HomePage/three-worlds/worldBoot
 *
 * Extracted from `runtime.ts` (rule-4 line cap, round 4). It exists as its own
 * module because the canvas LIFECYCLE is a real policy, not boilerplate: a context
 * lost via forceContextLoss can never be re-gotten on the same canvas element
 * (getContext returns the same, now-lost, context), so the element is created per
 * setup and destroyed per teardown — it must never be reused across a hand-off.
 */
import * as THREE from 'three';

export interface WorldBoot {
  /** The created canvas element (context-loss listeners attach to it). */
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  /** Sweep the created canvas back out of the container. */
  removeCanvas: () => void;
}

/**
 * Create the world's canvas inside `canvasHost` (which must be an EMPTY element the
 * runtime may fill — replaceChildren also sweeps up any canvas a crashed earlier
 * setup left behind) and construct its renderer.
 *
 * Returns null when the browser refuses a WebGL context; the caller must then
 * release the render slot it may have held.
 */
export function bootWorld(canvasHost: HTMLElement, canvasId?: string): WorldBoot | null {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  if (canvasId) canvas.dataset.worldCanvas = canvasId;
  canvasHost.replaceChildren(canvas);
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    return { canvas, renderer, removeCanvas: () => canvasHost.replaceChildren() };
  } catch {
    // No renderer means no context to force-loss — but the empty canvas must still
    // go, or a dead element would sit in the container claiming to be a world.
    canvasHost.replaceChildren();
    return null;
  }
}
