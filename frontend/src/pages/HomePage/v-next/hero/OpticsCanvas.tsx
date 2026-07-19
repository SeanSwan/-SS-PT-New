/**
 * Home V-next — OpticsCanvas (the caustic light layer). Kimi (c) canvas rules: DPR-capped backing store
 * (≤2, 0.5× on mobile), rAF loop PAUSED by both IntersectionObserver (offscreen) AND
 * `document.visibilitychange` (tab hidden), no per-pixel work (see useCausticField). `pointer-events:none`
 * so it never swallows CTA clicks; `aria-hidden`. Only mounts its loop when `active` (full/balanced tier
 * + no reduced-motion) — at essential/reduced-motion the SVG facet frame carries the hero alone.
 */
import { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useCausticField } from './useCausticField';

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  opacity: 0.9;
`;

export function OpticsCanvas({ hostRef, active }: { hostRef: React.RefObject<HTMLElement>; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { paint, resolveColors } = useCausticField(hostRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * (coarse ? 0.5 : 1);
    let w = 0;
    let h = 0;

    const size = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resolveColors();
    size();

    let raf = 0;
    let running = false;
    let onscreen = true;
    const loop = (t: number) => {
      paint(ctx, w, h, t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || !onscreen || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        onscreen = e.isIntersecting;
        onscreen ? start() : stop();
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : start());
    const onResize = () => {
      resolveColors();
      size();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize, { passive: true });
    start();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    };
  }, [active, paint, resolveColors]);

  if (!active) return null;
  return <Canvas ref={canvasRef} aria-hidden="true" data-testid="home-optics-canvas" />;
}
