/**
 * FUSION F2 — Crown Header + Looks Carousel (05-slices F2 criteria).
 * The band is the preview stage: tapping a card re-skins the HEADER only;
 * "Wear this" commits (chip with the exact copy); carousel order law:
 * committed -> v2-capable by mood-family order -> chrome styles.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const beginPreview = vi.fn();
const cancelPreview = vi.fn();
const commitPreview = vi.fn(async () => true);
const mockAppearance = vi.hoisted(() => ({ committedId: 'quiet-meridian' }));

vi.mock('../../../core/style-lens-os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../core/style-lens-os')>();
  return {
    ...actual,
    useStyleLensAppearance: () => ({
      state: {
        phase: 'idle',
        committed: {
          profileSchemaVersion: 1,
          paletteThemeId: 'crystalline-dark',
          styleLensId: mockAppearance.committedId,
          motionMode: 'auto',
          density: 'comfortable',
          updatedAt: '2026-07-16T00:00:00.000Z',
        },
        preview: null,
        rollbackProfile: null,
        error: null,
      },
      beginPreview,
      cancelPreview,
      commitPreview,
      setPersistenceSuppressed: vi.fn(),
      persistenceSuppressed: false,
      // Mirrors the real registry: resolve() NEVER returns undefined — unknown
      // ids resolve to the default-safety manifest (fail-closed).
      registry: {
        available: vi.fn(),
        get: vi.fn(),
        issues: vi.fn(),
        resolve: (id: string) => ({
          id: id === 'default-safety' ? 'default-safety' : 'default-safety',
          name: 'Crystalline Default',
          description: 'The always-safe Crystalline Swan baseline.',
          emotionalJob: 'calm baseline',
        }),
      },
    }),
  };
});

const mockAuth = vi.hoisted(() => ({ user: { id: 42 } as { id: number } | null }));
vi.mock('../../../context/authContextState', () => ({ useAuth: () => mockAuth }));

import CrownHeader from './CrownHeader';

describe('CrownHeader (F2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAppearance.committedId = 'quiet-meridian';
    mockAuth.user = { id: 42 };
  });

  it('renders the committed look identity and the exact caption copy', () => {
    render(<CrownHeader />);
    expect(screen.getByText('YOUR LOOK')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Quiet Meridian' })).toBeTruthy();
    expect(
      screen.getByText('Tap a look to preview it here · nothing changes until you wear it.'),
    ).toBeTruthy();
  });

  it('carousel order law: committed first, then v2-capable by family order, then chrome', () => {
    render(<CrownHeader />);
    const carousel = screen.getByRole('list', { name: 'Looks carousel' });
    const names = within(carousel)
      .getAllByRole('button')
      .map((card) => card.getAttribute('data-look-id'))
      .filter(Boolean);
    expect(names[0]).toBe('quiet-meridian'); // committed first
    // v2-capable next: candy-glass-arcade (playful) before prism-terminal (technical)
    expect(names[1]).toBe('candy-glass-arcade');
    expect(names[2]).toBe('prism-terminal');
    // then chrome styles follow; committed never repeats
    expect(names.filter((id) => id === 'quiet-meridian')).toHaveLength(1);
    expect(names.length).toBeGreaterThanOrEqual(26);
  });

  it('WORN badge sits exactly on the committed card; v2 cards carry the v2 tag', () => {
    render(<CrownHeader />);
    const carousel = screen.getByRole('list', { name: 'Looks carousel' });
    const committedCard = within(carousel).getByRole('button', { name: /Quiet Meridian/ });
    expect(within(committedCard).getByText('WORN')).toBeTruthy();
    const candy = within(carousel).getByRole('button', { name: /Candy Glass Arcade/ });
    expect(within(candy).getByText('v2')).toBeTruthy();
    expect(within(candy).queryByText('WORN')).toBeNull();
  });

  it('tapping a card previews INSIDE the header frame only and stages via beginPreview', () => {
    const { container } = render(<CrownHeader />);
    const headerFrame = container.querySelector('[data-crown-frame] [data-scoped-lens-frame]') as HTMLElement;
    expect(headerFrame.getAttribute('data-style-lens')).toBe('quiet-meridian');
    fireEvent.click(screen.getByRole('button', { name: /Candy Glass Arcade/ }));
    expect(headerFrame.getAttribute('data-style-lens')).toBe('candy-glass-arcade');
    expect(beginPreview).toHaveBeenCalledWith(
      expect.objectContaining({ styleLensId: 'candy-glass-arcade' }),
    );
    expect(commitPreview).not.toHaveBeenCalled();
  });

  it('"Wear this" appears in preview, commits ONCE, and fires the chip with the exact copy', async () => {
    render(<CrownHeader />);
    expect(screen.queryByRole('button', { name: 'Wear this' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Candy Glass Arcade/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Wear this' }));
    });
    expect(commitPreview).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('lab-confirmation-chip-lane').textContent).toBe(
      'Candy Glass Arcade is now your look everywhere.',
    );
  });

  it('carousel arrows carry the exact aria-labels; band is aria-hidden decoration', () => {
    const { container } = render(<CrownHeader />);
    expect(screen.getByRole('button', { name: 'Previous looks' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next looks' })).toBeTruthy();
    expect(container.querySelector('[data-crown-band][aria-hidden="true"]')).not.toBeNull();
  });

  it('anonymous state shows the exact sign-in line and still allows browsing', () => {
    mockAuth.user = null;
    render(<CrownHeader />);
    expect(screen.getByText('Sign in to keep your look on every device.')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Looks carousel' })).toBeTruthy();
  });

  it('R2-1 fresh-user state (default-safety): WORN card synthesized from the registry, real name, no invented copy', () => {
    mockAppearance.committedId = 'default-safety';
    render(<CrownHeader />);
    // Band shows the REGISTRY name — never the invented 'Swan Flagship'.
    expect(screen.getByRole('heading', { name: 'Crystalline Default' })).toBeTruthy();
    expect(screen.queryByText('Swan Flagship')).toBeNull();
    const carousel = screen.getByRole('list', { name: 'Looks carousel' });
    const first = within(carousel).getAllByRole('button')[0];
    expect(first.getAttribute('data-look-id')).toBe('default-safety');
    expect(within(first).getByText('WORN')).toBeTruthy();
  });

  it('R2-1 tap-again dismisses the preview (frame returns to committed, preview canceled)', () => {
    const { container } = render(<CrownHeader />);
    const frame = () =>
      container.querySelector('[data-crown-frame] [data-scoped-lens-frame]') as HTMLElement;
    fireEvent.click(screen.getByRole('button', { name: /Candy Glass Arcade/ }));
    expect(frame().getAttribute('data-style-lens')).toBe('candy-glass-arcade');
    fireEvent.click(screen.getByRole('button', { name: /Candy Glass Arcade/ }));
    expect(frame().getAttribute('data-style-lens')).toBe('quiet-meridian');
    expect(cancelPreview).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Wear this' })).toBeNull();
  });

  it('R2-6 source contract: CrownHeader renders BEFORE the tab bar inside the V3 home branch', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const v3 = readFileSync(resolve(__dirname, '../UserDashboard.V3.tsx'), 'utf8');
    const crownIndex = v3.indexOf('<CrownHeader />');
    const tabBarIndex = v3.indexOf('<UserDashboardTabBarV3');
    expect(crownIndex).toBeGreaterThan(-1);
    expect(tabBarIndex).toBeGreaterThan(-1);
    expect(crownIndex).toBeLessThan(tabBarIndex);
  });

  it('unmount cancels any in-flight preview (never leaks a staged preview)', () => {
    const { unmount } = render(<CrownHeader />);
    fireEvent.click(screen.getByRole('button', { name: /Candy Glass Arcade/ }));
    unmount();
    expect(cancelPreview).toHaveBeenCalled();
  });
});
