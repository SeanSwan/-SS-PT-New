/**
 * GlowButton ↔ Style Lens tone contract.
 * Locks the Dual-Button Glow attribute the lens stylesheet targets:
 * blue-bg primaries advertise tone "blue" (Wing Purple glow rule),
 * purple-bg accents advertise tone "purple" (Ice Wing glow rule),
 * and non-dual variants advertise nothing.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GlowButton from './GlowButton';

describe('GlowButton lens tone attribute', () => {
  it('marks primary (Sapphire bg) buttons as tone blue', () => {
    render(<GlowButton variant="primary">Book session</GlowButton>);
    expect(
      screen.getByRole('button', { name: /book session/i }),
    ).toHaveAttribute('data-swan-button-tone', 'blue');
  });

  it('marks accent (Wing Purple bg) buttons as tone purple', () => {
    render(<GlowButton variant="accent">Level up</GlowButton>);
    expect(
      screen.getByRole('button', { name: /level up/i }),
    ).toHaveAttribute('data-swan-button-tone', 'purple');
  });

  it('resolves legacy aliases through the same tone map', () => {
    render(<GlowButton variant="neonBlue">Alias accent</GlowButton>);
    expect(
      screen.getByRole('button', { name: /alias accent/i }),
    ).toHaveAttribute('data-swan-button-tone', 'purple');
  });

  it('leaves non-dual variants untoned', () => {
    render(<GlowButton variant="gilded">Checkout</GlowButton>);
    expect(
      screen.getByRole('button', { name: /checkout/i }),
    ).not.toHaveAttribute('data-swan-button-tone');
  });
});
