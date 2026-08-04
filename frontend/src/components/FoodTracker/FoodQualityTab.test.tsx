/**
 * FoodQualityTab.test.tsx
 * =======================
 * Phase 4E smoke coverage for the resurrected ingredient-quality surface:
 * empty state renders, search drives /api/food-scanner/search through the
 * house apiService, and error state shows branded copy (no raw err.message).
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import FoodQualityTab from './FoodQualityTab';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: { get: mocks.get },
}));

describe('FoodQualityTab', () => {
  beforeEach(() => {
    mocks.get.mockReset();
  });

  it('renders its empty state with a 44px-contract search control', () => {
    render(<FoodQualityTab />);

    expect(
      screen.getByText('Search a product to inspect its ingredient quality.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('search', { name: 'Search food products' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product search')).toBeInTheDocument();
    // No search yet → the house apiService is untouched.
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('searches through the house apiService and lists results', async () => {
    mocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        products: [
          { id: 1, name: 'Rolled Oats', brand: 'SwanFarm', overallRating: 'good' },
        ],
      },
    });

    const user = userEvent.setup();
    render(<FoodQualityTab />);

    await user.type(screen.getByLabelText('Product search'), 'oats');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText('Rolled Oats')).toBeInTheDocument();
    });
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/api/food-scanner/search', {
      params: { query: 'oats', limit: 10 },
    });
  });

  it('shows branded error copy (never raw err.message) with a retry affordance', async () => {
    mocks.get.mockRejectedValueOnce(new Error('ECONNREFUSED 10.0.0.1:5432'));

    const user = userEvent.setup();
    render(<FoodQualityTab />);

    await user.type(screen.getByLabelText('Product search'), 'oats');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Product lookup is resting its wings. Please try again.'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
