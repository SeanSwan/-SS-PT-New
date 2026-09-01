/**
 * useSheenPointer — the Forge Sheen-tier cursor engine (SWA-224)
 * ===============================================================
 * BLUEPRINT
 * ---------
 * Purpose : Drive the trailing glow orb and pointer-washed highlights across
 *           every Sheen-tier surface from ONE window listener and ONE rAF loop.
 * Inputs  : Surfaces registered via `register(el, opts)`.
 * Outputs : CSS custom properties written on each element (--px, --py, --opac,
 *           and --orb when a colour pair is supplied).
 * Perf    : Rect reads are cached and rAF-coalesced. Surfaces at rest are
 *           skipped entirely — no lerp, no style writes.
 * A11y    : Under `prefers-reduced-motion: reduce` interpolation is disabled;
 *           values snap, so nothing animates.
 *
 * WHY THIS EXISTS — two defects in the artifact prototype, fixed here
 * -------------------------------------------------------------------
 * The Swan Sheen Forge artifact's Run-2 engine carried two real defects, found
 * by review on 2026-09-01 and recorded on SWA-224. Both are fixed by
 * construction below, because all ~20 Sheen-tier components inherit this file.
 *
 *  D1 — Forced layout was MOVED, not removed. The prototype's comment claimed
 *       rects were "never measured inside the loop", which was true of the rAF
 *       loop — but `measure()` was wired straight to `scroll`, calling
 *       getBoundingClientRect() across every registered surface synchronously on
 *       every scroll event (50 surfaces in the demo). During momentum scroll
 *       that is a full layout flush per tick. FIX: scroll/resize only set a
 *       dirty flag; the actual measuring happens once inside the next rAF.
 *
 *  D2 — No proximity early-out. `tick()` recomputed clamped targets for every
 *       surface whenever the pointer was on screen. Because the clamp keeps
 *       changing as the cursor moves anywhere on the page, distant surfaces
 *       never settled below the convergence epsilon, so all of them received
 *       four inline custom-property writes per frame (~200/frame in the demo).
 *       FIX: a surface whose target and current opacity are both zero is
 *       snapped once, marked at rest, and then skipped — no lerp, no writes.
 *
 * @see docs SWA-224 · tokens `styles/sheenPackTokens.ts`
 */

import { useEffect, useRef } from 'react';
import { SHEEN } from '../styles/sheenPackTokens';

export interface SheenSurfaceOptions {
  /** Optional [fromHex, toHex] pair blended across the surface width. */
  orb?: readonly [string, string];
}

interface SheenSurfaceState extends SheenSurfaceOptions {
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
  /** Injected for tests. Defaults to the real media query. */
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

const lerpChannel = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
};

/** Continuous colour blend across the surface width — candidate B's behaviour. */
export const blendHex = (from: string, to: string, t: number): [number, number, number] => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const k = Math.min(1, Math.max(0, t));
  return [lerpChannel(a[0], b[0], k), lerpChannel(a[1], b[1], k), lerpChannel(a[2], b[2], k)];
};

