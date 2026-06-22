import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiGetMock, apiPatchMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPatchMock: vi.fn(),
}));

vi.mock('../../../../../services/api.service', () => ({
  default: {
    get: apiGetMock,
    patch: apiPatchMock,
  },
}));

import NutritionTabContent from './NutritionTabContent';
import { formatLocalCalendarDate } from '../nutritionDate';

describe('NutritionTabContent', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiPatchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads selected-client timeline through apiService and renders estimate review flags', async () => {
    const today = formatLocalCalendarDate();
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        entries: [
          {
            id: 77,
            mealType: 'lunch',
            description: 'chicken bowl',
            calories: 620,
            protein: 44,
            carbs: 62,
            fat: 18,
            fiber: 9,
            sugar: 11,
            sodium: 790,
            source: 'food-scanner',
            verified: false,
            createdAt: `${today}T19:00:00.000Z`,
          },
        ],
      },
    });

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    expect(await screen.findByText('Nutrition Timeline')).toBeInTheDocument();
    expect(screen.getByText('Alpha Client')).toBeInTheDocument();
    const provenance = screen.getByRole('region', { name: /nutrition provenance/i });
    expect(provenance).toHaveTextContent('0 verified / 1 estimate');
    expect(provenance).toHaveTextContent('Photo estimate');
    expect(provenance).toHaveTextContent('Source and verification status only');
    expect(screen.queryByText(/confidence|photo ref|model version/i)).not.toBeInTheDocument();
    expect(screen.getByText('chicken bowl')).toBeInTheDocument();
    expect(screen.getByText('620 cal - 44g protein - 9g fiber / Photo estimate')).toBeInTheDocument();
    expect(screen.getAllByText('Photo estimate').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith(`/api/macros/client-timeline?date=${today}&userId=101`);
  });

  it('shows loading copy before the selected-client timeline request resolves', () => {
    apiGetMock.mockReturnValue(new Promise(() => undefined));

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    expect(screen.getByText('Loading nutrition timeline...')).toBeInTheDocument();
    expect(screen.queryByText('No meals logged for this date')).not.toBeInTheDocument();
  });

  it('marks an unverified estimate as verified through the timeline review action', async () => {
    const today = formatLocalCalendarDate();
    const entry = {
      id: 77,
      mealType: 'lunch',
      description: 'chicken bowl',
      calories: 620,
      protein: 44,
      carbs: 62,
      fat: 18,
      fiber: 9,
      sugar: 11,
      sodium: 790,
      source: 'food-scanner',
      verified: false,
      createdAt: `${today}T19:00:00.000Z`,
    };
    apiGetMock.mockResolvedValue({ data: { success: true, entries: [entry] } });
    apiPatchMock.mockResolvedValue({
      data: {
        success: true,
        entry: { ...entry, verified: true },
      },
    });

    const user = userEvent.setup();
    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    await user.click(await screen.findByRole('button', { name: /mark lunch verified/i }));

    expect(apiPatchMock).toHaveBeenCalledWith('/api/macros/client-timeline/77/verify');
    expect(await screen.findByText('Verified')).toBeInTheDocument();
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
  });

  it('uses safe fixed copy when timeline verification fails', async () => {
    const today = formatLocalCalendarDate();
    apiGetMock.mockResolvedValue({
      data: {
        success: true,
        entries: [
          {
            id: 77,
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
    apiPatchMock.mockRejectedValue(new Error('SQLSTATE raw tenant trace'));

    const user = userEvent.setup();
    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    await user.click(await screen.findByRole('button', { name: /mark lunch verified/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nutrition verification unavailable');
    expect(screen.queryByText(/SQLSTATE|tenant trace/i)).not.toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  it('uses safe fixed copy for timeline load failures', async () => {
    apiGetMock.mockRejectedValue(new Error('SQLSTATE raw tenant trace'));

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    expect(await screen.findByText('Nutrition timeline unavailable')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Nutrition timeline unavailable');
    expect(screen.queryByText(/SQLSTATE|tenant trace/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /nutrition provenance/i })).not.toBeInTheDocument();
  });

  it('does not render false-success responses as an empty timeline', async () => {
    apiGetMock.mockResolvedValue({
      data: {
        success: false,
        error: 'provider table trace',
      },
    });

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    expect(await screen.findByText('Nutrition timeline unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/provider table trace/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No meals logged for this date')).not.toBeInTheDocument();
  });
});
