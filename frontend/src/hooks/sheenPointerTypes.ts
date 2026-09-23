/**
 * sheenPointerTypes — the Sheen pointer engine's public shapes (SWA-224)
 * =======================================================================
 * Extracted when `useSheenPointer.ts` crossed the 300-line cap (Rule 4) for the
 * second time. Types are the right thing to move: they are the part consumers
 * read and the part the engine body never needs to scroll past.
 */

export interface SheenSurfaceOptions {
  /** Optional [fromHex, toHex] pair blended across the surface width. */
  orb?: readonly [string, string];
  /**
   * Namespace for the custom properties this engine writes.
   * Defaults to '' (`--px`, `--py`, `--opac`, `--orb`). The Forge sheen layer
   * reads namespaced names, so it passes 'sw-sheen-' — without this the engine
   * writes properties no stylesheet is listening to and the orb never moves,
   * silently. Caught during the Forge port, 2026-09-01.
   */
  varPrefix?: string;
}

export interface SheenSurfaceState extends SheenSurfaceOptions {
  el: HTMLElement;
  /** Current (eased) normalised position and opacity. */
  x: number;
  y: number;
  o: number;
  /** Target normalised position and opacity. */
  tx: number;
  ty: number;
  to: number;
  rect: DOMRect | null;
  /** True once the surface has been snapped to rest; skipped until woken. */
  atRest: boolean;
}

export interface SheenPointerOptions {
  /** Injected for tests. Defaults to the real window. */
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  raf?: (cb: FrameRequestCallback) => number;
  caf?: (handle: number) => void;
  /**
   * Injected for tests. Defaults to the LIVE media query.
   * Passing a value pins it static — which is exactly why the reduced-motion
   * staleness bug (H1) survived the original suite. Tests for live behaviour
   * must omit this.
   */
  prefersReducedMotion?: boolean;
}

export interface SheenPointerEngine {
  register(el: HTMLElement, opts?: SheenSurfaceOptions): () => void;
  destroy(): void;
  /** Test seam: number of surfaces styled during the most recent frame. */
  readonly lastFrameWrites: number;
  /** Test seam: number of getBoundingClientRect() batches performed. */
  readonly measureCount: number;
}