export function createSheenPointer(options: SheenPointerOptions = {}): SheenPointerEngine {
  const target = options.target ?? (typeof window !== 'undefined' ? window : undefined);
  const raf = options.raf ?? ((cb: FrameRequestCallback) => requestAnimationFrame(cb));
  const caf = options.caf ?? ((h: number) => cancelAnimationFrame(h));
  const reduce =
    options.prefersReducedMotion ??
    (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const P = SHEEN.pointer;
  const surfaces: SheenSurfaceState[] = [];

  let mx = -9999;
  let my = -9999;
  let running = false;
  let handle = 0;
  /** D1: scroll/resize set this; measuring happens inside the frame, never in the handler. */
  let rectsDirty = true;

  const engine = {
    lastFrameWrites: 0,
    measureCount: 0,
  };

  const measure = () => {
    for (const s of surfaces) s.rect = s.el.getBoundingClientRect();
    engine.measureCount += 1;
    rectsDirty = false;
  };

  const kick = () => {
    if (!running) {
      running = true;
      handle = raf(tick);
    }
  };

  /** D1: handlers are O(1). They never touch layout. */
  const markDirty = () => {
    rectsDirty = true;
    kick();
  };

  const onPointerMove = (e: Event) => {
    const pe = e as PointerEvent;
    mx = pe.clientX;
    my = pe.clientY;
    kick();
  };

  const onPointerGone = () => {
    mx = -9999;
    my = -9999;
    kick();
  };

  function tick() {
    if (rectsDirty) measure();

    let active = false;
    let writes = 0;
    const pointerOnScreen = mx > -9998;

    for (const s of surfaces) {
      const r = s.rect;
      if (!r || !r.width) continue;

      // ── target ─────────────────────────────────────────────────────────
      if (pointerOnScreen) {
        const dx = Math.max(r.left - mx, 0, mx - r.right);
        const dy = Math.max(r.top - my, 0, my - r.bottom);
        const d = Math.hypot(dx, dy);
        const inside = dx === 0 && dy === 0;
        s.to = inside ? 1 : Math.max(0, 1 - d / P.proximityFalloffPx);
      } else {
        s.to = 0;
      }

      // ── D2: proximity early-out ────────────────────────────────────────
      // Nothing to show and nothing showing: snap once, then skip entirely.
      // Without this every surface on the page is re-styled on every frame the
      // pointer moves, however far away it is.
      if (s.to === 0 && s.o <= P.invisibleEpsilon) {
        if (!s.atRest) {
          s.o = 0;
          s.el.style.setProperty('--opac', '0');
          s.atRest = true;
          writes += 1;
        }
        continue;
      }
      s.atRest = false;

      // Only a surface that is actually in play needs its position tracked.
      if (pointerOnScreen) {
        s.tx = Math.min(1, Math.max(0, (mx - r.left) / r.width));
        s.ty = Math.min(1, Math.max(0, (my - r.top) / r.height));
      }

      const k = reduce ? 1 : P.catchUp;
      s.x += (s.tx - s.x) * k;
      s.y += (s.ty - s.y) * k;
      s.o += (s.to - s.o) * (reduce ? 1 : P.opacityCatchUp);

      if (
        Math.abs(s.tx - s.x) > P.restEpsilon ||
        Math.abs(s.ty - s.y) > P.restEpsilon ||
        Math.abs(s.to - s.o) > P.invisibleEpsilon
      ) {
        active = true;
      }

      const px = `${(s.x * 100).toFixed(2)}%`;
      const py = `${(s.y * 100).toFixed(2)}%`;
      s.el.style.setProperty('--px', px);
      s.el.style.setProperty('--py', py);
      s.el.style.setProperty('--opac', s.o.toFixed(3));
      if (s.orb) {
        const [r8, g8, b8] = blendHex(s.orb[0], s.orb[1], s.x);
        s.el.style.setProperty('--orb', `rgba(${r8},${g8},${b8},${(s.o * 0.55).toFixed(3)})`);
      }
      writes += 1;
    }

    engine.lastFrameWrites = writes;
    if (active) handle = raf(tick);
    else running = false;
  }

  target?.addEventListener('pointermove', onPointerMove, { passive: true });
  target?.addEventListener('pointerleave', onPointerGone, { passive: true });
  target?.addEventListener('blur', onPointerGone, { passive: true });
  target?.addEventListener('scroll', markDirty, { passive: true });
  target?.addEventListener('resize', markDirty, { passive: true });

  return {
    register(el, opts = {}) {
      const s: SheenSurfaceState = {
        el,
        x: 0.5,
        y: 0.5,
        o: 0,
        tx: 0.5,
        ty: 0.5,
        to: 0,
        rect: null,
        atRest: false,
        ...opts,
      };
      surfaces.push(s);
      rectsDirty = true;
      kick();
      return () => {
        const i = surfaces.indexOf(s);
        if (i >= 0) surfaces.splice(i, 1);
      };
    },
    destroy() {
      target?.removeEventListener('pointermove', onPointerMove);
      target?.removeEventListener('pointerleave', onPointerGone);
      target?.removeEventListener('blur', onPointerGone);
      target?.removeEventListener('scroll', markDirty);
      target?.removeEventListener('resize', markDirty);
      if (running) caf(handle);
      running = false;
      surfaces.length = 0;
    },
    get lastFrameWrites() {
      return engine.lastFrameWrites;
    },
    get measureCount() {
      return engine.measureCount;
    },
  };
}

/** Shared engine so N components cost one listener and one loop, not N of each. */
let sharedEngine: SheenPointerEngine | null = null;
const getSharedEngine = (): SheenPointerEngine => {
  if (!sharedEngine) sharedEngine = createSheenPointer();
  return sharedEngine;
};

/** React binding: register a ref'd element with the shared engine for its lifetime. */
export function useSheenPointer<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  opts?: SheenSurfaceOptions,
): void {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return getSharedEngine().register(el, optsRef.current);
  }, [ref]);
}
