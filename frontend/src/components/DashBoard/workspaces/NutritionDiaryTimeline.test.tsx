
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../../../services/api.service', () => ({
  default: { get: apiGet },
}));

import NutritionDiaryTimeline from './NutritionDiaryTimeline';
import { todayIso } from './NutritionTodayPanel.logic';

describe('NutritionDiaryTimeline', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders diary provenance and sends repeat actions into review', async () => {
    apiGet.mockResolvedValue({
      data: {
        success: true,
        entries: [{
          id: 77,
          mealType: 'lunch',
          description: 'Chicken bowl',
          calories: 620,
          protein: 44,
          carbs: 70,
          fat: 18,
          source: 'usda_lookup',
          verified: false,
          servingBasis: 'household',
          servingQuantity: 1,
          servingUnit: 'bowl',
          confidenceScore: 0.78,
          reviewStatus: 'needs_review',
          reviewReason: 'client_requested',
          reconciliationStatus: 'metabolic_deviation',
        }],
      },
    });
    const onReviewDraft = vi.fn();
    const user = userEvent.setup();

    render(
      <NutritionDiaryTimeline
        gentleMode={false}
        refreshKey="two-meals"
        onReviewDraft={onReviewDraft}
      />,
    );

    expect(await screen.findByRole('heading', { name: /today's diary timeline/i })).toBeInTheDocument();
    expect(screen.getByText('Chicken bowl')).toBeInTheDocument();
    expect(screen.getByText('620 kcal | 44g protein')).toBeInTheDocument();
    expect(screen.getByText('Food search')).toBeInTheDocument();
    expect(screen.getByText('Coach review')).toBeInTheDocument();
    expect(screen.getByText('Reason: Client requested review')).toBeInTheDocument();
    expect(screen.getByText('Metabolic deviation')).toBeInTheDocument();
    expect(screen.getByText('78% confidence')).toBeInTheDocument();
    expect(screen.getByText('Serving: 1 bowl')).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledWith('/api/macros?date=' + todayIso());

    await user.click(screen.getByRole('button', { name: /review and repeat chicken bowl/i }));

    expect(onReviewDraft).toHaveBeenCalledWith(expect.objectContaining({
      source: 'search',
      rawPayloadRef: { provider: 'Swan diary', externalId: '77' },
      foods: [expect.objectContaining({ description: 'Chicken bowl', verified: false })],
    }));
  });

  it('labels active source aliases and edited review receipts honestly', async () => {
    apiGet.mockResolvedValue({
      data: {
        success: true,
        entries: [
          {
            id: 90, mealType: 'snack', description: 'Photo meal',
            source: 'food-scanner', reviewStatus: 'needs_review',
            reviewReason: 'edited_after_review',
          },
          {
            id: 91, mealType: 'dinner', description: 'Coach meal',
            source: 'ai-chat', reviewStatus: 'needs_review',
          },
        ],
      },
    });

    render(
      <NutritionDiaryTimeline
        gentleMode={false}
        refreshKey="source-aliases"
        onReviewDraft={vi.fn()}
      />,
    );

    expect(await screen.findByText('Photo meal')).toBeInTheDocument();
    expect(screen.getByText('Photo estimate')).toBeInTheDocument();
    expect(screen.getByText('Swan Coach')).toBeInTheDocument();
    expect(screen.getByText('Reason: Edited after coach review')).toBeInTheDocument();
  });

  it('hides macro numbers in Gentle Mode while preserving diary context', async () => {
    apiGet.mockResolvedValue({
      data: {
        success: true,
        entries: [{
          id: 80,
          mealType: 'snack',
          description: 'Yogurt and berries',
          calories: 310,
          protein: 22,
          source: 'manual',
          verified: false,
        }],
      },
    });

    render(
      <NutritionDiaryTimeline
        gentleMode
        refreshKey="gentle"
        onReviewDraft={vi.fn()}
      />,
    );

    expect(await screen.findByText('Yogurt and berries')).toBeInTheDocument();
    expect(screen.getByText('Nutrition numbers hidden')).toBeInTheDocument();
    expect(screen.queryByText(/310 kcal|22g protein/i)).not.toBeInTheDocument();
  });

  it('uses honest empty and safe failure states', async () => {
    apiGet.mockResolvedValueOnce({ data: { success: true, entries: [] } });

    const { rerender } = render(
      <NutritionDiaryTimeline
        gentleMode={false}
        refreshKey="empty"
        onReviewDraft={vi.fn()}
      />,
    );

    expect(await screen.findByText('No meals saved for today yet.')).toBeInTheDocument();

    apiGet.mockRejectedValueOnce(new Error('SQLSTATE raw provider trace'));
    rerender(
      <NutritionDiaryTimeline
        gentleMode={false}
        refreshKey="error"
        onReviewDraft={vi.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Today diary is temporarily unavailable.');
    expect(screen.queryByText(/SQLSTATE|provider trace/i)).not.toBeInTheDocument();
  });
});
