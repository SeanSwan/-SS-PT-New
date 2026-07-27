/**
 * TEST: BodyFatTrendLine Journey (Ghost-Self v2) overlay
 * PURPOSE: Body fat is direction-known (lower = better), so a decreasing series shows an
 *   "improved" delta badge; a short series falls back; an all-invalid payload is honest.
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import BodyFatTrendLine from './BodyFatTrendLine';

vi.mock('../../../../hooks/useAnalytics', () => ({ useAnalytics: vi.fn() }));
const mockUseAnalytics = vi.mocked(useAnalytics);

const asState = (series: Array<{ x: string; y: number }>) => ({
  data: { data: series }, loading: false, error: null,
} as ReturnType<typeof useAnalytics>);

describe('BodyFatTrendLine Journey overlay', () => {
  beforeEach(() => mockUseAnalytics.mockReset());

  it('shows a direction-aware improvement delta for a falling body-fat series', () => {
    mockUseAnalytics.mockReturnValue(asState([
      { x: 'W1', y: 25 }, { x: 'W2', y: 22 }, { x: 'W3', y: 20 }, { x: 'W4', y: 18 },
    ]));
    render(<BodyFatTrendLine userId={7} />);
    expect(screen.getByText(/-7 % since W1/)).toBeInTheDocument(); // 18 - 25, lower is better
    expect(screen.getByText(/faded line = earlier you/i)).toBeInTheDocument();
  });

  it('falls back to the plain line for short history', () => {
    mockUseAnalytics.mockReturnValue(asState([{ x: 'W1', y: 25 }, { x: 'W2', y: 24 }]));
    render(<BodyFatTrendLine userId={7} />);
    expect(screen.queryByText(/since W1/)).not.toBeInTheDocument();
    expect(screen.getByText('Body fat % over time')).toBeInTheDocument();
  });

  it('renders the honest empty state for an all-invalid payload', () => {
    mockUseAnalytics.mockReturnValue(asState([{ x: 'W1', y: Number.NaN }, { x: 'W2', y: Number.NaN }]));
    render(<BodyFatTrendLine userId={7} />);
    expect(screen.getByText('No body fat measurements yet')).toBeInTheDocument();
  });
});