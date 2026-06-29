import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import ProductAnalysis, { type FoodProduct } from './ProductAnalysis';

vi.mock('axios', () => ({
  default: { post: vi.fn() },
}));

const product: FoodProduct = {
  id: 1,
  barcode: '123456789012',
  name: 'Chocolate Protein Bar',
  brand: 'Swan Test Foods',
  description: null,
  ingredientsList: 'dates, whey protein, soy lecithin',
  ingredients: [{
    name: 'Soy lecithin',
    healthRating: 'okay',
    isGMO: true,
    isProcessed: true,
    iarcGroup: null,
    isEUBanned: false,
    healthConcerns: ['Label disclosure may matter for sourcing preference'],
    healthierAlternatives: ['Sunflower lecithin'],
  }],
  nutritionalInfo: { calories: 210, protein: 20, sugars_100g: 18 },
  overallRating: 'okay',
  ratingReasons: null,
  healthConcerns: ['Contains processed ingredient signals'],
  isOrganic: false,
  isNonGMO: false,
  category: 'snack',
  imageUrl: null,
  healthierAlternatives: ['Greek yogurt and berries'],
  dataSource: 'Open Food Facts',
  lastVerified: null,
};

describe('ProductAnalysis intelligence actions', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
  });

  it('renders source-aware panels and creates explain/video draft requests', async () => {
    const user = userEvent.setup();
    vi.mocked(axios.post)
      .mockResolvedValueOnce({
        data: {
          success: true,
          explanation: {
            sourceConfidence: { provider: 'Open Food Facts', confidence: 'community', detail: 'Community provider data.' },
            flags: [{ label: 'Soy lecithin: processed ingredient signal', category: 'processing', evidence: 'Ingredient reference data' }],
            sections: [{ title: 'How it is commonly made', body: 'Manufacturing varies by supplier.' }],
            guardrails: ['Not medical advice.'],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          videoBrief: {
            title: 'What is in Chocolate Protein Bar?',
            status: 'draft_not_published',
            sourceConfidence: { provider: 'Open Food Facts', confidence: 'community', detail: 'Community provider data.' },
            claims: [],
            scenes: [{ title: 'Show the product label', notes: 'Name the provider source.' }],
            guardrails: ['Draft only; nothing is published automatically.'],
          },
        },
      });

    render(<ProductAnalysis product={product} onAddToLog={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByText(/Swan Score: Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence: community/i)).toBeInTheDocument();
    expect(screen.getByText(/Soy lecithin/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /How made/i }));
    await user.click(screen.getByRole('button', { name: /Explain product/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/food-scanner/explain-product', { product });
    });
    expect(await screen.findByText(/Manufacturing varies by supplier/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create video brief/i }));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/food-scanner/video-brief', { product });
    });
    expect(await screen.findByText(/draft not published/i)).toBeInTheDocument();
  });
});