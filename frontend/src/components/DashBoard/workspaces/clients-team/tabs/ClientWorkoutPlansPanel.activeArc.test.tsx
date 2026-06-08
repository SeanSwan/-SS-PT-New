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

  it('lets trainer and admin users promote a filled plan horizon from one active-arc control', async () => {
    const user = userEvent.setup();

    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    const activeArcSelector = await screen.findByRole('combobox', { name: /active training arc/i });

    expect(activeArcSelector).toHaveValue('plan-6m');

    await user.selectOptions(activeArcSelector, 'plan-9m');

    await waitFor(() => {
      expect(mockAuthAxios.put).toHaveBeenCalledWith('/api/workout-plans/plan-9m/primary');
    });
    expect(mockAuthAxios.get).toHaveBeenCalledTimes(2);
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
});
