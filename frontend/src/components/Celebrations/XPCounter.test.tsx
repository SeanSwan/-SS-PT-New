
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import XPCounter, { normalizeXpCounterValue } from './XPCounter';

const installReducedMotion = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('XPCounter reward display truth', () => {
  beforeEach(() => {
    installReducedMotion();
  });

  it('normalizes malformed XP values before rendering', () => {
    expect(normalizeXpCounterValue(125)).toBe(125);
    expect(normalizeXpCounterValue('150')).toBe(150);
    expect(normalizeXpCounterValue('12.5')).toBe(13);
    expect(normalizeXpCounterValue(Number.NaN)).toBe(0);
    expect(normalizeXpCounterValue(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeXpCounterValue(-25)).toBe(0);
    expect(normalizeXpCounterValue([250])).toBe(0);
    expect(normalizeXpCounterValue({ valueOf: () => 250 })).toBe(0);
    expect(normalizeXpCounterValue('0x10')).toBe(0);
    expect(normalizeXpCounterValue('1e2')).toBe(0);
  });

  it('does not render NaN or Infinity when celebration XP payloads are malformed', async () => {
    render(<XPCounter startXP={Number.NaN} endXP={Number.POSITIVE_INFINITY} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', '0 experience points');
    });

    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('does not count down or show a negative delta in a workout completion celebration', async () => {
    render(<XPCounter startXP={500} endXP={400} />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', '500 experience points');
    });

    expect(screen.getByText('500')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/-100 XP|\+-/);
  });
});
