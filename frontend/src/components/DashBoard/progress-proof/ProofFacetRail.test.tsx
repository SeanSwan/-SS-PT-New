/**
 * TEST: ProofFacetRail (visual)
 * PURPOSE: Renders the 4 real tiers; lights only the earned ones; the current tier is
 *   marked aria-current; the caption is honest at zero / mid / full.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProofFacetRail from './ProofFacetRail';
import { TOTAL_PROGRESS_PROOF_CHARTS } from './progressProofSummary';

describe('ProofFacetRail', () => {
  it('renders all four tiers with an honest "spark your first tier" caption at zero', () => {
    render(<ProofFacetRail populated={0} />);
    expect(screen.getByTestId('proof-facet-rail')).toBeInTheDocument();
    ['Spark', 'Momentum', 'Apex', 'Legendary'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    expect(screen.getByText(/log a workout to spark your first tier/i)).toBeInTheDocument();
  });

  it('marks the highest earned tier as aria-current and captions the next target honestly', () => {
    render(<ProofFacetRail populated={5} />); // Momentum earned, 3 to Apex
    const current = document.querySelector('[aria-current="true"]');
    expect(current).not.toBeNull();
    expect(current?.textContent).toContain('Momentum');
    expect(screen.getByText(/3 more charts to apex/i)).toBeInTheDocument();
  });

  it('reports Legendary full-deck honestly with no "next" nag', () => {
    render(<ProofFacetRail populated={TOTAL_PROGRESS_PROOF_CHARTS} />);
    expect(screen.getByText(/full deck earned/i)).toBeInTheDocument();
    expect(screen.queryByText(/more charts to/i)).not.toBeInTheDocument();
  });
});
