/**
 * React harness for SwanMark3D.
 *
 * The standalone harness (entry.ts) proves the *factory* renders correctly. This
 * one proves the *component* does: that the canvas goes live, that the sizing
 * policy produces the intended backing store, and that the pixels at each header
 * size still match the reference PNG.
 *
 * Each element is laid out at a fixed CSS size and the component is allowed to
 * fill it - the CSS-driven path Sean asked for, not a size prop.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SwanMark3D } from '../../../../../../frontend/src/components/SwanMark3D/SwanMark3D';

const LADDER = [16, 24, 28, 32, 36, 44, 48, 52, 64, 128];

// Supersample factor and backing bounds come from the URL so one puppeteer run
// can sweep them: component.html?ss=1&minb=1 renders truly native.
// Defaults here MUST match the component's own defaults (ss=2, no floor), or the
// unswept run would be measuring something the app never does.
const params = new URLSearchParams(location.search);
const SS = Number(params.get('ss') ?? '2');
const MAXB = Number(params.get('maxb') ?? '1024');
const MINB = Number(params.get('minb') ?? '1');

// ?ir=high-quality forces the browser's higher-quality canvas downscale filter,
// to test whether the measured gap to the LANCZOS floor is the filter's fault.
const IR = params.get('ir');
if (IR) {
  const st = document.createElement('style');
  st.textContent = `canvas { image-rendering: ${IR}; }`;
  document.head.appendChild(st);
}

function Row() {
  return (
    <div
      id="ladder"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 12,
        padding: 16,
        background: '#0A0A0F',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {LADDER.map((n) => (
        <div key={n} style={{ textAlign: 'center' }}>
          <div
            id={`slot-${n}`}
            data-size={n}
            style={{ width: n, height: n, background: 'transparent' }}
          >
            <SwanMark3D
              size={n}
              decorative
              drift={0}
              supersample={SS}
              maxBacking={MAXB}
              minBacking={MINB}
            />
          </div>
          <div style={{ color: '#E0ECF4', fontSize: 10, marginTop: 4 }}>{n}</div>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Row />
  </React.StrictMode>,
);

// Report the live/backing state of every slot so the shooter can assert on it
// rather than eyeball a screenshot.
(window as never as Record<string, unknown>).__component = () => {
  const out: Record<string, unknown>[] = [];
  for (const el of Array.from(document.querySelectorAll('[data-size]'))) {
    const host = el as HTMLElement;
    const canvas = host.querySelector('canvas') as HTMLCanvasElement | null;
    const frame = host.querySelector('span') as HTMLElement | null;
    out.push({
      size: Number(host.dataset.size),
      mode: frame?.dataset.swanmark3d ?? 'none',
      // The DISPLAYED canvas, in device px.
      backing: canvas ? `${canvas.width}x${canvas.height}` : 'none',
      // The GL scratch buffer, surfaced by the component as a data attribute.
      glBacking: frame?.dataset.swangl ?? 'n/a',
    });
  }
  return out;
};

// Give the dynamic imports a chance to land before the shooter proceeds. A slot
// that settles on 'fallback' is a finished state too (that is what happens when
// WebGL is unavailable), so either terminal state releases the shooter.
const deadline = Date.now() + 20000;
const wait = () => {
  const info = (window as never as { __component: () => { mode: string }[] }).__component();
  const settled = info.every((i) => i.mode === 'live' || i.mode === 'fallback');
  if (settled || Date.now() > deadline) {
    (window as never as Record<string, unknown>).__ready = true;
  } else {
    setTimeout(wait, 50);
  }
};
wait();
