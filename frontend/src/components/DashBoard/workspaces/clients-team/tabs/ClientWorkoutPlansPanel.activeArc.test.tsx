import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientWorkoutPlansPanel from './ClientWorkoutPlansPanel';

const { mockAuthAxios } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const waitForActiveArcValue = async (value = 'plan-6m') => {
  const activeArcSelector = await screen.findByRole('combobox', { name: /active training arc/i });
  await waitFor(() => expect(activeArcSelector).toHaveValue(value));
  return activeArcSelector;
};

describe('ClientWorkoutPlansPanel active arc selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxios.put.mockResolvedValue({ data: { success: true } });
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        plans: [
          {
            id: 'plan-6m',
            title: 'Primary Six Month Arc',
            status: 'active',
            durationWeeks: 26,
            updatedAt: '2026-06-03T12:00:00.000Z',
            metadata: { planHorizon: 'six_month', isPrimaryPlan: true },
          },
          {
            id: 'plan-9m',
            title: 'Move Fitness Nine Month Arc',
            status: 'draft',
            durationWeeks: 39,
            updatedAt: '2026-06-04T12:00:00.000Z',
            metadata: { planHorizon: 'nine_month' },
          },
        ],
      },
    });
  });

  it('shows a loading active-arc state before saved plans hydrate', async () => {
    let resolvePlans!: (value: unknown) => void;
    mockAuthAxios.get.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePlans = resolve;
    }));

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    const activeArcSelector = await screen.findByRole('combobox', { name: /active training arc/i });
    expect(activeArcSelector).toHaveValue('');
    expect(activeArcSelector).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/loading saved arcs/i)).toBeInTheDocument();

    resolvePlans({ data: { success: true, plans: [] } });
    await waitFor(() => expect(activeArcSelector).toHaveAttribute('aria-busy', 'false'));
    expect(screen.getByText(/0 saved arcs available/i)).toBeInTheDocument();
  });

  it('lets trainer and admin users activate a filled plan horizon from one active-arc control', async () => {
    const user = userEvent.setup();

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    const activeArcSelector = await waitForActiveArcValue();
    await user.selectOptions(activeArcSelector, 'plan-9m');

    await waitFor(() => {
      expect(mockAuthAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-9m/activate');
    });
    expect(mockAuthAxios.get).toHaveBeenCalledTimes(2);
  });

  it('activates a draft arc from the active-arc selector before it can drive client homework', async () => {
    const user = userEvent.setup();

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    const activeArcSelector = await waitForActiveArcValue();
    await user.selectOptions(activeArcSelector, 'plan-9m');

    await waitFor(() => {
      expect(mockAuthAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-9m/activate');
    });
    expect(mockAuthAxios.put).not.toHaveBeenCalledWith('/api/workout-plans/plan-9m/primary');
  });

  it('lets trainer and admin users activate a non-active saved horizon before it drives client homework', async () => {
    const user = userEvent.setup();

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    await user.click(await screen.findByRole('button', { name: /activate 9 month arc/i }));

    await waitFor(() => {
      expect(mockAuthAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-9m/activate');
    });
    expect(mockAuthAxios.get).toHaveBeenCalledTimes(2);
  });

  it('treats legacy uppercase active status as current before changing the primary arc', async () => {
    const user = userEvent.setup();
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        plans: [
          {
            id: 'plan-6m',
            title: 'Primary Six Month Arc',
            status: 'active',
            durationWeeks: 26,
            updatedAt: '2026-06-03T12:00:00.000Z',
            metadata: { planHorizon: 'six_month', isPrimaryPlan: true },
          },
          {
            id: 'plan-9m',
            title: 'Already Active Nine Month Arc',
            status: 'ACTIVE',
            durationWeeks: 39,
            updatedAt: '2026-06-04T12:00:00.000Z',
            metadata: { planHorizon: 'nine_month' },
          },
        ],
      },
    });

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    expect(await screen.findByText(/2 current plans for fixture client/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /activate 9 month arc/i })).toBeNull();

    const activeArcSelector = await waitForActiveArcValue();
    await user.selectOptions(activeArcSelector, 'plan-9m');

    await waitFor(() => {
      expect(mockAuthAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-9m/primary');
    });
    expect(mockAuthAxios.put).not.toHaveBeenCalledWith('/api/workout-plans/plan-9m/activate');
  });
});
