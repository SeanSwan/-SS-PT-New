import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionWorkspace from './NutritionWorkspace';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn().mockResolvedValue({ data: { success: true } }),
  refetchMacroSummary: vi.fn(),
}));

vi.mock('../../../services/api.service', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { days: [] } }),
    post: mocks.apiPost,
  },
}));

vi.mock('../../../hooks/useMacroSummary', () => ({
  useMacroSummary: () => ({
    summary: {
      date: '2026-06-28',
      totalCalories: 820,
      totalProtein: 52,
      totalCarbs: 74,
      totalFat: 22,
      totalFiber: 9,
      mealCount: 2,
      meals: {},
    },
    loading: false,
    error: null,
    refetch: mocks.refetchMacroSummary,
  }),
}));

vi.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: true, isElite: false, isTrial: false }),
}));

vi.mock('../../../hooks/useHydration', () => ({
  useHydration: () => ({ filled: 4, dailyGoal: 8, glassOz: 10, loading: false, updateFilled: vi.fn() }),
}));

vi.mock('../../../hooks/useDashboardQueries', () => ({
  useWorkoutSessions: () => ({ data: [] }),
}));

vi.mock('../../Shared/CosmicSuspenseLoader', () => ({
  default: () => <div>Loading nutrition panel</div>,
}));

vi.mock('../../../utils/error-boundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../Shared/CrystallineLockOverlay', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./NutritionTodayPanel', () => ({
  default: () => <section aria-label="today diary">Today diary</section>,
}));

vi.mock('../../FoodTracker/RestaurantTab', () => ({
  default: ({ onAddFood }: { onAddFood?: (food: any) => void }) => (
    <section aria-label="restaurant nutrition tool">
      <button
        type="button"
        onClick={() => onAddFood?.({
          name: 'Turkey Sandwich',
          brandName: 'Panera',
          calories: 510,
          protein: 32,
          carbs: 54,
          fat: 18,
          portion: '1 sandwich',
          mealSource: 'restaurant',
        })}
      >
        Send restaurant food to review
      </button>
    </section>
  ),
}));

describe('NutritionWorkspace Nutrition OS command center', () => {
  beforeEach(() => {
    mocks.apiPost.mockClear();
    mocks.refetchMacroSummary.mockClear();
  });

  it('surfaces the unified Today capture actions', async () => {
    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    const commandCenter = await screen.findByRole('region', { name: /log food command center/i });
    expect(commandCenter).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual log/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /speak meal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /snap meal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan barcode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open food search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restaurant/i })).toBeInTheDocument();
  });

  it('routes restaurant foods into the shared review drawer before saving macros', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(await screen.findByRole('button', { name: /restaurant/i }));
    await user.click(await screen.findByRole('button', { name: /send restaurant food to review/i }));

    expect(await screen.findByRole('dialog', { name: /review turkey sandwich/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve and save 1 item/i }));

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledWith('/api/macros', expect.objectContaining({
      description: 'Panera Turkey Sandwich',
      source: 'usda_lookup',
      verified: false,
    })));
    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });
});
