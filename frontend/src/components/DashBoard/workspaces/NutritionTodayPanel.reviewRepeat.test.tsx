/**
 * FILE: NutritionTodayPanel.reviewRepeat.test.tsx
 * PURPOSE: Lock repeat-meal actions to the shared review-first draft contract.
 * SCOPE: Same-day and recent-day diary entries; no direct macro writes.
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionTodayPanel from './NutritionTodayPanel';
import { daysAgoIso, todayIso } from './NutritionTodayPanel.logic';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('../../../hooks/useHydration', () => ({
  useHydration: () => ({
    filled: 3,
    dailyGoal: 8,
    glassOz: 8,
    loading: false,
    updateFilled: vi.fn(),
    resetToday: vi.fn(),
  }),
}));

vi.mock('../../../services/api.service', () => ({
  default: { get: mocks.apiGet, post: mocks.apiPost },
}));

vi.mock('./NutritionDiaryTimeline', () => ({
  default: () => null,
}));

const summary = {
  date: todayIso(),
  totalCalories: 820,
  totalProtein: 52,
  totalCarbs: 74,
  totalFat: 22,
  totalFiber: 9,
  totalSugar: 30,
  totalSodium: 900,
  mealCount: 2,
  meals: {},
};

describe('NutritionTodayPanel review-first repeat flow', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.apiGet.mockReset();
    mocks.apiPost.mockReset();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url.startsWith('/api/macros?date=')) {
        return Promise.resolve({
          data: {
            entries: [{
              id: 77,
              mealType: ' Lunch ',
              description: 'Chicken bowl',
              calories: 640,
              protein: 45,
              carbs: 70,
              fat: 18,
              source: 'photo',
              verified: true,
            }],
          },
        });
      }
      return Promise.resolve({ data: { days: [{ date: todayIso(), mealCount: 2 }] } });
    });
  });

  it('routes the latest meal through review instead of writing directly', async () => {
    const user = userEvent.setup();
    const onReviewDraft = vi.fn();

    render(
      <NutritionTodayPanel summary={summary} onNavigate={vi.fn()} onReviewDraft={onReviewDraft} />,
    );

    await user.click(await screen.findByRole('button', { name: /review and repeat latest meal/i }));

    expect(mocks.apiPost).not.toHaveBeenCalled();
    expect(onReviewDraft).toHaveBeenCalledWith(expect.objectContaining({
      source: 'photo',
      // Deliberate downgrade per FIVE-DAY-HOSTILE-REVIEW-REPAIR-EVIDENCE-2026-07-12:
      // Swan diary repeats never retain the original provenance confidence.
      sourceConfidence: 'community',
      foods: [expect.objectContaining({
        mealType: 'lunch',
        description: 'Chicken bowl',
        nutrients: expect.objectContaining({ calories: 640, protein: 45 }),
        verified: false,
      })],
    }));
  });

  it('offers review-first repeat from a recent prior-day meal when today is empty', async () => {
    const user = userEvent.setup();
    const yesterday = daysAgoIso(1);
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === `/api/macros?date=${todayIso()}`) {
        return Promise.resolve({ data: { entries: [] } });
      }
      if (url === `/api/macros?date=${yesterday}`) {
        return Promise.resolve({
          data: {
            entries: [{
              mealType: 'breakfast',
              description: 'Greek yogurt bowl',
              calories: 410,
              protein: 32,
              carbs: 38,
              fat: 11,
              verified: true,
            }],
          },
        });
      }
      return Promise.resolve({ data: { days: [{ date: todayIso(), mealCount: 0 }] } });
    });

    const onReviewDraft = vi.fn();
    render(
      <NutritionTodayPanel
        summary={{ ...summary, mealCount: 0 }}
        onNavigate={vi.fn()}
        onReviewDraft={onReviewDraft}
      />,
    );

    await user.click(await screen.findByRole('button', { name: /review and repeat latest meal/i }));

    expect(mocks.apiGet).toHaveBeenCalledWith(`/api/macros?date=${todayIso()}`);
    expect(mocks.apiGet).toHaveBeenCalledWith(`/api/macros?date=${yesterday}`);
    expect(mocks.apiPost).not.toHaveBeenCalled();
    expect(onReviewDraft).toHaveBeenCalledWith(expect.objectContaining({
      source: 'manual',
      foods: [expect.objectContaining({
        mealType: 'breakfast',
        description: 'Greek yogurt bowl',
        nutrients: expect.objectContaining({ calories: 410, protein: 32 }),
        verified: false,
      })],
    }));
  });
});
