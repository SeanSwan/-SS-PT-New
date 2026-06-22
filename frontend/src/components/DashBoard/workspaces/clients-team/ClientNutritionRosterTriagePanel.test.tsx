import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiGetMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api.service', () => ({
  default: {
    get: apiGetMock,
  },
}));

import ClientNutritionRosterTriagePanel from './ClientNutritionRosterTriagePanel';
import type { ClientOption } from './ClientSelectorDropdown';
import { formatLocalCalendarDate } from './nutritionDate';

const clients: ClientOption[] = [
  { id: 101, firstName: 'Alpha', lastName: 'Client', email: 'alpha@example.test' },
  { id: 202, firstName: 'Beta', lastName: 'Client', email: 'beta@example.test' },
];

describe('ClientNutritionRosterTriagePanel', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('fetches one batch roster triage payload and renders attention rows', async () => {
    const today = formatLocalCalendarDate();
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        clients: [
          {
            userId: 101,
            mealCountToday: 2,
            weeklyLoggedDays: 4,
            totalProtein: 55,
            flags: {
              noMealsToday: false,
              sodiumAttention: true,
              sugarAttention: false,
              sparseWeekly: false,
            },
          },
          {
            userId: 202,
            mealCountToday: 0,
            weeklyLoggedDays: 0,
            totalProtein: 0,
            flags: {
              noMealsToday: true,
              sodiumAttention: false,
              sugarAttention: false,
              sparseWeekly: true,
            },
          },
        ],
      },
    });

    render(<ClientNutritionRosterTriagePanel clients={clients} />);

    expect(screen.getByText('Nutrition Roster Triage')).toBeInTheDocument();
    expect(await screen.findByText('Beta Client')).toBeInTheDocument();
    expect(screen.getAllByText('No meals today')).toHaveLength(2);
    expect(screen.getByText('Sodium attention')).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith(`/api/macros/roster-triage?date=${today}&userIds=101%2C202`);
    expect(apiGetMock).toHaveBeenCalledTimes(1);
  });

  it('does not label roster nutrition as missing while the batch request is still loading', () => {
    apiGetMock.mockReturnValue(new Promise(() => undefined));

    render(<ClientNutritionRosterTriagePanel clients={clients} />);

    expect(screen.getByText('Loading roster nutrition...')).toBeInTheDocument();
    expect(screen.queryByText('No nutrition data')).not.toBeInTheDocument();
  });

  it('uses safe fixed copy for roster load failures', async () => {
    apiGetMock.mockRejectedValue(new Error('SQLSTATE raw tenant trace'));

    render(<ClientNutritionRosterTriagePanel clients={clients} />);

    expect(await screen.findByText('Nutrition roster triage unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE|tenant trace/i)).not.toBeInTheDocument();
  });

  it('does not render false-success responses as empty nutrition data', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        success: false,
        error: 'provider table trace',
      },
    });

    render(<ClientNutritionRosterTriagePanel clients={clients} />);

    expect(await screen.findByText('Nutrition roster triage unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/provider table trace/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No nutrition data')).not.toBeInTheDocument();
  });
});
