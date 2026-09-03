/**
 * Contract: marketing CLAIMS render in the initial DOM.
 *
 * StatsSection gates AnimatedCounter on useInView, so the count-up starts at 0.
 * Anything that never intersects — a crawler, a link-preview bot, print, no-JS,
 * a stuck observer — read "0+ Years Experience" and "0% Client Satisfaction".
 * Animating decoration is fine; animating the claim is not (Blueprint v2 S5/H8).
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnimatedCounter from './AnimatedCounter';

describe('AnimatedCounter seedFinal', () => {
  it('renders the final value immediately when seeded', () => {
    render(<AnimatedCounter target={26} suffix="+" seedFinal />);
    expect(screen.getByText(/26/)).toBeInTheDocument();
    expect(screen.queryByText(/^0\+$/)).toBeNull();
  });

  it('still starts at zero when NOT seeded (decoration keeps its count-up)', () => {
    render(<AnimatedCounter target={26} suffix="+" />);
    expect(screen.getByText(/^0\+$/)).toBeInTheDocument();
  });
});
