/**
 * sceneSupport.ts — pure helpers for the SwanMark3D scene.
 *
 * Split out of `swanMarkScene.ts` under rule 4 (max 300 lines/file, "extract
 * hooks, utils, styles, types when approaching limit"). Both helpers are pure:
 * no THREE, no DOM state, no closure over the scene - so they are also the two
 * pieces worth testing directly.
 */

/**
 * Cheap WebGL probe, run BEFORE three is asked for a context.
 *
 * Without it, three logs `THREE.WebGLRenderer: Error creating WebGL context.` as a
 * console error for every user who has WebGL disabled - noise on a page that
 * degrades perfectly well. Probing first turns that into a clean throw, which the
 * component catches and turns into the PNG fallback.
 *
 * Proven load-bearing, not assumed: `evidence/red_me1_webgl_probe.py` removes this
 * guard from a regenerable bundle, shows the console error return, and restores it.
 *
 * The probe context is released immediately so it does not consume one of the
 * browser's limited context slots.
 */
export function hasWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = (probe.getContext('webgl2') ||
      probe.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * The sizing policy, isolated so it can be tested without a browser.
 *
 * `cssSize` is in CSS px; the caller passes the DEVICE px it wants the GL buffer
 * to cover. See the header of `swanMarkScene.ts` for why `supersample` defaults
 * to 2 and why `minBacking` has no floor - the short version is that both were
 * measured in a real browser and both were surprising.
 */
export function computeBacking(
  cssSize: number,
  dpr: number,
  supersample: number,
  minBacking: number,
  maxBacking: number,
): number {
  const target = cssSize * dpr * supersample;
  return Math.max(minBacking, Math.min(maxBacking, Math.round(target)));
}
