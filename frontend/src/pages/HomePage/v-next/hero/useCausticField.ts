/**
 * Home V-next — useCausticField (pure painter, Kimi (c) "canvas rules need teeth"). NO per-pixel ops
 * (no getImageData) — it paints a handful of soft radial-gradient "light" blobs that drift on deterministic
 * sine paths and composite with `globalCompositeOperation: 'screen'`, so it stays 60fps-trivial on
 * mid-Android. Colors are RESOLVED from the host (SVG/canvas can't read `var()`); the hook re-resolves on
 * demand. The painter is stateless per-call: `paint(ctx, w, h, tMs)` fully redraws the frame.
 */
import { useCallback, useRef } from 'react';

interface Blob {
  hx: number; // home x (0..1), phase & amplitude for drift
  hy: number;
  ax: number;
  ay: number;
  freq: number;
  r: number; // radius as fraction of min(w,h)
  tint: 'ice' | 'wing';
}

// 5 blobs — deterministic, no RNG (RNG would desync on resume). Ice-heavy with one wing for the purple note.
const BLOBS: Blob[] = [
  { hx: 0.32, hy: 0.38, ax: 0.06, ay: 0.05, freq: 0.00013, r: 0.55, tint: 'ice' },
  { hx: 0.64, hy: 0.3, ax: 0.05, ay: 0.07, freq: 0.00017, r: 0.48, tint: 'ice' },
  { hx: 0.5, hy: 0.6, ax: 0.07, ay: 0.04, freq: 0.00011, r: 0.6, tint: 'wing' },
  { hx: 0.24, hy: 0.66, ax: 0.04, ay: 0.06, freq: 0.00019, r: 0.42, tint: 'ice' },
  { hx: 0.76, hy: 0.62, ax: 0.05, ay: 0.05, freq: 0.00015, r: 0.44, tint: 'ice' },
];

export function useCausticField(hostRef: React.RefObject<HTMLElement>) {
  const colors = useRef({ ice: 'rgba(96,192,240,0.5)', wing: 'rgba(139,92,246,0.4)' });

  const resolveColors = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const ice = cs.getPropertyValue('--home-ice').trim();
    const wing = cs.getPropertyValue('--home-wing').trim();
    if (ice) colors.current.ice = ice;
    if (wing) colors.current.wing = wing;
  }, [hostRef]);

  const paint = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, tMs: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    const min = Math.min(w, h);
    for (const b of BLOBS) {
      const cx = (b.hx + Math.sin(tMs * b.freq) * b.ax) * w;
      const cy = (b.hy + Math.cos(tMs * b.freq * 1.3) * b.ay) * h;
      const rad = b.r * min;
      const base = b.tint === 'wing' ? colors.current.wing : colors.current.ice;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, colorWithAlpha(base, b.tint === 'wing' ? 0.26 : 0.34));
      g.addColorStop(1, colorWithAlpha(base, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  return { paint, resolveColors };
}

/** Coerce any CSS color the lens hands us into an rgba with a chosen alpha (handles hex / rgb / oklab). */
function colorWithAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    const n = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex.padEnd(6, '0').slice(0, 6);
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // rgb()/rgba() → swap/append alpha; anything else (oklab/hsl) → wrap via color-mix fallback string
  if (c.startsWith('rgb')) {
    const nums = c.replace(/rgba?\(|\)/g, '').split(',').slice(0, 3).map((s) => s.trim());
    if (nums.length === 3) return `rgba(${nums[0]},${nums[1]},${nums[2]},${alpha})`;
  }
  return `color-mix(in oklab, ${c} ${Math.round(alpha * 100)}%, transparent)`;
}
