import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../../services/api.service', () => ({
  default: {
    get: apiGetMock,
  },
}));

import OverviewTabContent from './OverviewTabContent';
import { formatLocalCalendarDate, getLocalCalendarDateDaysAgo } from '../nutritionDate';

describe('OverviewTabContent nutrition triage mount', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('mounts selected-client nutrition triage and loads macro summary data', async () => {
    const today = formatLocalCalendarDate();
    const weekStart = getLocalCalendarDateDaysAgo(6);

    apiGetMock.mockImplementation((path: string) => {
      if (path.startsWith('/api/admin/clients/424242')) {
        return Promise.resolve({
          data: {
            client: {
              totalWorkouts: 9,
              points: 3200,
              level: 4,
              tier: 'Silver',
              streakDays: 6,
              availableSessions: 3,
              clientSource: 'swanstudios',
              totalRevenue: 1200,
              lastWorkoutDate: today,
              nextSessionDate: today,
              achievementCount: 5,
              currentPhase: 2,
            },
          },
        });
      }

      if (path.startsWith('/api/macros/summary')) {
        return Promise.resolve({
          data: {
            success: true,
            summary: {
              date: today,
              totalCalories: 1780,
              totalProtein: 96,
              totalCarbs: 165,
              totalFat: 60,
              totalFiber: 22,
              totalSugar: 40,
              totalSodium: 1900,
              mealCount: 2,
              meals: {},
            },
          },
        });
      }

      if (path.startsWith('/api/macros/weekly')) {
        return Promise.resolve({
          data: {
            success: true,
            days: [
              { date: weekStart, calories: 1600, protein: 80, carbs: 140, fat: 55, mealCount: 2 },
              { date: today, calories: 1780, protein: 96, carbs: 165, fat: 60, mealCount: 2 },
            ],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });

    render(<OverviewTabContent clientId={424242} clientName="Alpha Client" />);

    expect(await screen.findByText('Nutrition Triage')).toBeInTheDocument();
    expect(await screen.findByText('2 meals today')).toBeInTheDocument();
    expect(screen.getByText('96g protein')).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith(`/api/macros/summary?date=${today}&userId=424242`);
    expect(apiGetMock).toHaveBeenCalledWith(`/api/macros/weekly?start=${weekStart}&end=${today}&userId=424242`);
  });
});
