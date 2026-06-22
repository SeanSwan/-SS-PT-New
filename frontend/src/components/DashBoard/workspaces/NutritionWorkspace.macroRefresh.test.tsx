import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionWorkspace from './NutritionWorkspace';

const mocks = vi.hoisted(() => {
  const hydration = {
    filled: 4,
    dailyGoal: 8,
    glassOz: 10,
    loading: false,
    updateFilled: vi.fn(),
    resetToday: vi.fn(),
  };
  return {
    refetchMacroSummary: vi.fn(),
    hydration,
    useHydration: vi.fn(() => hydration),
  };
});

vi.mock('../../../hooks/useMacroSummary', () => ({
  useMacroSummary: () => ({
    summary: {
      totalCalories: 820,
      totalProtein: 52,
      totalCarbs: 74,
      totalFat: 22,
      totalFiber: 9,
    },
    loading: false,
    error: null,
    refetch: mocks.refetchMacroSummary,
  }),
}));

vi.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPro: true,
    isElite: false,
    isTrial: false,
  }),
}));

vi.mock('../../../hooks/useHydration', () => ({
  useHydration: () => mocks.useHydration(),
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

vi.mock('../../FoodTracker/FoodIntakeForm', () => ({
  default: ({ onDataSent }: { onDataSent?: (success: boolean) => void }) => (
    <section aria-label="meal logging form">
      <button type="button" onClick={() => onDataSent?.(true)}>
        Simulate successful meal log
      </button>
      <button type="button" onClick={() => onDataSent?.(false)}>
        Simulate failed meal log
      </button>
    </section>
  ),
}));

vi.mock('./NutritionTodayPanel', () => ({
  default: () => <section aria-label="today diary">Today diary</section>,
}));

vi.mock('../../FoodTracker/MealPlanTab', () => ({
  default: ({ onDataSent }: { onDataSent?: (success: boolean) => void }) => (
    <section aria-label="meal plan review">
      <button type="button" onClick={() => onDataSent?.(true)}>
        Simulate successful meal plan save
      </button>
      <button type="button" onClick={() => onDataSent?.(false)}>
        Simulate failed meal plan save
      </button>
    </section>
  ),
}));

vi.mock('../../FoodTracker/VoiceNutritionPanel', () => ({
  default: ({ onDataSent }: { onDataSent?: (success: boolean) => void }) => (
    <section aria-label="voice nutrition review">
      <button type="button" onClick={() => onDataSent?.(true)}>
        Simulate successful voice meal save
      </button>
      <button type="button" onClick={() => onDataSent?.(false)}>
        Simulate failed voice meal save
      </button>
    </section>
  ),
}));

vi.mock('../../FoodTracker/FoodSearchPanel', () => ({
  default: ({ onDataSent }: { onDataSent?: (success: boolean) => void }) => (
    <section aria-label="food search add">
      <button type="button" onClick={() => onDataSent?.(true)}>
        Simulate successful food search add
      </button>
      <button type="button" onClick={() => onDataSent?.(false)}>
        Simulate failed food search add
      </button>
    </section>
  ),
}));

vi.mock('../../Charts/charts/pie/MacroDonut', () => ({
  default: () => <section aria-label="macro donut">Macro donut</section>,
}));

vi.mock('../../Charts/charts/radar/NutritionBalanceRadar', () => ({
  default: ({
    protein,
    carbs,
    fat,
    fiber,
    hydrationMl,
    loading,
  }: {
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    hydrationMl?: number;
    loading?: boolean;
  }) => (
    <output
      data-testid="nutrition-radar"
      data-protein={String(protein)}
      data-carbs={String(carbs)}
      data-fat={String(fat)}
      data-fiber={String(fiber)}
      data-hydration-ml={String(hydrationMl)}
      data-loading={String(Boolean(loading))}
    >
      Nutrition radar
    </output>
  ),
}));

describe('NutritionWorkspace macro summary refresh', () => {
  beforeEach(() => {
    mocks.refetchMacroSummary.mockClear();
    mocks.hydration.filled = 4;
    mocks.hydration.dailyGoal = 8;
    mocks.hydration.glassOz = 10;
    mocks.useHydration.mockClear();
  });

  it('refreshes macro totals after a successful meal log', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /log meal/i }));
    await user.click(await screen.findByRole('button', { name: /simulate successful meal log/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('does not refresh macro totals after a failed meal log', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /log meal/i }));
    await user.click(await screen.findByRole('button', { name: /simulate failed meal log/i }));

    expect(mocks.refetchMacroSummary).not.toHaveBeenCalled();
  });

  it('links the active nutrition tab to the visible tabpanel', async () => {
    const user = userEvent.setup();
    render(<NutritionWorkspace />);
    expect(screen.getByRole('tab', { name: /today/i })).toHaveAttribute('id', 'nutrition-tab-today-tab');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'nutrition-tab-today-tab');
    await user.click(screen.getByRole('tab', { name: /my macros/i }));
    expect(screen.getByRole('tab', { name: /my macros/i })).toHaveAttribute('id', 'nutrition-tab-macros-tab');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'nutrition-tab-macros-tab');
  });

  it('refreshes macro totals after the meal-plan approve and save flow succeeds', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /swan coach meal plan/i }));
    await user.click(await screen.findByRole('button', { name: /simulate successful meal plan save/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('does not refresh macro totals after the meal-plan approve and save flow fails', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /swan coach meal plan/i }));
    await user.click(await screen.findByRole('button', { name: /simulate failed meal plan save/i }));

    expect(mocks.refetchMacroSummary).not.toHaveBeenCalled();
  });

  it('refreshes macro totals after the voice meal approve and save flow succeeds', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /speak a meal/i }));
    await user.click(await screen.findByRole('button', { name: /simulate successful voice meal save/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('refreshes macro totals after food search adds a meal', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /food search/i }));
    await user.click(await screen.findByRole('button', { name: /simulate successful food search add/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('does not refresh macro totals when voice or search reports a failed save', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /speak a meal/i }));
    await user.click(await screen.findByRole('button', { name: /simulate failed voice meal save/i }));
    await user.click(screen.getByRole('tab', { name: /food search/i }));
    await user.click(await screen.findByRole('button', { name: /simulate failed food search add/i }));

    expect(mocks.refetchMacroSummary).not.toHaveBeenCalled();
  });

  it('feeds persisted hydration progress into the nutrition radar without changing macro totals', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /my macros/i }));

    const radar = await screen.findByTestId('nutrition-radar');
    expect(radar).toHaveAttribute('data-protein', '52');
    expect(radar).toHaveAttribute('data-carbs', '74');
    expect(radar).toHaveAttribute('data-fat', '22');
    expect(radar).toHaveAttribute('data-fiber', '9');
    expect(radar).toHaveAttribute('data-hydration-ml', '1183');
  });

  it('keeps the nutrition radar loading until persisted hydration is known', async () => {
    const user = userEvent.setup();
    mocks.hydration.filled = 0;
    mocks.hydration.loading = true;

    render(<NutritionWorkspace />);

    await user.click(screen.getByRole('tab', { name: /my macros/i }));

    expect(await screen.findByTestId('nutrition-radar')).toHaveAttribute('data-loading', 'true');
  });

  it('does not initialize radar hydration state until the macros tab opens', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    expect(mocks.useHydration).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: /my macros/i }));
    await screen.findByTestId('nutrition-radar');

    expect(mocks.useHydration).toHaveBeenCalledTimes(1);
  });

  it('keeps the mounted nutrition workspace modules under the Swan line cap', () => {
    ['NutritionWorkspace.tsx', 'NutritionWorkspace.styles.ts', 'NutritionTodayPanel.tsx', 'NutritionTodayPanel.styles.ts', 'NutritionTodayPanel.logic.ts', 'NutritionTodayPanel.viewModel.ts'].forEach((fileName) => {
      const source = readFileSync(resolve(__dirname, fileName), 'utf8');
      expect(source.split(/\r?\n/).length, fileName).toBeLessThanOrEqual(300);
    });
  });
});
