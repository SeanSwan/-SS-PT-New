import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

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
  useSubscription: () => ({
    hasGuardianAccess: true,
    loading: false,
    error: null, isPro: true, isElite: false, isTrial: false }),
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

vi.mock('../../FoodTracker/NutritionBarcodeCapture', () => ({
  default: () => <section aria-label="embedded barcode capture">Embedded barcode capture</section>,
}));

vi.mock('../../FoodTracker/GardeningTab', () => ({
  default: () => <section aria-label="garden nutrition tool">Garden nutrition tool</section>,
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

  it('surfaces one five-mode capture rail and keeps barcode scanning embedded', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    const captureRail = await screen.findByRole('navigation', { name: /nutrition capture modes/i });
    expect(within(captureRail).getByRole('button', { name: /manual meal/i })).toBeInTheDocument();
    expect(within(captureRail).getByRole('button', { name: /food search/i })).toBeInTheDocument();
    expect(within(captureRail).getByRole('button', { name: /barcode/i })).toBeInTheDocument();
    expect(within(captureRail).getByRole('button', { name: /speak a meal/i })).toBeInTheDocument();
    expect(within(captureRail).getByRole('button', { name: /restaurant/i })).toBeInTheDocument();
    expect(within(captureRail).queryByRole('button', { name: /snap meal/i })).not.toBeInTheDocument();

    await user.click(within(captureRail).getByRole('button', { name: /barcode/i }));

    expect(await screen.findByLabelText(/embedded barcode capture/i)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /log food command center/i })).not.toBeInTheDocument();
  });

  it('labels the active workbench region without exposing a second tab system', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /open today/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: /today dashboard/i })).toBeInTheDocument();
    // 4B: the <select> is gone — the Insights segment lands on My Macros.
    await user.click(screen.getByRole('button', { name: /^insights$/i }));
    expect(screen.getByRole('region', { name: /my macros/i })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('keeps non-capture nutrition surfaces reachable through the segmented bar', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    const captureRail = screen.getByRole('navigation', { name: /nutrition capture modes/i });
    expect(within(captureRail).getByRole('button', { name: /restaurant/i })).toBeInTheDocument();
    // Capture segment is active by default — Insights tools are not rendered yet.
    expect(screen.queryByRole('button', { name: /^garden$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /farm finder/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /supplements/i })).not.toBeInTheDocument();

    // 4B: the <select> is gone — Insights segment, then the Garden pill.
    await user.click(screen.getByRole('button', { name: /^insights$/i }));
    const insightsTools = screen.getByRole('group', { name: /insights tools/i });
    await user.click(within(insightsTools).getByRole('button', { name: /^garden$/i }));

    expect(screen.getByRole('region', { name: /^garden$/i })).toBeInTheDocument();
    expect(await screen.findByLabelText(/garden nutrition tool/i)).toBeInTheDocument();
  });

  it('routes restaurant foods into the shared review drawer before saving macros', async () => {
    const user = userEvent.setup();

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    const captureRail = await screen.findByRole('navigation', { name: /nutrition capture modes/i });
    await user.click(within(captureRail).getByRole('button', { name: /restaurant/i }));
    await user.click(await screen.findByRole('button', { name: /send restaurant food to review/i }));

    expect(await screen.findByRole('dialog', { name: /review turkey sandwich/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve and save 1 item/i }));

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledWith('/api/macros/drafts', expect.objectContaining({
      contractVersion: '1.0',
      source: 'restaurant',
      foods: [expect.objectContaining({
        description: 'Panera Turkey Sandwich',
        verified: false,
      })],
    })));
    expect(mocks.apiPost).toHaveBeenCalledTimes(1);
    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });
});
