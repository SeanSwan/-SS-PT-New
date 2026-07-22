/**
 * CC-1 MuscleReadinessCard contracts: honesty label + explainer, luminance/texture/text state
 * encoding (never color alone — asserted via visible state text), quiet degradation on error,
 * read-only (no buttons besides the explainer — indispensability law).
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const apiGet = vi.fn();
vi.mock('../../../../services/api.service', () => ({
  default: { get: (...args: unknown[]) => apiGet(...args) },
}));
vi.mock('../../../../utils/logger', () => ({ logger: { warn: vi.fn() } }));

import MuscleReadinessCard from './MuscleReadinessCard';

const board = {
  success: true,
  data: {
    source: 'training-log-estimate',
    todayLocalDate: '2026-07-22',
    groups: [
      { group: 'quads', pct: 20, state: 'loading', lastTrainedLocalDate: '2026-07-22' },
      { group: 'chest', pct: 72, state: 'caution', lastTrainedLocalDate: '2026-07-20' },
      { group: 'back', pct: 100, state: 'ready', lastTrainedLocalDate: '2026-07-15' },
    ],
  },
};

describe('MuscleReadinessCard', () => {
  beforeEach(() => apiGet.mockReset());

  it('renders the board with text state labels (never color-alone)', async () => {
    apiGet.mockResolvedValueOnce({ data: board });
    render(<MuscleReadinessCard userId={7} />);
    expect(await screen.findByTestId('muscle-readiness-card')).toBeInTheDocument();
    expect(screen.getByText('resting')).toBeInTheDocument();
    expect(screen.getByText('recharging')).toBeInTheDocument();
    expect(screen.getByText('ready')).toBeInTheDocument();
  });

  it('carries the honesty label and the trainer-decides explainer', async () => {
    apiGet.mockResolvedValueOnce({ data: board });
    render(<MuscleReadinessCard userId={7} />);
    const tag = await screen.findByRole('button', { name: /recovery estimate/i });
    fireEvent.click(tag);
    expect(screen.getByTestId('readiness-explainer').textContent).toMatch(/your trainer makes the call/i);
  });

  it('degrades to nothing on fetch error — the home page never looks broken', async () => {
    apiGet.mockRejectedValueOnce(new Error('boom'));
    const { container } = render(<MuscleReadinessCard userId={7} />);
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('[data-testid="muscle-readiness-card"]')).toBeNull());
  });

  it('is read-only: the ONLY interactive element is the explainer toggle', async () => {
    apiGet.mockResolvedValueOnce({ data: board });
    render(<MuscleReadinessCard userId={7} />);
    await screen.findByTestId('muscle-readiness-card');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('renders nothing when userId is absent (no phantom fetch)', () => {
    const { container } = render(<MuscleReadinessCard userId={undefined} />);
    expect(container.firstChild).toBeNull();
    expect(apiGet).not.toHaveBeenCalled();
  });
});

describe('CC-1b Crystalline Body', () => {
  it('renders the silhouette with region states mapped from group readiness', async () => {
    apiGet.mockResolvedValueOnce({ data: board });
    render(<MuscleReadinessCard userId={7} />);
    await screen.findByTestId('muscle-readiness-card');
    const body = screen.getByTestId('crystalline-body');
    expect(body.getAttribute('aria-hidden')).toBe('true'); // decorative — the list carries the a11y truth
    const legs = body.querySelectorAll('[data-readiness="loading"]');
    expect(legs.length).toBeGreaterThan(0); // quads trained today → leg regions dim
    const chest = body.querySelectorAll('[data-readiness="caution"]');
    expect(chest.length).toBeGreaterThan(0);
  });

  it('regions with no readiness data render as ready (untrained = fully recovered)', async () => {
    apiGet.mockResolvedValueOnce({ data: board });
    render(<MuscleReadinessCard userId={7} />);
    await screen.findByTestId('muscle-readiness-card');
    const body = screen.getByTestId('crystalline-body');
    expect(body.querySelectorAll('[data-readiness="ready"]').length).toBeGreaterThan(0);
  });
});
