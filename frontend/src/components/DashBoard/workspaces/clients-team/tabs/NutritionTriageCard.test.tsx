import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../../services/api.service', () => ({
  default: {
    get: apiGetMock,
  },
}));

import NutritionTriageCard from './NutritionTriageCard';
import { formatLocalCalendarDate, getLocalCalendarDateDaysAgo } from '../nutritionDate';

describe('NutritionTriageCard', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads selected-client macro summary through apiService and renders triage flags', async () => {
    const today = formatLocalCalendarDate();
    const weekStart = getLocalCalendarDateDaysAgo(6);

    apiGetMock.mockImplementation((path: string) => {
      if (path.startsWith('/api/macros/summary')) {
        return Promise.resolve({
          data: {
            success: true,
            summary: {
              date: today,
              totalCalories: 1840,
              totalProtein: 104,
              totalCarbs: 176,
              totalFat: 62,
              totalFiber: 16,
              totalSugar: 58,
              totalSodium: 2480,
              mealCount: 3,
              meals: {},
            },
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          days: [
            { date: weekStart, calories: 1600, protein: 90, carbs: 140, fat: 50, mealCount: 3 },
            { date: '2026-06-16', calories: 1900, protein: 110, carbs: 170, fat: 65, mealCount: 4 },
            { date: '2026-06-18', calories: 1800, protein: 100, carbs: 165, fat: 60, mealCount: 3 },
            { date: today, calories: 1840, protein: 104, carbs: 176, fat: 62, mealCount: 3 },
          ],
        },
      });
    });

    render(<NutritionTriageCard clientId={424242} />);

    expect(await screen.findByText('Nutrition Triage')).toBeInTheDocument();
    expect(await screen.findByText('3 meals today')).toBeInTheDocument();
    expect(screen.getByText('104g protein')).toBeInTheDocument();
    expect(screen.getByText('4 of 7 days logged')).toBeInTheDocument();
    expect(screen.getByText('Sodium attention')).toBeInTheDocument();
    expect(screen.getByText('Sugar attention')).toBeInTheDocument();

    expect(apiGetMock).toHaveBeenCalledWith(`/api/macros/summary?date=${today}&userId=424242`);
    expect(apiGetMock).toHaveBeenCalledWith(`/api/macros/weekly?start=${weekStart}&end=${today}&userId=424242`);
  });

  it('does not leak raw transport errors into admin copy', async () => {
    apiGetMock.mockRejectedValue(new Error('SQLSTATE tenant stack trace leaked'));

    render(<NutritionTriageCard clientId={424242} />);

    expect(await screen.findByText('Nutrition triage unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tenant stack/i)).not.toBeInTheDocument();
  });

  it('does not render false-success macro responses as zero nutrition', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        success: false,
        error: 'provider table trace',
      },
    });

    render(<NutritionTriageCard clientId={424242} />);

    expect(await screen.findByText('Nutrition triage unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/provider table trace/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No meals logged today')).not.toBeInTheDocument();
  });

  it('does not call macro APIs for malformed selected-client ids', async () => {
    render(<NutritionTriageCard clientId="fixture-424242" />);

    expect(await screen.findByText('Nutrition identity unavailable')).toBeInTheDocument();
    await waitFor(() => expect(apiGetMock).not.toHaveBeenCalled());
  });
});
