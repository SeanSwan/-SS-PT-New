import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

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

vi.mock('../../FoodTracker/RestaurantTab', () => ({
  default: () => <section aria-label="restaurant nutrition tool">Restaurant tool</section>,
}));

vi.mock('../../FoodTracker/GardeningTab', () => ({
  default: () => <section aria-label="garden nutrition tool">Garden tool</section>,
}));

vi.mock('../../FoodTracker/FarmFinderTab', () => ({
  default: () => <section aria-label="farm finder nutrition tool">Farm finder tool</section>,
}));

vi.mock('../../FoodTracker/SupplementsTab', () => ({
  default: () => <section aria-label="supplements nutrition tool">Supplements tool</section>,
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
    hydrationTargetMl,
    loading,
  }: {
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    hydrationMl?: number;
    hydrationTargetMl?: number;
    loading?: boolean;
  }) => (
    <output
      data-testid="nutrition-radar"
      data-protein={String(protein)}
      data-carbs={String(carbs)}
      data-fat={String(fat)}
      data-fiber={String(fiber)}
      data-hydration-ml={String(hydrationMl)}
      data-hydration-target-ml={String(hydrationTargetMl)}
      data-loading={String(Boolean(loading))}
    >
      Nutrition radar
    </output>
  ),
}));

// 4B helpers: tool names now exist in both the capture rail and the pill
// row, and the "Views & tools" <select> was replaced by the segmented bar.
const captureRail = () => screen.getByRole('navigation', { name: /nutrition capture modes/i });

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

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(within(captureRail()).getByRole('button', { name: /manual meal/i }));
    await user.click(await screen.findByRole('button', { name: /simulate successful meal log/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('does not refresh macro totals after a failed meal log', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(within(captureRail()).getByRole('button', { name: /manual meal/i }));
    await user.click(await screen.findByRole('button', { name: /simulate failed meal log/i }));

    expect(mocks.refetchMacroSummary).not.toHaveBeenCalled();
  });

  it('refreshes macro totals after the meal-plan approve and save flow succeeds', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /^fuel$/i })); // 4B: Fuel segment lands on meal-plan
    await user.click(await screen.findByRole('button', { name: /simulate successful meal plan save/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('does not refresh macro totals after the meal-plan approve and save flow fails', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /^fuel$/i })); // 4B: Fuel segment lands on meal-plan
    await user.click(await screen.findByRole('button', { name: /simulate failed meal plan save/i }));

    expect(mocks.refetchMacroSummary).not.toHaveBeenCalled();
  });

  it('refreshes macro totals after the voice meal approve and save flow succeeds', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(within(captureRail()).getByRole('button', { name: /speak a meal/i }));
    await user.click(await screen.findByRole('button', { name: /simulate successful voice meal save/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('refreshes macro totals after food search adds a meal', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(within(captureRail()).getByRole('button', { name: /food search/i }));
    await user.click(await screen.findByRole('button', { name: /simulate successful food search add/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('does not refresh macro totals when voice or search reports a failed save', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(within(captureRail()).getByRole('button', { name: /speak a meal/i }));
    await user.click(await screen.findByRole('button', { name: /simulate failed voice meal save/i }));
    await user.click(within(captureRail()).getByRole('button', { name: /food search/i }));
    await user.click(await screen.findByRole('button', { name: /simulate failed food search add/i }));

    expect(mocks.refetchMacroSummary).not.toHaveBeenCalled();
  });

  it('feeds persisted hydration progress into the nutrition radar without changing macro totals', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /^insights$/i })); // 4B: Insights segment lands on macros

    const radar = await screen.findByTestId('nutrition-radar');
    expect(radar).toHaveAttribute('data-protein', '52');
    expect(radar).toHaveAttribute('data-carbs', '74');
    expect(radar).toHaveAttribute('data-fat', '22');
    expect(radar).toHaveAttribute('data-fiber', '9');
    expect(radar).toHaveAttribute('data-hydration-ml', '1183');
    expect(radar).toHaveAttribute('data-hydration-target-ml', '2366');
  });

  it('keeps the nutrition radar loading until persisted hydration is known', async () => {
    const user = userEvent.setup();
    mocks.hydration.filled = 0;
    mocks.hydration.loading = true;

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /^insights$/i })); // 4B: Insights segment lands on macros

    expect(await screen.findByTestId('nutrition-radar')).toHaveAttribute('data-loading', 'true');
  });

  it('does not initialize radar hydration state until the macros tab opens', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);
    expect(mocks.useHydration).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /^insights$/i })); // 4B: Insights segment lands on macros
    await screen.findByTestId('nutrition-radar');

    // Intent lock: hydration initializes only AFTER the tab opens. Exact
    // call-count was brittle — BP02 5.1's adherence fetch legitimately adds a
    // state-driven re-render of the panel (each render calls the hook once).
    expect(mocks.useHydration).toHaveBeenCalled();
  });
});
