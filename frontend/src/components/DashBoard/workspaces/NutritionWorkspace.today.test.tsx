import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
  workoutSessions: {
    data: [] as unknown[],
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

vi.mock('../../../hooks/useDashboardQueries', () => ({
  useWorkoutSessions: () => mocks.workoutSessions,
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

vi.mock('../../FoodTracker/FoodIntakeForm', () => ({
  default: ({ onReviewDraft }: { onReviewDraft: (draft: object) => void }) => (
    <button type="button" onClick={() => onReviewDraft({ id: 'manual-test' })}>Prepare manual draft</button>
  ),
}));

vi.mock('../../FoodTracker/NutritionReviewDrawer', () => ({
  default: ({ draft, onSaved }: {
    draft: object | null;
    onSaved: (success: boolean, options: object) => void;
  }) => (
    draft
      ? <button type="button" onClick={() => onSaved(true, { closeDrawer: true })}>Complete reviewed save</button>
      : null
  ),
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
    mocks.workoutSessions.data = [];
  });

  it('defaults to Today and lets the Today panel route into existing tabs', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /open today/i })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByLabelText(/nutrition today diary/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /search food/i }));
    // 4B: the tool name now appears in both the capture rail and the pill row.
    const captureRail = screen.getByRole('navigation', { name: /nutrition capture modes/i });
    expect(within(captureRail).getByRole('button', { name: /food search/i })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByLabelText('food search add')).toBeInTheDocument();
  });

  it('keeps the independent diary available while macro totals are unavailable', async () => {
    const user = userEvent.setup();
    mocks.macroSummary.summary = null;
    mocks.macroSummary.error = 'Macro summary unavailable. Try refreshing your dashboard.';

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    const alert = await screen.findByRole('alert', { name: /nutrition totals unavailable/i });
    expect(alert).toHaveTextContent(/Macro summary unavailable/i);
    expect(screen.getByLabelText(/nutrition today diary/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /today's diary timeline/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/0 calories logged today/i)).not.toBeInTheDocument();

    // 4B: the <select> is gone — the Insights segment lands on My Macros.
    await user.click(screen.getByRole('button', { name: /^insights$/i }));
    expect(await screen.findByRole('alert', { name: /nutrition totals unavailable/i }))
      .toHaveTextContent(/Macro summary unavailable/i);
  });

  it('returns to Today and refreshes the diary after a reviewed save', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    const captureRail = screen.getByRole('navigation', { name: /nutrition capture modes/i });
    await user.click(within(captureRail).getByRole('button', { name: /manual meal/i }));
    await user.click(await screen.findByRole('button', { name: /prepare manual draft/i }));
    await user.click(screen.getByRole('button', { name: /complete reviewed save/i }));

    expect(screen.getByRole('button', { name: /open today/i })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByLabelText(/nutrition today diary/i)).toBeInTheDocument();
    expect(mocks.macroSummary.refetch).toHaveBeenCalledTimes(1);
  });

  it('feeds real same-day workout sessions into training-day nutrition insights', async () => {
    mocks.macroSummary.summary = {
      ...mocks.defaultSummary,
      totalProtein: 60,
      totalFiber: 24,
      mealCount: 3,
    };
    mocks.workoutSessions.data = [{ id: 'workout-1', date: '2026-06-20T18:00:00.000Z' }];

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    expect(await screen.findByText(/training-day support/i)).toBeInTheDocument();
    expect(screen.getByText(/protein-forward meal and a water check-in/i)).toBeInTheDocument();
  });
});
