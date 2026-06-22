import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, apiPatchMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
}));

vi.mock('../../../../services/api.service', () => ({
  default: {
    get: apiGetMock,
    patch: apiPatchMock,
  },
}));

import ClientNutritionEstimateReviewPanel from './ClientNutritionEstimateReviewPanel';
import type { ClientOption } from './ClientSelectorDropdown';
import { formatLocalCalendarDate } from './nutritionDate';

const clients: ClientOption[] = [
  { id: 101, firstName: 'Alpha', lastName: 'Client', email: 'alpha@example.test' },
  { id: 202, firstName: 'Beta', lastName: 'Client', email: 'beta@example.test' },
];

describe('ClientNutritionEstimateReviewPanel', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiPatchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads unverified estimates for the visible roster and verifies one row', async () => {
    const today = formatLocalCalendarDate();
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        entries: [
          {
            id: 77,
            userId: 101,
            date: today,
            mealType: 'lunch',
            description: 'chicken bowl',
            calories: 620,
            protein: 44,
            fiber: 9,
            source: 'photo',
            verified: false,
            createdAt: `${today}T19:00:00.000Z`,
          },
        ],
      },
    });
    apiPatchMock.mockResolvedValue({ data: { success: true, entry: { id: 77, verified: true } } });

    const user = userEvent.setup();
    render(<ClientNutritionEstimateReviewPanel clients={clients} />);

    expect(await screen.findByText('Nutrition Estimate Review')).toBeInTheDocument();
    expect(screen.getByText('Alpha Client')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('620 cal - 44g protein - 9g fiber')).toBeInTheDocument();
    expect(screen.getByText('Photo estimate')).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith(`/api/macros/review-queue?date=${today}&userIds=101%2C202&days=7`);

    await user.click(screen.getByRole('button', { name: /mark alpha client lunch verified/i }));

    expect(apiPatchMock).toHaveBeenCalledWith('/api/macros/client-timeline/77/verify');
    expect(await screen.findByText('No estimates awaiting review')).toBeInTheDocument();
  });

  it('does not underreport pending estimates when only five rows are displayed', async () => {
    const today = formatLocalCalendarDate();
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        entries: Array.from({ length: 6 }, (_, index) => ({
          id: 80 + index,
          userId: 101,
          date: today,
          mealType: 'snack',
          description: `meal ${index + 1}`,
          calories: 200 + index,
          protein: 12,
          fiber: 4,
          source: 'voice',
          verified: false,
          createdAt: `${today}T19:0${index}:00.000Z`,
        })),
      },
    });

    render(<ClientNutritionEstimateReviewPanel clients={clients} />);

    expect(await screen.findByText('Showing 5 of 6 pending')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /mark alpha client snack verified/i })).toHaveLength(5);
    expect(screen.queryByText('meal 6')).not.toBeInTheDocument();
  });

  it('uses safe fixed copy for load and verify failures', async () => {
    const today = formatLocalCalendarDate();
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        entries: [
          {
            id: 77,
            userId: 101,
            date: today,
            mealType: 'lunch',
            description: 'chicken bowl',
            calories: 620,
            protein: 44,
            fiber: 9,
            source: 'photo',
            verified: false,
          },
        ],
      },
    });
    apiPatchMock.mockRejectedValue(new Error('SQLSTATE raw tenant trace'));

    const user = userEvent.setup();
    render(<ClientNutritionEstimateReviewPanel clients={clients} />);

    await user.click(await screen.findByRole('button', { name: /mark alpha client lunch verified/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nutrition estimate review unavailable');
    expect(screen.queryByText(/SQLSTATE|tenant trace/i)).not.toBeInTheDocument();
    expect(screen.getByText('chicken bowl')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark alpha client lunch verified/i })).toBeEnabled();
  });

  it('is wired into the canonical Client Hub workspace near roster triage', () => {
    const source = readFileSync(resolve(__dirname, '../ClientsWorkspace.view.tsx'), 'utf8');

    expect(source).toContain("import ClientNutritionEstimateReviewPanel from './clients-team/ClientNutritionEstimateReviewPanel';");
    expect(source).toContain('<ClientNutritionEstimateReviewPanel clients={props.clients} hidden={Boolean(props.selectedClient) || props.loading} />');
  });
});
