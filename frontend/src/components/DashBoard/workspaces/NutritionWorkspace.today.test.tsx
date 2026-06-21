import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionWorkspace from './NutritionWorkspace';

const mocks = vi.hoisted(() => ({
  updateFilled: vi.fn(),
  apiGet: vi.fn().mockResolvedValue({ data: { days: [{ date: '2026-06-20', mealCount: 2 }] } }),
  defaultSummary: {
    date: '2026-06-20',
    totalCalories: 820,
    totalProtein: 52,
    totalCarbs: 74,
    totalFat: 22,
    totalFiber: 9,
    totalSugar: 30,
    totalSodium: 900,
    mealCount: 2,
    meals: {},
  },
  macroSummary: {
    summary: null as any,
    loading: false,
    error: null as string | null,
    refetch: vi.fn(),
  },
}));

vi.mock('../../../hooks/useMacroSummary', () => ({
  useMacroSummary: () => mocks.macroSummary,
}));

vi.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: true, isElite: false, isTrial: false }),
}));

vi.mock('../../../hooks/useHydration', () => ({
  useHydration: () => ({
    filled: 3,
    dailyGoal: 8,
    loading: false,
    updateFilled: mocks.updateFilled,
    resetToday: vi.fn(),
  }),
}));

vi.mock('../../../services/api.service', () => ({
  default: { get: mocks.apiGet },
}));

vi.mock('../../Shared/CosmicSuspenseLoader', () => ({
  default: () => <div>Loading nutrition panel</div>,
}));

vi.mock('../../../utils/error-boundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../FoodTracker/FoodSearchPanel', () => ({
  default: () => <section aria-label="food search add">Food search panel</section>,
}));

describe('NutritionWorkspace Today landing', () => {
  beforeAll(async () => {
    await import('./NutritionTodayPanel');
  });

  beforeEach(() => {
    mocks.apiGet.mockClear();
    mocks.macroSummary.summary = { ...mocks.defaultSummary };
    mocks.macroSummary.loading = false;
    mocks.macroSummary.error = null;
    mocks.macroSummary.refetch.mockClear();
  });

  it('defaults to Today and lets the Today panel route into existing tabs', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    expect(screen.getByRole('tab', { name: /today/i })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByLabelText(/nutrition today diary/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /search food/i }));

    expect(screen.getByRole('tab', { name: /food search/i })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByLabelText('food search add')).toBeInTheDocument();
  });

  it('surfaces macro-summary errors instead of rendering the Today diary as empty', async () => {
    const user = userEvent.setup();
    mocks.macroSummary.summary = null;
    mocks.macroSummary.error = 'Macro summary unavailable. Try refreshing your dashboard.';

    render(<NutritionWorkspace />);

    const alert = await screen.findByRole('alert', { name: /nutrition totals unavailable/i });
    expect(alert).toHaveTextContent(/Macro summary unavailable/i);
    expect(screen.queryByLabelText(/nutrition today diary/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/0 calories logged today/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /my macros/i }));
    expect(await screen.findByRole('alert', { name: /nutrition totals unavailable/i })).toHaveTextContent(/Macro summary unavailable/i);
  });
});
