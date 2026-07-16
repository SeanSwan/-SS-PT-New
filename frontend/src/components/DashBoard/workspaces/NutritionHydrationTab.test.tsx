
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionHydrationTab from './NutritionHydrationTab';

const mocks = vi.hoisted(() => ({
  hydration: { filled: 3, dailyGoal: 8, glassOz: 12, loading: false },
  updateFilled: vi.fn(),
}));

vi.mock('./NutritionHydrationTab.weekStrip', () => ({
  default: () => null,
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

  it('caps over-goal ring progress without hiding the logged glass count', () => {
    mocks.hydration.filled = 9;
    mocks.hydration.dailyGoal = 8;

    const { container } = render(<NutritionHydrationTab />);
    const progressCircle = container.querySelector('circle[stroke-dasharray]');

    expect(screen.getByText('9 of 8 glasses (108 oz)')).toBeInTheDocument();
    expect(screen.getByText('100%+')).toBeInTheDocument();
    expect(progressCircle).toHaveAttribute('stroke-dasharray', '264 0');
  });

  it('keeps hydration tips supportive instead of fear or peak-performance framed', () => {
    render(<NutritionHydrationTab />);

    expect(screen.queryByText(/peak performance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dehydration of just 2%/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Sip before training and adjust based on heat, session length, and comfort/i)).toBeInTheDocument();
    expect(screen.getByText(/Watch for thirst, darker urine, headaches, or low energy as cues to add fluids/i)).toBeInTheDocument();
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
