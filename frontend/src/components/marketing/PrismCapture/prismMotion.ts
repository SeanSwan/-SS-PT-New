/**
 * PrismCapture — motion policy. The reduced-motion DECISION is made in JS here (SKILL LAW 5 refinement), not
 * only in CSS: when a user prefers reduced motion, the refraction entrance is disabled at the source so an "off"
 * effect costs zero (start-settled), rather than rendering an animation and hiding it. Components read
 * `prefersReducedMotion()` once and pick the static path. Timing constants live beside the CSS `--prism-*-ms`.
 */
import { useEffect, useState } from 'react';

/** Synchronous read — safe on SSR (returns false when matchMedia is unavailable). */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

/** Live hook — reflects a user toggling the OS setting mid-session. Starts from the synchronous read. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

/** Timing constants (ms). Kept in sync with the CSS `--prism-charge-ms` / `--prism-settle-ms` fallbacks. */
export const PRISM_TIMING = {
  chargeMs: 820,
  settleMs: 560,
  /** How long the success refraction holds its signature beat before settling (peak-end, once per session). */
  refractBeatMs: 1200,
} as const;
