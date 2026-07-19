/**
 * About V-next — useCaustics (pure painter). Kimi (c): render the field at LOW res to an offscreen buffer,
 * then drawImage-upscale (smoothing = free blur) — no per-pixel ops, no allocations in the loop. The light
 * ramps accent→white (Kimi's cyan-trap guardrail: never full-saturation cyan). Colors resolved from the host
 * (canvas can't read var()). Returns `paint(displayCtx, w, h, tMs)` which paints the buffer then blits it up.
 */
import { useCallback, useRef } from 'react';

interface Blob {
  hx: number;
  hy: number;
  ax: number;
  ay: number;
  freq: number;
  r: number;
}

// Filaments bunch toward the optical center (where the swan occluder sits) — accent→white ramp only.
const BLOBS: Blob[] = [
  { hx: 0.46, hy: 0.4, ax: 0.05, ay: 0.06, freq: 0.00014, r: 0.5 },
  { hx: 0.6, hy: 0.34, ax: 0.06, ay: 0.05, freq: 0.00018, r: 0.42 },
  { hx: 0.38, hy: 0.5, ax: 0.05, ay: 0.06, freq: 0.00012, r: 0.46 },
  { hx: 0.54, hy: 0.58, ax: 0.06, ay: 0.05, freq: 0.0002, r: 0.4 },
  { hx: 0.5, hy: 0.46, ax: 0.03, ay: 0.03, freq: 0.00009, r: 0.28 },
];

export function useCaustics(hostRef: React.RefObject<HTMLElement>) {
  const colors = useRef({ ice: 'rgba(96,192,240,1)' });
  const buf = useRef<HTMLCanvasElement | null>(null);

  const resolveColors = useCallback(() => {
    const el = hostRef.current;
    if (!el) return;
    const ice = getComputedStyle(el).getPropertyValue('--about-ice').trim();
    if (ice) colors.current.ice = ice;
  }, [hostRef]);

  const paint = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, tMs: number) => {
    // low-res offscreen buffer (≤ ~640px longest side) — capped regardless of 2560/3840 viewport
    const scale = Math.min(1, 640 / Math.max(w, h));
    const bw = Math.max(1, Math.round(w * scale));
    const bh = Math.max(1, Math.round(h * scale));
    if (!buf.current) buf.current = document.createElement('canvas');
    const b = buf.current;
    if (b.width !== bw || b.height !== bh) {
      b.width = bw;
      b.height = bh;
    }
    const bctx = b.getContext('2d');
    if (!bctx) return;

    bctx.clearRect(0, 0, bw, bh);
    bctx.globalCompositeOperation = 'screen';
    const min = Math.min(bw, bh);
    const ice = colors.current.ice;
    for (const bl of BLOBS) {
      const cx = (bl.hx + Math.sin(tMs * bl.freq) * bl.ax) * bw;
      const cy = (bl.hy + Math.cos(tMs * bl.freq * 1.3) * bl.ay) * bh;
      const rad = bl.r * min;
      const g = bctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, withAlpha(ice, 0.5)); // accent core
      g.addColorStop(0.35, 'rgba(255,255,255,0.16)'); // → white ramp (never full-sat cyan)
      g.addColorStop(1, withAlpha(ice, 0));
      bctx.fillStyle = g;
      bctx.beginPath();
      bctx.arc(cx, cy, rad, 0, Math.PI * 2);
      bctx.fill();
    }
    bctx.globalCompositeOperation = 'source-over';

    // upscale the low-res buffer to the display (imageSmoothing = free blur)
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(b, 0, 0, bw, bh, 0, 0, w, h);
  }, []);

  return { paint, resolveColors };
}

function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    const n = hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex.padEnd(6, '0').slice(0, 6);
    return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${alpha})`;
  }
  if (c.startsWith('rgb')) {
    const nums = c.replace(/rgba?\(|\)/g, '').split(',').slice(0, 3).map((s) => s.trim());
    if (nums.length === 3) return `rgba(${nums[0]},${nums[1]},${nums[2]},${alpha})`;
  }
  return `color-mix(in oklab, ${c} ${Math.round(alpha * 100)}%, transparent)`;
}
