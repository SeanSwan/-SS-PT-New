/**
 * TEST: MetricConstellation (Constellation C-b visual)
 * PURPOSE: Renders honest "these move together" insight rows from real correlating
 *   series; renders NOTHING when there is no well-sampled relationship.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MetricConstellation from './MetricConstellation';
import type { CanonicalProgressCharts } from '../../hooks/analytics/useClientProgressCharts';

const pts = (ys: number[]) => ys.map((y, i) => ({ x: `W${i + 1}`, y }));

// Only the correlatable keys the component reads need to be present.
const bundle = (partial: Partial<Record<string, ReturnType<typeof pts>>>) =>
  partial as unknown as CanonicalProgressCharts;

describe('MetricConstellation', () => {
  it('renders an honest connection when two metrics correlate', () => {
    render(<MetricConstellation charts={bundle({
      weeklyVolume: pts([1, 2, 3, 4]),
      weightTrend: pts([2, 4, 6, 8]), // perfectly correlated with volume
    })} />);
    expect(screen.getByTestId('metric-constellation')).toBeInTheDocument();
    expect(screen.getByText('Training Volume and Body Weight rise and fall together')).toBeInTheDocument();
    expect(screen.getByText(/this is correlation.*not proof that one causes/i)).toBeInTheDocument(); // causation-safe microcopy
  });

  it('labels an inverse relationship correctly', () => {
    render(<MetricConstellation charts={bundle({
      weeklyVolume: pts([1, 2, 3, 4]),
      bodyFatTrend: pts([4, 3, 2, 1]), // inverse
    })} />);
    expect(screen.getByText('Training Volume and Body Fat move in opposite directions')).toBeInTheDocument();
  });

  it('renders NOTHING when there is no real relationship (flat / single series)', () => {
    render(<MetricConstellation charts={bundle({
      weeklyVolume: pts([1, 2, 3, 4]),
      recoverySignal: pts([9, 9, 9, 9]), // flat -> no correlation
    })} />);
    expect(screen.queryByTestId('metric-constellation')).not.toBeInTheDocument();
  });
});
