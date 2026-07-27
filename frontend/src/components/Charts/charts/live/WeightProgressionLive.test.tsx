/**
 * TEST: WeightProgressionLive Journey (Ghost-Self) overlay
 * PURPOSE: A real multi-point series shows the "since you started" delta badge + the
 *   "faded = earlier you" hint; a short series falls back to the plain line (no badge).
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import WeightProgressionLive from './WeightProgressionLive';

vi.mock('../../../../hooks/useAnalytics', () => ({ useAnalytics: vi.fn() }));
const mockUseAnalytics = vi.mocked(useAnalytics);

const asState = (series: Array<{ x: string; y: number }>) => ({
  data: { data: series }, loading: false, error: null,
} as ReturnType<typeof useAnalytics>);

describe('WeightProgressionLive Journey overlay', () => {
  beforeEach(() => mockUseAnalytics.mockReset());

  it('shows the journey delta badge + faded-earlier hint for a real series', () => {
    mockUseAnalytics.mockReturnValue(asState([
      { x: 'W1', y: 180 }, { x: 'W2', y: 184 }, { x: 'W3', y: 188 }, { x: 'W4', y: 192 },
    ]));
    render(<WeightProgressionLive userId={7} />);
    expect(screen.getByText('+12 lbs since W1')).toBeInTheDocument(); // 192 - 180
    expect(screen.getByText(/faded line = earlier you/i)).toBeInTheDocument();
  });

  it('falls back to the plain line (no badge) when history is too short', () => {
    mockUseAnalytics.mockReturnValue(asState([{ x: 'W1', y: 180 }, { x: 'W2', y: 182 }]));
    render(<WeightProgressionLive userId={7} />);
    expect(screen.queryByText(/since W1/)).not.toBeInTheDocument();
    expect(screen.getByText('Body weight over time')).toBeInTheDocument();
  });

  it('renders the honest empty state with no measurements', () => {
    mockUseAnalytics.mockReturnValue(asState([]));
    render(<WeightProgressionLive userId={7} />);
    expect(screen.getByText('No measurements recorded yet')).toBeInTheDocument();
  });
});
