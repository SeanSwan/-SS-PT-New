/**
 * Integration harness for the real header `Logo` component.
 *
 * Verifies the things the swap could plausibly have broken:
 *   - the size ladder still applies at each breakpoint (28/32/36/44/52)
 *   - the mark goes live (3-D) rather than staying on the PNG
 *   - the click and keyboard contract still fires onLogoClick
 *   - prefers-reduced-motion stops the float
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import Logo from '../../../../../../frontend/src/components/Header/components/Logo';

declare global {
  interface Window {
    __logo: {
      size: () => { w: number; h: number; mode: string; textShown: boolean };
      clicks: number;
      anim: () => string;
    };
  }
}

window.__logo = {
  clicks: 0,
  size: () => {
    const mark = document.querySelector('.logo-mark') as HTMLElement | null;
    const text = document.querySelector('.logo-text') as HTMLElement | null;
    const canvas = document.querySelector('.logo-mark canvas') as HTMLCanvasElement | null;
    if (!mark) return { w: 0, h: 0, mode: 'none', textShown: false };
    const r = mark.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      mode: (mark.dataset.swanmark3d as string) ?? 'none',
      textShown: !!text && getComputedStyle(text).display !== 'none',
      ...(canvas ? { canvas: `${canvas.width}x${canvas.height}` } : {}),
    } as never;
  },
  anim: () => {
    const el = document.querySelector('.logo-element, .sc-whatever');
    const wrap = el ?? document.querySelector('.logo-text')?.parentElement;
    return wrap ? getComputedStyle(wrap).animationName : 'unknown';
  },
};

function App() {
  return (
    <div
      style={{
        background: '#0A0A0F',
        padding: 12,
        minHeight: 120,
        // The header's tokens, so the styled component has something to resolve.
        ['--accent-primary' as never]: '#8B5CF6',
        ['--text-primary' as never]: '#E0ECF4',
      }}
    >
      <div id="host">
        <Logo
          onLogoClick={() => {
            window.__logo.clicks += 1;
          }}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);

const deadline = Date.now() + 20000;
const wait = () => {
  const s = window.__logo.size();
  if (s.mode === 'live' || Date.now() > deadline) {
    (window as never as Record<string, unknown>).__ready = true;
  } else {
    setTimeout(wait, 50);
  }
};
wait();
