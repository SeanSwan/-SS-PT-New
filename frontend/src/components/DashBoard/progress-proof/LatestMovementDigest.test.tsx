/**
 * TEST: LatestMovementDigest (visual)
 * PURPOSE: Renders real movement rows; renders NOTHING when there's no movement to show;
 *   the count reflects only metrics that moved; neutral metrics are not colored good/bad.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LatestMovementDigest from './LatestMovementDigest';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';

const pts = (ys: number[]) => ys.map((y, i) => ({ x: `W${i + 1}`, y }));
const bundle = (p: Partial<Record<string, ReturnType<typeof pts>>>) => p as unknown as CanonicalProgressCharts;

describe('LatestMovementDigest', () => {
  it('renders a row and honest count for real movement', () => {
    render(<LatestMovementDigest charts={bundle({
      workoutFrequency: pts([3, 5]),   // moved
      weightTrend: pts([180, 180]),    // flat
    })} />);
    expect(screen.getByTestId('latest-movement-digest')).toBeInTheDocument();
    expect(screen.getByText('Workouts')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 moved')).toBeInTheDocument();
  });

  it('shows the signed delta + percent in the visible chip for a metric that improved', () => {
    render(<LatestMovementDigest charts={bundle({ workoutFrequency: pts([3, 5]) })} />);
    // the "+N (+X%)" form appears only in the visible Delta chip, not the SR text
    expect(screen.getByText(/\+2 \(\+66\.7%\)/)).toBeInTheDocument();
  });

  it('renders NOTHING when no metric has enough logged points', () => {
    render(<LatestMovementDigest charts={bundle({ workoutFrequency: pts([4]) })} />);
    expect(screen.queryByTestId('latest-movement-digest')).not.toBeInTheDocument();
  });
});
