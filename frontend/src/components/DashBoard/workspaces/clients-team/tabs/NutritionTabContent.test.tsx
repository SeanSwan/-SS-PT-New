import React from 'react';
import { cleanup, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}));
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

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, role: 'admin' } }),
}));

const render = (ui: React.ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

import NutritionTabContent from './NutritionTabContent';
import { formatLocalCalendarDate, getLocalCalendarDateDaysAgo } from '../nutritionDate';

const today = formatLocalCalendarDate();

const timelineEntry = (overrides: Record<string, unknown> = {}) => ({
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
  reviewStatus: 'needs_review',
  createdAt: `${today}T19:00:00.000Z`,
  ...overrides,
});

const timelinePayload = (overrides: Record<string, unknown> = {}) => ({
  data: {
    success: true,
    entries: [timelineEntry()],
    target: {
      dailyCalories: 2100, proteinGrams: 150, carbsGrams: 220, fatGrams: 70,
      fiberGrams: 25, sodiumLimitMg: 2300, hydrationTargetLiters: 2.5,
    },
    adherence: {
      loggedDays: 5, consistencyScore: 71, proteinTargetHitRate: 60,
      avgCaloriesPctOfTarget: 92, inferredEntryCount: 2, needsReviewCount: 1,
      currentLogStreak: 4,
    },
    ...overrides,
  },
});

describe('NutritionTabContent (Phase 4A coach tab)', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiPatchMock.mockReset();
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the 30-second IA: header, adherence hero, targets, stepper, diary', async () => {
    apiGetMock.mockResolvedValue(timelinePayload());

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    expect(await screen.findByText('Alpha Client')).toBeInTheDocument();
    expect(screen.getByText(/last log: today/i)).toBeInTheDocument();

    const hero = screen.getByLabelText('Nutrition adherence');
    expect(hero).toHaveTextContent('71%');
    expect(hero).toHaveTextContent('4-day streak');
    expect(hero).toHaveTextContent('Verify 1');
    expect(hero).toHaveTextContent('2 estimated');

    const grid = screen.getByLabelText('Actual versus target nutrition');
    expect(grid).toHaveTextContent('Today actual vs target');
    expect(grid).toHaveTextContent('620 cal / 2,100 cal');

    expect(screen.getByRole('button', { name: 'Previous day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled();

    expect(screen.getByText('chicken bowl')).toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(apiGetMock).toHaveBeenCalledWith(`/api/macros/client-timeline?date=${today}&userId=101`);
  });

  it('steps back a day and refetches that date, re-enabling forward stepping', async () => {
    apiGetMock.mockResolvedValue(timelinePayload({ entries: [] }));
    const user = userEvent.setup();

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);
    await screen.findByRole('button', { name: 'Previous day' });

    await user.click(screen.getByRole('button', { name: 'Previous day' }));

    const yesterday = getLocalCalendarDateDaysAgo(1);
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith(
      `/api/macros/client-timeline?date=${yesterday}&userId=101`,
    ));
    expect(await screen.findByRole('button', { name: 'Next day' })).toBeEnabled();
  });

  it('switches to start/end range fetching when the 7-day toggle is pressed', async () => {
    apiGetMock.mockResolvedValue(timelinePayload());
    const user = userEvent.setup();

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);
    await screen.findByRole('button', { name: 'Toggle 7-day range view' });

    await user.click(screen.getByRole('button', { name: 'Toggle 7-day range view' }));

    const start = getLocalCalendarDateDaysAgo(6);
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith(
      `/api/macros/client-timeline?start=${start}&end=${today}&userId=101`,
    ));
    expect(await screen.findByRole('button', { name: /7-day calorie trend/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Actual versus target nutrition')).toHaveTextContent('Daily average vs target');
  });

  it('renders the no-targets empty state with the set-targets affordance', async () => {
    apiGetMock.mockResolvedValue(timelinePayload({ target: null }));
    const user = userEvent.setup();

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    expect(await screen.findByText(/no targets yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Set targets for this client' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/admin/nutrition/101');
  });

  it('shows a skeleton loading state before the timeline request resolves', () => {
    apiGetMock.mockReturnValue(new Promise(() => undefined));

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    expect(screen.getByRole('status', { name: 'Loading nutrition timeline' })).toBeInTheDocument();
    expect(screen.queryByText('No meals logged for this date')).not.toBeInTheDocument();
  });

  it('marks an unverified estimate as verified through the timeline review action', async () => {
    const entry = timelineEntry();
    apiGetMock.mockResolvedValue(timelinePayload({ entries: [entry] }));
    apiPatchMock.mockResolvedValue({
      data: { success: true, entry: { ...entry, verified: true, reviewStatus: 'verified' } },
    });

    const user = userEvent.setup();
    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    await user.click(await screen.findByRole('button', { name: /mark lunch verified/i }));

    expect(apiPatchMock).toHaveBeenCalledWith('/api/macros/client-timeline/77/verify');
    expect(await screen.findByText('Verified')).toBeInTheDocument();
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
  });

  it('uses safe fixed copy when timeline verification fails', async () => {
    apiGetMock.mockResolvedValue(timelinePayload());
    apiPatchMock.mockRejectedValue(new Error('SQLSTATE raw tenant trace'));

    const user = userEvent.setup();
    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    await user.click(await screen.findByRole('button', { name: /mark lunch verified/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nutrition verification unavailable');
    expect(screen.queryByText(/SQLSTATE|tenant trace/i)).not.toBeInTheDocument();
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  it('uses a branded retry card for timeline load failures and retries on demand', async () => {
    apiGetMock
      .mockRejectedValueOnce(new Error('SQLSTATE raw tenant trace'))
      .mockResolvedValueOnce(timelinePayload());
    const user = userEvent.setup();

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/nutrition timeline unavailable/i);
    expect(screen.queryByText(/SQLSTATE|tenant trace/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('chicken bowl')).toBeInTheDocument();
  });

  it('does not render false-success responses as an empty timeline', async () => {
    apiGetMock.mockResolvedValue({ data: { success: false, error: 'provider table trace' } });

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/nutrition timeline unavailable/i);
    expect(screen.queryByText(/provider table trace/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No meals logged for this date')).not.toBeInTheDocument();
  });

  it('staff header action routes to the Nutrition Plan Builder in client context', async () => {
    apiGetMock.mockResolvedValue(timelinePayload({ entries: [] }));
    const user = userEvent.setup();

    render(<NutritionTabContent clientId={101} clientName="Alpha Client" />);
    const button = await screen.findByRole('button', { name: 'Set nutrition targets for Alpha Client' });
    await user.click(button);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/admin/nutrition/101');
  });

  it('reports an identity failure instead of fetching with a bad client id', () => {
    render(<NutritionTabContent clientId="not-a-number" clientName="Alpha Client" />);

    expect(screen.getByText('Nutrition identity unavailable')).toBeInTheDocument();
    expect(apiGetMock).not.toHaveBeenCalled();
  });
});
