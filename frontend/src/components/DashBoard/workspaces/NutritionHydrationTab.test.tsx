import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionHydrationTab from './NutritionHydrationTab';

const mocks = vi.hoisted(() => ({
  hydration: { filled: 3, dailyGoal: 8, glassOz: 12, loading: false },
  updateFilled: vi.fn(),
}));

vi.mock('../../../hooks/useHydration', () => ({
  useHydration: () => ({
    filled: mocks.hydration.filled,
    dailyGoal: mocks.hydration.dailyGoal,
    glassOz: mocks.hydration.glassOz,
    loading: mocks.hydration.loading,
    updateFilled: mocks.updateFilled,
    resetToday: vi.fn(),
  }),
}));

describe('NutritionHydrationTab', () => {
  beforeEach(() => {
    mocks.hydration.filled = 3;
    mocks.hydration.dailyGoal = 8;
    mocks.hydration.glassOz = 12;
    mocks.hydration.loading = false;
    mocks.updateFilled.mockClear();
  });

  it('uses the persisted hydration glass size when rendering ounces', () => {
    render(<NutritionHydrationTab />);

    expect(screen.getByText('3 of 8 glasses (36 oz)')).toBeInTheDocument();
  });

  it('does not allow hydration changes while persisted hydration is loading', async () => {
    const user = userEvent.setup();
    mocks.hydration.loading = true;

    render(<NutritionHydrationTab />);

    const nextGlass = screen.getByRole('button', { name: /Glass 4/i });
    const resetButton = screen.getByRole('button', { name: /Reset Today/i });

    expect(nextGlass).toBeDisabled();
    expect(resetButton).toBeDisabled();

    await user.click(nextGlass);
    await user.click(resetButton);

    expect(mocks.updateFilled).not.toHaveBeenCalled();
  });
});
