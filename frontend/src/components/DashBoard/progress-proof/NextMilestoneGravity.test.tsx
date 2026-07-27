/**
 * TEST: NextMilestoneGravity + pulse gravity math
 * PURPOSE: The pulse emits a direction-aware progressToNext (0..1) + remaining gap,
 *   and the bar renders it as an accessible progressbar with the right pull caption.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NextMilestoneGravity from './NextMilestoneGravity';
import ProgressChartInsightBar from './ProgressChartInsightBar';
import { buildProgressChartPulse } from './progressChartPulse';

describe('pulse Next-Milestone Gravity math', () => {
  it('computes progress toward the best for a rising (higher-is-better) metric', () => {
    const pulse = buildProgressChartPulse(
      [{ x: 'W1', y: 200 }, { x: 'W2', y: 100 }, { x: 'W3', y: 150 }],
      { unit: 'lb', higherIsBetter: true },
    );
    expect(pulse.tone).toBe('rising');
    expect(pulse.progressToNext).toBeCloseTo(0.75); // 150 / 200
    expect(pulse.remainingLabel).toBe('50 lb'); // 200 - 150
  });

  it('reads full + empty gap at a new record', () => {
    const pulse = buildProgressChartPulse(
      [{ x: 'W1', y: 100 }, { x: 'W2', y: 200 }],
      { unit: 'lb', higherIsBetter: true },
    );
    expect(pulse.tone).toBe('record');
    expect(pulse.progressToNext).toBe(1);
    expect(pulse.remainingLabel).toBe('');
  });

  it('inverts direction for a lower-is-better metric', () => {
    const pulse = buildProgressChartPulse(
      [{ x: 'W1', y: 20 }, { x: 'W2', y: 25 }],
      { unit: '%', higherIsBetter: false },
    );
    expect(pulse.progressToNext).toBeCloseTo(0.8); // best 20 / latest 25
    expect(pulse.remainingLabel).toBe('5 %'); // 25 - 20
  });
});

describe('NextMilestoneGravity component', () => {
  it('renders an accessible progressbar with the pull caption', () => {
    render(<NextMilestoneGravity progressToNext={0.75} remainingLabel="50 lb" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('50 lb to your best')).toBeInTheDocument();
  });

  it('shows the peak caption when there is no gap', () => {
    render(<NextMilestoneGravity progressToNext={1} atPeak />);
    expect(screen.getByText('Peak reached - protect it')).toBeInTheDocument();
  });

  it('D5: guards a non-finite progress value (no NaN in aria-valuenow)', () => {
    render(<NextMilestoneGravity progressToNext={Number.NaN} remainingLabel="5 lb" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('ProgressChartInsightBar gravity mount', () => {
  it('renders the gravity bar only when the pulse carries progressToNext', () => {
    const withGravity = buildProgressChartPulse(
      [{ x: 'W1', y: 200 }, { x: 'W2', y: 150 }],
      { unit: 'lb', higherIsBetter: true },
    );
    const { rerender } = render(<ProgressChartInsightBar pulse={withGravity} />);
    expect(screen.getByTestId('next-milestone-gravity')).toBeInTheDocument();

    rerender(<ProgressChartInsightBar pulse={{ ...withGravity, progressToNext: undefined }} />);
    expect(screen.queryByTestId('next-milestone-gravity')).not.toBeInTheDocument();
  });
});
