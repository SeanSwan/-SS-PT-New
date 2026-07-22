/**
 * CrystalProgressRing.test.tsx — the client-home signature ring.
 * Verifies: level render, pct clamping, fringe presence gated on pct>0,
 * decorative aria-hidden, and reduced-motion safety (component renders with
 * the JS gate resolving without throwing).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CrystalProgressRing from './CrystalProgressRing';

describe('CrystalProgressRing', () => {
  it('renders the level number and the "Level" label', () => {
    const { getByText } = render(<CrystalProgressRing pct={40} level={7} />);
    expect(getByText('7')).toBeTruthy();
    expect(getByText('Level')).toBeTruthy();
  });

  it('marks the SVG decorative (aria-hidden) so the parent owns the progressbar role', () => {
    const { container } = render(<CrystalProgressRing pct={40} level={1} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    // No role=progressbar here — accessibility lives on the parent's linear track.
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('renders the spectral fringe only when pct > 0', () => {
    const { container: withProgress } = render(<CrystalProgressRing pct={25} level={2} />);
    expect(withProgress.querySelector('.ring-fringe')).not.toBeNull();

    const { container: zero } = render(<CrystalProgressRing pct={0} level={1} />);
    expect(zero.querySelector('.ring-fringe')).toBeNull();
  });

  it('clamps out-of-range and non-finite pct without throwing', () => {
    expect(() => render(<CrystalProgressRing pct={250} level={9} />)).not.toThrow();
    expect(() => render(<CrystalProgressRing pct={-30} level={9} />)).not.toThrow();
    // NaN pct → treated as 0 → no fringe.
    const { container } = render(<CrystalProgressRing pct={NaN} level={9} />);
    expect(container.querySelector('.ring-fringe')).toBeNull();
  });

  it('grows the progress dash with pct (25% < 75% swept length)', () => {
    const { container: low } = render(<CrystalProgressRing pct={25} level={1} size={132} />);
    const { container: high } = render(<CrystalProgressRing pct={75} level={1} size={132} />);
    const dashLow = parseFloat((low.querySelector('.ring-fill')?.getAttribute('stroke-dasharray') || '0').split(' ')[0]);
    const dashHigh = parseFloat((high.querySelector('.ring-fill')?.getAttribute('stroke-dasharray') || '0').split(' ')[0]);
    expect(dashHigh).toBeGreaterThan(dashLow);
  });
});
