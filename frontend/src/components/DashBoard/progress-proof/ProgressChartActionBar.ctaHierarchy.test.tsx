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
  it('promotes Share only on a record tone; Details is always present', () => {
    const { rerender } = render(<ProgressChartActionBar {...baseProps} pulse={pulse('record')} />);
    // Details (primary drill) is always available.
    expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument();
    // Share is promoted with a record-specific accessible label.
    expect(screen.getByRole('button', { name: /share new record proof card/i })).toBeInTheDocument();

    rerender(<ProgressChartActionBar {...baseProps} pulse={pulse('rising')} />);
    // Non-record: the promoted label is gone; a plain Share remains.
    expect(screen.queryByRole('button', { name: /share new record proof card/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
  });
});
