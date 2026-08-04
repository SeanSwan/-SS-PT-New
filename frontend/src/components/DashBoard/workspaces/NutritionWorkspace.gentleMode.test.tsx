import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

import NutritionWorkspace from './NutritionWorkspace';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  updateFilled: vi.fn(),
}));

vi.mock('../../../hooks/useMacroSummary', () => ({
  useMacroSummary: () => ({
    summary: {
      date: '2026-06-20',
      totalCalories: 820,
      totalProtein: 52,
      totalCarbs: 74,
      totalFat: 22,
      totalFiber: 9,
      totalSugar: 30,
      totalSodium: 900,
      mealCount: 2,
      meals: { breakfast: { count: 1 }, lunch: { count: 1 } },
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: true, isElite: false, isTrial: false }),
}));

vi.mock('../../../hooks/useHydration', () => ({
  useHydration: () => ({
    filled: 3,
    dailyGoal: 8,
    glassOz: 10,
    loading: false,
    updateFilled: mocks.updateFilled,
    resetToday: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useDashboardQueries', () => ({
  useWorkoutSessions: () => ({ data: [] }),
}));

vi.mock('../../../services/api.service', () => ({
  default: {
    get: mocks.apiGet,
  },
}));

vi.mock('../../Shared/CosmicSuspenseLoader', () => ({
  default: () => <div>Loading nutrition panel</div>,
}));

vi.mock('../../../utils/error-boundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../Charts/charts/pie/MacroDonut', () => ({
  default: () => <section aria-label="macro donut">Macro donut</section>,
}));

vi.mock('../../Charts/charts/radar/NutritionBalanceRadar', () => ({
  default: () => <section aria-label="nutrition radar">Nutrition radar</section>,
}));

describe('NutritionWorkspace Gentle Mode', () => {
  beforeAll(async () => {
    await import('./NutritionTodayPanel');
  });

  beforeEach(() => {
    localStorage.clear();
    mocks.apiGet.mockReset();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url.startsWith('/api/macros?date=')) {
        return Promise.resolve({ data: { entries: [] } });
      }
      return Promise.resolve({
        data: { days: [{ date: '2026-06-20', mealCount: 2 }] },
      });
    });
  });

  it('hides calorie and macro-number surfaces and persists the recovery setting', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    expect(await screen.findByLabelText(/nutrition today diary/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('820')).toBeInTheDocument();
    expect(screen.getByText('52g')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /turn gentle mode on/i }));

    expect(screen.getByRole('button', { name: /turn gentle mode off/i })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('ss-nutrition-gentle-mode')).toBe('true');
    expect(screen.getByRole('region', { name: /gentle recovery mode/i })).toBeInTheDocument();
    expect(screen.queryByText('820')).not.toBeInTheDocument();
    expect(screen.queryByText('52g')).not.toBeInTheDocument();
    expect(screen.queryByText('74g')).not.toBeInTheDocument();
    expect(screen.queryByText(/3 of 8 glasses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/24 oz/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2-day nutrition logging streak/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review macros/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask coach for gentle support/i })).toBeInTheDocument();

    // 4B: the <select> is gone — the Insights segment lands on My Macros.
    await user.click(screen.getByRole('button', { name: /^insights$/i }));

    expect(screen.getByRole('region', { name: /gentle mode macro charts hidden/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('macro donut')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('nutrition radar')).not.toBeInTheDocument();
  });

  it('restores Gentle Mode from local storage on first render', async () => {
    localStorage.setItem('ss-nutrition-gentle-mode', 'true');

    render(<MemoryRouter><NutritionWorkspace /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: /turn gentle mode off/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('820')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /gentle recovery mode/i })).toBeInTheDocument();
  });

  it('keeps extracted nutrition workspace styles tokenized without raw alpha fallbacks', () => {
    const stylesSource = readFileSync(resolve(__dirname, 'NutritionWorkspace.styles.ts'), 'utf8');

    expect(stylesSource).not.toContain('rgba(');
    expect(stylesSource).not.toMatch(/#[0-9A-Fa-f]{8}\b/);
  });
});
