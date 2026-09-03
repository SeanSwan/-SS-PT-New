/**
 * CrystallizeRecord — the LAW 5 record artifact (Blueprint v2 S7 / D1).
 * Pins the four things the law actually requires: phases, tabular numerals,
 * gold only on a PR, and a reduced-motion path that settles instantly in JS.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CrystallizeRecord from './CrystallizeRecord';

const mockMatchMedia = (reduce: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduce,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  });
};

describe('CrystallizeRecord', () => {
  beforeEach(() => mockMatchMedia(false));
  afterEach(() => vi.restoreAllMocks());

  it('renders the phase it is given', () => {
    render(<CrystallizeRecord phase="forming" label="Bench Press" testId="rec" />);
    expect(screen.getByTestId('rec')).toHaveAttribute('data-phase', 'forming');
  });

  it('announces the record politely (a save is status, not an alert)', () => {
    render(<CrystallizeRecord phase="formed" label="Bench Press" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('renders the numeral with tabular figures so a settling number cannot reflow', () => {
    render(<CrystallizeRecord phase="formed" label="Bench" value="263 lb est. 1RM" testId="rec" />);
    const value = screen.getByText('263 lb est. 1RM');
    // Computed style, not a style-rule matcher: this proves the declaration
    // actually reaches the element, which is what the law is about.
    expect(window.getComputedStyle(value).fontVariantNumeric).toBe('tabular-nums');
  });

  it('shows the delta ONLY on a personal record (gold allowlist slot 1)', () => {
    const { rerender } = render(
      <CrystallizeRecord phase="formed" label="Bench" value="263" isPR delta="+18 lb" />,
    );
    expect(screen.getByText('+18 lb')).toBeInTheDocument();

    rerender(<CrystallizeRecord phase="formed" label="Bench" value="263" delta="+18 lb" />);
    expect(screen.queryByText('+18 lb')).toBeNull();
  });

  it('reduced motion mounts at the settled frame — the JS half of the guard', async () => {
    mockMatchMedia(true);
    render(<CrystallizeRecord phase="pending" label="Bench" testId="rec" />);
    expect(await screen.findByTestId('rec')).toHaveAttribute('data-phase', 'resting');
  });

  it('fails closed to reduced when matchMedia throws', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: () => { throw new Error('no matchMedia'); },
    });
    render(<CrystallizeRecord phase="pending" label="Bench" testId="rec" />);
    expect(await screen.findByTestId('rec')).toHaveAttribute('data-phase', 'resting');
  });
});
