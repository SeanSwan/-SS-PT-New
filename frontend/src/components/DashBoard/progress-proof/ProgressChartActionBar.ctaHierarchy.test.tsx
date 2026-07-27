/**
 * TEST: ProgressChartActionBar CTA hierarchy (G4)
 * PURPOSE: The action row is no longer a flat set of equal buttons. Details is the
 *   primary drill action; Share is PROMOTED (accessible-labelled) only when the pulse
 *   tone is `record`; CSV/PNG are utility. Proven via the record-only aria-label.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: { post: vi.fn() } }),
}));

import ProgressChartActionBar from './ProgressChartActionBar';
import type { ProgressChartPulse } from './progressChartActions';

const pulse = (tone: ProgressChartPulse['tone']): ProgressChartPulse => ({
  label: 'Momentum',
  value: tone === 'record' ? 'New best' : 'Climbing',
  detail: '+8% vs prior',
  tone,
  target: 'Next: hold the streak',
});

const baseProps = {
  chartId: 'bench',
  chartTitle: 'Bench Press',
  csvRows: [{ label: 'Wk1', value: '200' }],
  drilldownRows: [],
  filename: 'bench.csv',
  range: 'recent' as const,
  summary: 'Bench is trending up.',
  onRangeChange: () => {},
};

describe('ProgressChartActionBar CTA hierarchy', () => {
  it('promotes Share only on a record tone; Details is always present; Share name stays stable', () => {
    const { rerender } = render(<ProgressChartActionBar {...baseProps} pulse={pulse('record')} />);
    // Details (primary drill) is always available.
    expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument();
    // The Share accessible name stays stable ("Share") across tones (WCAG 2.5.3);
    // the promotion is signalled by data-emphasis, not by renaming the control.
    const recordShare = screen.getByRole('button', { name: /^share$/i });
    expect(recordShare).toHaveAttribute('data-emphasis', 'promoted');

    rerender(<ProgressChartActionBar {...baseProps} pulse={pulse('rising')} />);
    const plainShare = screen.getByRole('button', { name: /^share$/i });
    expect(plainShare).not.toHaveAttribute('data-emphasis');
  });
});
