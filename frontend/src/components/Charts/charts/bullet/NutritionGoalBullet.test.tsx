import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NutritionGoalBullet from './NutritionGoalBullet';
import { useMacroSummary } from '../../../../hooks/useMacroSummary';

vi.mock('../../../../hooks/useMacroSummary', () => ({
  useMacroSummary: vi.fn(),
}));

const mockUseMacroSummary = vi.mocked(useMacroSummary);

const summary = {
  date: '2026-06-21',
  totalCalories: 820,
  totalProtein: 48,
  totalCarbs: 90,
  totalFat: 22,
  totalFiber: 14,
  totalSugar: 32,
  totalSodium: 1100,
  mealCount: 2,
  meals: {},
};

describe('NutritionGoalBullet', () => {
  it('renders authenticated macro summary values instead of fixture totals', () => {
    mockUseMacroSummary.mockReturnValue({
      summary,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<NutritionGoalBullet />);

    expect(screen.getByText('820 / 2,200')).toBeInTheDocument();
    expect(screen.getByText('48g / 150g')).toBeInTheDocument();
    expect(screen.getByText('14g / 30g')).toBeInTheDocument();
    expect(screen.queryByText('1950/2200')).not.toBeInTheDocument();
  });

  it('uses honest loading, empty, and error states without fake nutrition numbers', () => {
    mockUseMacroSummary.mockReturnValueOnce({
      summary: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    const { rerender } = render(<NutritionGoalBullet />);
    expect(screen.getByRole('region', { name: /nutrition goal bullet chart/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('1950/2200')).not.toBeInTheDocument();

    mockUseMacroSummary.mockReturnValueOnce({
      summary: { ...summary, totalCalories: 0, totalProtein: 0, totalFiber: 0, totalSodium: 0, mealCount: 0 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    rerender(<NutritionGoalBullet />);
    expect(screen.getByText('No nutrition logged today')).toBeInTheDocument();

    mockUseMacroSummary.mockReturnValueOnce({
      summary: null,
      loading: false,
      error: 'Macro summary unavailable. Try refreshing your dashboard.',
      refetch: vi.fn(),
    });
    rerender(<NutritionGoalBullet />);
    expect(screen.getByText('Nutrition totals unavailable. Try refreshing this dashboard.')).toBeInTheDocument();
  });
});
