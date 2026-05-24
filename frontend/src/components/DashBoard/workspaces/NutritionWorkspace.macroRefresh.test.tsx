import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionWorkspace from './NutritionWorkspace';

const mocks = vi.hoisted(() => ({
  refetchMacroSummary: vi.fn(),
}));

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

describe('NutritionWorkspace macro summary refresh', () => {
  beforeEach(() => {
    mocks.refetchMacroSummary.mockClear();
  });

  it('refreshes macro totals after a successful meal log', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(await screen.findByRole('button', { name: /simulate successful meal log/i }));

    expect(mocks.refetchMacroSummary).toHaveBeenCalledTimes(1);
  });

  it('does not refresh macro totals after a failed meal log', async () => {
    const user = userEvent.setup();

    render(<NutritionWorkspace />);

    await user.click(await screen.findByRole('button', { name: /simulate failed meal log/i }));

    expect(mocks.refetchMacroSummary).not.toHaveBeenCalled();
  });
});
