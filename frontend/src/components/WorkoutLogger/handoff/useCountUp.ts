/**
 * useCountUp — visual 0→value count-up for the proof numeral (1.4a).
 *
 * Truth discipline: the ACCESSIBLE value is always the final number (callers set aria-label to the
 * formatted final value); this hook only animates the visible text. prefers-reduced-motion or an
 * unavailable rAF → returns the final value immediately, no animation.
 */
import { useEffect, useState } from 'react';

const DURATION_MS = 800;
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function useCountUp(target: number | null | undefined): number | null {
  const final = typeof target === 'number' && Number.isFinite(target) ? target : null;
  const skip =
    final == null ||
    typeof window === 'undefined' ||
    typeof window.requestAnimationFrame !== 'function' ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const [display, setDisplay] = useState<number | null>(skip ? final : 0);

  useEffect(() => {
    if (skip || final == null) { setDisplay(final); return undefined; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setDisplay(Math.round(final * easeOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [final]);

  return display;
}
