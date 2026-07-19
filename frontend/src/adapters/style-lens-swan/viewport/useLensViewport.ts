/**
 * useLensViewport — Swan Lens C5 responsive viewport signal (Slice 2 / KIMI-SWAN-LENS-SLICE2 §2.5).
 *
 * Net-new (no existing viewport hook duplicated). Classifies the window into hand/lap/desk/wall,
 * writes `data-viewport` on <html>, and re-evaluates on resize (debounced 150ms). All matrix CSS
 * (lensViewportStyles.ts) keys off `[data-viewport]`, so this hook is the single source of truth
 * and the media queries live only in LENS_VIEWPORT_QUERIES.
 *
 * Fail-safe: no `matchMedia` (SSR) OR a throwing `matchMedia` → `'lap'`, silently (motion/layout
 * never crash on a viewport read). Writes only `data-viewport` — `data-layout-profile` stays
 * Lane-A's Apply-owned attribute (use `layoutProfileForViewport` as a pure helper).
 */
import { useEffect, useState } from 'react';

export type LensViewport = 'hand' | 'lap' | 'desk' | 'wall';
export type LayoutProfile = 'stack' | 'rail' | 'console' | 'panorama';

export const LENS_VIEWPORT_QUERIES: Readonly<Record<LensViewport, string>> = {
  hand: '(max-width: 767px)',
  lap: '(min-width: 768px) and (max-width: 1023px)',
  desk: '(min-width: 1024px) and (max-width: 1919px)',
  wall: '(min-width: 1920px)',
};

/** matchMedia absent OR throwing → this. */
export const LENS_VIEWPORT_FALLBACK: LensViewport = 'lap';

const ORDER: readonly LensViewport[] = ['hand', 'lap', 'desk', 'wall'];

const PROFILE_BY_VIEWPORT: Readonly<Record<LensViewport, LayoutProfile>> = {
  hand: 'stack',
  lap: 'rail',
  desk: 'console',
  wall: 'panorama',
};

/** Pure mapping for Lane A to derive `data-layout-profile` when the profile layout is 'auto'. */
export function layoutProfileForViewport(viewport: LensViewport): LayoutProfile {
  return PROFILE_BY_VIEWPORT[viewport];
}

/** Evaluate the current viewport; fail-safe to 'lap' on any read failure or missing matchMedia. */
export function evaluateViewport(): LensViewport {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return LENS_VIEWPORT_FALLBACK;
  }
  try {
    for (const vp of ORDER) {
      if (window.matchMedia(LENS_VIEWPORT_QUERIES[vp]).matches) return vp;
    }
    return LENS_VIEWPORT_FALLBACK;
  } catch {
    return LENS_VIEWPORT_FALLBACK;
  }
}

export function useLensViewport(): LensViewport {
  const [viewport, setViewport] = useState<LensViewport>(evaluateViewport);

  useEffect(() => {
    const apply = () => {
      const next = evaluateViewport();
      setViewport(next);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-viewport', next);
      }
    };
    apply(); // immediate on mount

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(apply, 150); // debounce
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return viewport;
}
