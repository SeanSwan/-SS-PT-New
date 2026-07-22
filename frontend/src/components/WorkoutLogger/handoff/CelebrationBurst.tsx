/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: CelebrationBurst (1.4a signature beat)           ║
 * ║  PURPOSE: One-shot crystalline particle burst on meaningful   ║
 * ║           save moments (pr/first full, streak light).         ║
 * ║  OWNER: Fable 5 | LAST VALIDATED: 2026-07-22                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Discipline (Kimi spec, Mobbin plan v2 §1.4a):
 *  - ONE burst per mount, ~900ms, then the canvas removes itself. Never loops. Not a slot machine.
 *  - GPU-safe: a single absolutely-positioned canvas, pointer-events none, zero layout impact.
 *  - prefers-reduced-motion: reduce → renders NOTHING (parent also gates; belt and suspenders).
 *  - Colors resolve THROUGH the lens tokens at runtime (getComputedStyle on var(--…) styles), so a
 *    Style-Lens palette swap recolors the burst with no code change. Hex literals below exist only
 *    as var() fallbacks per Rule 6.
 */
import React, { useEffect, useRef } from 'react';

export type BurstIntensity = 'full' | 'light';

const DURATION_MS = 900;
const COUNTS: Record<BurstIntensity, number> = { full: 42, light: 18 };

/** Resolve a CSS color expression (var + fallback) to a canvas-usable computed color. */
const resolveColor = (el: HTMLElement, expr: string): string => {
  el.style.color = expr;
  return getComputedStyle(el).color || '#60C0F0'; /* swan-guard-allow-hex resolved-color last resort */
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Particle {
  x: number; y: number; vx: number; vy: number; r: number; color: string; spin: number;
}

const CelebrationBurst: React.FC<{ intensity?: BurstIntensity }> = ({ intensity = 'full' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.scale(dpr, dpr);

    const palette = [
      resolveColor(canvas, 'var(--accent-primary, #60C0F0)'),
      resolveColor(canvas, 'var(--accent-glow, #8B5CF6)'),
      resolveColor(canvas, 'var(--accent-luxury, #C6A84B)'),
      resolveColor(canvas, 'var(--text-primary, #E0ECF4)'),
    ];

    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h * 0.38; // burst origin near the numeral, not screen center
    const particles: Particle[] = Array.from({ length: COUNTS[intensity] }, (_, i) => {
      const angle = (Math.PI * 2 * i) / COUNTS[intensity] + (i % 3) * 0.37;
      const speed = 2.2 + (i % 5) * 1.15;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.4,
        r: 1.6 + (i % 4) * 1.1,
        color: palette[i % palette.length],
        spin: (i % 2 ? 1 : -1) * 0.12,
      };
    });

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / DURATION_MS;
      if (t >= 1) { ctx.clearRect(0, 0, w, h); return; } // one-shot: draw nothing after the beat
      ctx.clearRect(0, 0, w, h);
      const fade = 1 - t;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.985; // drift + gravity, crystalline fall
        ctx.globalAlpha = Math.max(0, fade * 0.9);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(t * Math.PI * 2 * p.spin * 10);
        ctx.fillStyle = p.color;
        // diamond facet, not confetti rectangle — crystalline language
        ctx.beginPath();
        ctx.moveTo(0, -p.r); ctx.lineTo(p.r * 0.7, 0); ctx.lineTo(0, p.r); ctx.lineTo(-p.r * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [intensity]);

  if (prefersReducedMotion()) return null;

  return (
    <canvas
      ref={canvasRef}
      data-testid="celebration-burst"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

export default CelebrationBurst;
