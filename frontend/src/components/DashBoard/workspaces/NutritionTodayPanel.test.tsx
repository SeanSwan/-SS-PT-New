
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionTodayPanel from './NutritionTodayPanel';
import { daysAgoIso, todayIso } from './NutritionTodayPanel.logic';

const mocks = vi.hoisted(() => ({
  hydration: { filled: 3, dailyGoal: 8, glassOz: 8, loading: false },
  updateFilled: vi.fn(),
  apiGet: vi.fn(),
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

vi.mock('../../../services/api.service', () => ({
  default: {
    get: mocks.apiGet,
  },
}));

const summary = {
  date: todayIso(),
  totalCalories: 820,
  totalProtein: 52,
  totalCarbs: 74,
  totalFat: 22,
  totalFiber: 9,
  totalSugar: 30,
  totalSodium: 900,
  mealCount: 2,
  meals: {},
};

describe('NutritionTodayPanel', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mocks.hydration.filled = 3;
    mocks.hydration.dailyGoal = 8;
    mocks.hydration.glassOz = 8;
    mocks.hydration.loading = false;
    mocks.updateFilled.mockClear();
    mocks.apiGet.mockReset();
    mocks.apiGet.mockImplementation((url: string) => {
      if (url.startsWith('/api/macros?date=')) {
        return Promise.resolve({
          data: {
            entries: [{
              mealType: ' Lunch ',
              description: 'Chicken bowl',
              calories: 640,
              protein: 45,
              carbs: 70,
              fat: 18,
              source: 'photo',
              verified: true,
            }],
          },
        });
      }
      return Promise.resolve({
        data: {
          days: [
            { date: daysAgoIso(1), mealCount: 1 },
            { date: todayIso(), mealCount: 2 },
          ],
        },
      });
    });
  });

  it('renders real macro totals, hydration state, and a nutrition streak', async () => {
    render(<NutritionTodayPanel summary={summary} onNavigate={vi.fn()} />);

    expect(screen.getByLabelText(/820 calories logged today/i)).toBeInTheDocument();
    expect(screen.getByText('52g')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /hydration progress/i })).toHaveAttribute('aria-valuenow', '38');
    expect(screen.getByText('3 of 8 glasses (24 oz)')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/2-day nutrition logging streak/i)).toBeInTheDocument());
  });

  it('does not expose stale calorie ring totals while Today totals are loading', async () => {
    render(<NutritionTodayPanel summary={summary} loading onNavigate={vi.fn()} />);

    const ring = screen.getByRole('img', { name: /nutrition totals loading/i });
    expect(screen.queryByRole('img', { name: /820 calories logged today/i })).not.toBeInTheDocument();
    expect(ring.querySelectorAll('circle')[1]).toHaveAttribute('stroke-dasharray', '88 283');
    expect(ring).toHaveTextContent(/--\s*loading/i);
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalled());
  });

  it('does not expose stale nutrition guidance while Today totals are loading', async () => {
    render(<NutritionTodayPanel summary={summary} loading onNavigate={vi.fn()} />);

    expect(screen.getByText(/Loading today's nutrition totals/i)).toBeInTheDocument();
    expect(screen.getByText(/Hold nutrition decisions until today's log finishes loading/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next action/i })).toBeDisabled();
    expect(screen.getByRole('region', { name: /nutrition insights/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/protein logged so far/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fiber logged so far/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+g of \d+g/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2 meals logged today/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalled());
  });

  it('uses the persisted hydration glass size when rendering ounces', async () => {
    mocks.hydration.glassOz = 10;

    render(<NutritionTodayPanel summary={summary} onNavigate={vi.fn()} />);

    expect(screen.getByText('3 of 8 glasses (30 oz)')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/2-day nutrition logging streak/i)).toBeInTheDocument());
  });

  it('preserves over-goal hydration counts while capping meter progress', async () => {
    const user = userEvent.setup();
    mocks.hydration.filled = 9;
    mocks.hydration.dailyGoal = 8;

    render(<NutritionTodayPanel summary={{ ...summary, mealCount: 1 }} onNavigate={vi.fn()} />);

    expect(screen.getByRole('progressbar', { name: /hydration progress/i })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('9 of 8 glasses (72 oz)')).toBeInTheDocument();
    expect(screen.queryByText(/Add a water check-in before the next meal/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add water/i }));
    expect(mocks.updateFilled).toHaveBeenCalledWith(10);
  });

  it('shows a safe care milestone without restriction or calorie-target rewards', async () => {
    render(<NutritionTodayPanel summary={summary} onNavigate={vi.fn()} />);

    expect(await screen.findByRole('note', { name: /nutrition care milestone/i })).toHaveTextContent(/consistency milestone/i);
    expect(screen.getByText(/2-day logging rhythm/i)).toBeInTheDocument();
    expect(screen.getByText(/consistency counts as progress/i)).toBeInTheDocument();
    expect(screen.queryByText(/restriction|diet penalty|calorie target|burn/i)).not.toBeInTheDocument();
  });

  it('renders deterministic nutrition insights from the same daily and weekly truth', async () => {
    render(<NutritionTodayPanel summary={summary} onNavigate={vi.fn()} />);

    expect(await screen.findByRole('region', { name: /nutrition insights/i })).toBeInTheDocument();
    expect(screen.getByText(/protein support/i)).toBeInTheDocument();
    expect(screen.getByText(/52g protein logged so far/i)).toBeInTheDocument();
    expect(screen.getByText(/fiber coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/9g fiber logged so far/i)).toBeInTheDocument();
    expect(screen.queryByText(/\d+g of \d+g/i)).not.toBeInTheDocument();
    expect(screen.getByText(/2 of the last 7 days/i)).toBeInTheDocument();
  });

  it('keeps Gentle Mode copy free of numeric macro, hydration, and streak pressure', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onAskCoach = vi.fn();

    render(
      <NutritionTodayPanel
        summary={summary}
        onNavigate={onNavigate}
        gentleMode
        onAskCoach={onAskCoach}
      />,
    );

    expect(screen.getByLabelText(/Gentle Mode active with nutrition numbers hidden today/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep nutrition gentle today/i)).toBeInTheDocument();
    expect(screen.queryByText('820')).not.toBeInTheDocument();
    expect(screen.queryByText('52g')).not.toBeInTheDocument();
    expect(screen.queryByText(/3 of 8 glasses/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/24 oz/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/2 meals logged today/i)).not.toBeInTheDocument();
    expect(screen.getByRole('note', { name: /nutrition care milestone/i })).toHaveTextContent(/gentle milestone/i);
    expect(screen.getByText(/no numbers required/i)).toBeInTheDocument();
    expect(await screen.findByText(/recent nutrition check-ins/i)).toBeInTheDocument();
    expect(screen.getByText(/check-in rhythm is active/i)).toBeInTheDocument();
    expect(screen.queryByText(/2-day nutrition logging streak/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review macros/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /gentle next step/i }));
    expect(onNavigate).toHaveBeenCalledWith('hydration');

    await user.click(screen.getByRole('button', { name: /ask coach for gentle support/i }));
    expect(onAskCoach).toHaveBeenCalledTimes(1);
  });

  it('uses one-tap controls for hydration and existing nutrition tabs', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<NutritionTodayPanel summary={summary} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('button', { name: /add water/i }));
    expect(mocks.updateFilled).toHaveBeenCalledWith(4);

    await user.click(screen.getByRole('button', { name: /log another meal/i }));
    await user.click(screen.getByRole('button', { name: /speak a meal/i }));
    await user.click(screen.getByRole('button', { name: /search food/i }));

    expect(onNavigate).toHaveBeenCalledWith('log');
    expect(onNavigate).toHaveBeenCalledWith('voice');
    expect(onNavigate).toHaveBeenCalledWith('search');
  });

  it('does not allow hydration increments while the persisted hydration state is still loading', async () => {
    const user = userEvent.setup();
    mocks.hydration.loading = true;

    render(<NutritionTodayPanel summary={summary} onNavigate={vi.fn()} />);

    const addWaterButton = screen.getByRole('button', { name: /add water/i });
    expect(addWaterButton).toBeDisabled();

    await user.click(addWaterButton);
    expect(mocks.updateFilled).not.toHaveBeenCalled();
  });

  it('does not recommend hydration-gap actions before persisted hydration loads', async () => {
    mocks.hydration.filled = 0;
    mocks.hydration.loading = true;
    mocks.apiGet.mockImplementation((url: string) => {
      if (url.startsWith('/api/macros?date=')) {
        return Promise.resolve({ data: { entries: [] } });
      }
      return Promise.resolve({ data: { days: [] } });
    });

    render(<NutritionTodayPanel summary={summary} onNavigate={vi.fn()} />);

    expect(screen.getByText(/Loading hydration/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /hydration progress/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('progressbar', { name: /hydration progress/i })).not.toHaveAttribute('aria-valuenow');
    expect(screen.getByTestId('hydration-meter-fill')).toHaveAttribute('data-state', 'loading');
    expect(screen.queryByText(/Add a water check-in before the next meal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hydration adjustment open/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 of 8 glasses logged/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalled());
  });

});
