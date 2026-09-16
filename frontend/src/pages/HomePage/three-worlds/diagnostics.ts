/**
 * diagnostics - motion gating, capability probing and live render telemetry.
 * @module pages/HomePage/three-worlds/diagnostics
 *
 * WHY NOT REACT STATE
 * The frame counter changes every frame. Routing it through React state would
 * re-render the page sixty times a second. These values are published as `data-*`
 * attributes instead, which QA and the console read directly.
 *
 * WHY THIS IS SEPARATE FROM THE RUNTIME
 * Rule 4 caps files at 300 lines, and deciding WHETHER to animate is a genuinely
 * separate question from driving a render loop once you have decided to. Splitting
 * also makes both the gate and the honesty contract readable on their own.
 *
 * THE HONESTY CONTRACT (this module has one job)
 * Telemetry that can report health on a dead canvas is worse than no telemetry: it
 * manufactures false confidence. A hostile review found exactly that hole - after a
 * WebGL context loss the render loop used to keep running, `frames` kept climbing,
 * and nothing in the published data said the canvas was black. `contextLost` and
 * `contextLosses` exist so that state is visible rather than inferred, and callers
 * must treat a lost context as a failure even when `frames` is non-zero.
 */

/** Tier input mirrors the app-wide `useAnimationTier` contract. */
export type Tier = 'full' | 'balanced' | 'essential';

/** Whether a world may animate, or must fall back to its committed poster. */
export type MotionMode = 'live' | 'poster';

/**
 * Decide whether a mount may animate.
 *
 * Reduced-motion always wins, regardless of tier: a user who asked the OS for less
 * motion must never receive a WebGL loop merely because their laptop is fast. The
 * `essential` tier means the device already told us it cannot afford animation.
 */
export function resolveMotion(
  tier: Tier,
  prefersReducedMotion: boolean,
  webglAvailable = true,
): MotionMode {
  if (prefersReducedMotion) return 'poster';
  if (tier === 'essential') return 'poster';
  if (!webglAvailable) return 'poster';
  return 'live';
}

/**
 * Cheap WebGL capability probe. Never throws; a missing context is normal.
 *
 * THE PROBE RELEASES ITS CONTEXT. An earlier version created a canvas, called
 * `getContext`, and dropped it. Browsers cap live GL contexts (roughly 8-16 in
 * Chrome) and silently LRU-evict the oldest, so a page mounting many variants would
 * quietly exhaust the budget and start firing `webglcontextlost` on LIVE canvases.
 * Two reviewers flagged this, and one noted it is an unexamined alternative suspect
 * for the crash previously attributed to the software renderer.
 *
 * The result is cached: the answer cannot change within a document, and one probe
 * per page is the correct number.
 */
let webglProbe: boolean | null = null;

export function hasWebGL(): boolean {
  if (webglProbe !== null) return webglProbe;
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    webglProbe = Boolean(gl);
    // Hand the context back rather than letting the browser's LRU take it later.
    // Chrome caps live contexts (~16) and evicts the OLDEST, firing `webglcontextlost`
    // on whatever holds it - so a leaked probe does not just waste a slot, it can kill
    // a live canvas. That is indistinguishable from a driver fault, and Three then
    // crashes inside parseUniform with the exact signature previously blamed on the
    // software renderer. (Caught by Fable 5.1, round 2.)
    const lose = (gl as WebGLRenderingContext | null)?.getExtension?.('WEBGL_lose_context');
    lose?.loseContext();
    probe.width = 0;
    probe.height = 0;
    return webglProbe;
  } catch {
    webglProbe = false;
    return false;
  }
}


/** Everything the runtime knows about presentation health at a point in time. */
export interface WorldDiag {
  frames: number;
  running: boolean;
  onScreen: boolean;
  tabVisible: boolean;
  /** True when a context loss has occurred and has NOT been recovered. */
  contextLost: boolean;
  contextLosses: number;
  drawCalls: number;
  /** Triangles + lines + points. NOT triangles alone - see isPresenting. */
  primitives: number;
}

/** Publish one diagnostic snapshot onto the host element as data attributes. */
export function publishDiag(host: HTMLElement, d: WorldDiag): void {
  host.dataset.frames = String(d.frames);
  host.dataset.running = d.running ? 'yes' : 'no';
  host.dataset.onScreen = d.onScreen ? 'yes' : 'no';
  host.dataset.tabVisible = d.tabVisible ? 'yes' : 'no';
  host.dataset.contextLost = d.contextLost ? 'yes' : 'no';
  host.dataset.contextLosses = String(d.contextLosses);
  host.dataset.drawCalls = String(d.drawCalls);
  host.dataset.primitives = String(d.primitives);
}

/**
 * Publish on a 250ms timer and return the cancel function.
 *
 * Extracted from `runtime.ts` (rule-4 line cap, round 4). The interval is the
 * honesty channel: QA asserts on these attributes rather than on any React-rendered
 * snapshot, which would freeze a stale frame count into the DOM on every re-render.
 */
export function startDiagTimer(host: HTMLElement, read: () => WorldDiag): () => void {
  const snapshot = () => publishDiag(host, read());
  snapshot();
  const timer = window.setInterval(snapshot, 250);
  return () => window.clearInterval(timer);
}

/**
 * Count every primitive kind the renderer drew.
 *
 * NOT triangles alone: the `lines` and `points` families draw zero triangles while
 * rendering perfectly, so a triangles-only check reported "empty draw" for six
 * variants that were visibly fine.
 */
export function primitiveCount(render: { triangles: number; lines: number; points: number }): number {
  return render.triangles + render.lines + render.points;
}

/**
 * Read a diagnostic snapshot back off a host element.
 * Mirrors `publishDiag`; kept adjacent so the two cannot drift apart silently.
 */
export function readDiag(host: HTMLElement): WorldDiag {
  const n = (k: string) => Number(host.dataset[k] ?? '0');
  const b = (k: string) => host.dataset[k] === 'yes';
  return {
    frames: n('frames'),
    running: b('running'),
    onScreen: b('onScreen'),
    tabVisible: b('tabVisible'),
    contextLost: b('contextLost'),
    contextLosses: n('contextLosses'),
    drawCalls: n('drawCalls'),
    primitives: n('primitives'),
  };
}

/**
 * Is this world actually presenting frames right now?
 *
 * The single predicate QA should branch on. It deliberately returns false for a
 * running loop with a lost context, because that loop is drawing nothing.
 */
export function isPresenting(d: WorldDiag): boolean {
  // NOTE: a Line/Points scene contributes 0 TRIANGLES while drawing perfectly,
  // so the primitive test must include lines and points. Requiring triangles alone
  // failed 6 of 20 variants that were rendering correctly.
  return d.frames > 2 && d.running && !d.contextLost && d.drawCalls > 0 && d.primitives > 0;
}
