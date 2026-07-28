/**
 * CrystalProgressRing.test.tsx — the level-indexed signature ring engine.
 * Verifies: level render, era label, fringe/filament gating, quality modes,
 * decorative aria-hidden, pct/level clamping, and that higher levels emit a
 * richer ring (more filaments) than lower ones.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CrystalProgressRing from './CrystalProgressRing';

describe('CrystalProgressRing (engine)', () => {
  it('renders the level number and its era label', () => {
    const { getByText } = render(<CrystalProgressRing pct={40} level={7} />);
    expect(getByText('7')).toBeTruthy();
    expect(getByText('Frostbound')).toBeTruthy(); // level 7 → Era I Frostbound
  });

  it('shows the Gilded Apex era + ultimate flag at level 1000', () => {
    const { getByText, container } = render(<CrystalProgressRing pct={100} level={1000} />);
    expect(getByText('Gilded Apex')).toBeTruthy(); // L1000 = the ultimate era
    expect(container.querySelector('[data-ultimate="true"]')).not.toBeNull();
  });

  it('marks the SVG decorative (aria-hidden); parent owns the progressbar role', () => {
    const { container } = render(<CrystalProgressRing pct={40} level={1} />);
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('renders the dispersion fringe only when pct > 0 and size ≥ 160', () => {
    const big = render(<CrystalProgressRing pct={25} level={2} size={180} />);
    expect(big.container.querySelector('.ring-fringe')).not.toBeNull();

    const zero = render(<CrystalProgressRing pct={0} level={1} size={180} />);
    expect(zero.container.querySelector('.ring-fringe')).toBeNull();

    // small render size quantizes the fringe away (Kimi responsive mandate)
    const small = render(<CrystalProgressRing pct={25} level={2} size={120} />);
    expect(small.container.querySelector('.ring-fringe')).toBeNull();
  });

  it('drops all filaments in Still quality (reduced-motion frame)', () => {
    const still = render(<CrystalProgressRing pct={50} level={500} quality="still" />);
    expect(still.container.querySelector('.ring-filament')).toBeNull();
    const full = render(<CrystalProgressRing pct={50} level={500} quality="full" />);
    expect(full.container.querySelector('.ring-filament')).not.toBeNull();
  });

  it('emits more electricity filaments at higher levels (visible escalation)', () => {
    const low = render(<CrystalProgressRing pct={50} level={30} size={180} />);
    const high = render(<CrystalProgressRing pct={50} level={980} size={180} />);
    const nLow = low.container.querySelectorAll('.ring-filament').length;
    const nHigh = high.container.querySelectorAll('.ring-filament').length;
    expect(nHigh).toBeGreaterThan(nLow);
  });

  it('clamps out-of-range and non-finite pct/level without throwing', () => {
    expect(() => render(<CrystalProgressRing pct={250} level={99999} />)).not.toThrow();
    expect(() => render(<CrystalProgressRing pct={-30} level={-5} />)).not.toThrow();
    const nan = render(<CrystalProgressRing pct={NaN} level={NaN} />);
    // level clamps to 1 — scope to this render's own container (other renders
    // in this test also produce a "1", so a global getByText would be ambiguous)
    expect(nan.container.textContent).toContain('1');
  });

  it('grows the progress dash with pct', () => {
    const low = render(<CrystalProgressRing pct={25} level={1} size={132} />);
    const high = render(<CrystalProgressRing pct={75} level={1} size={132} />);
    const dashLow = parseFloat((low.container.querySelector('.ring-fill')?.getAttribute('stroke-dasharray') || '0').split(' ')[0]);
    const dashHigh = parseFloat((high.container.querySelector('.ring-fill')?.getAttribute('stroke-dasharray') || '0').split(' ')[0]);
    expect(dashHigh).toBeGreaterThan(dashLow);
  });
});
