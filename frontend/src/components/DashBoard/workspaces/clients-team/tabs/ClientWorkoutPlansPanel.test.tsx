import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ClientWorkoutPlansPanel from './ClientWorkoutPlansPanel';

const { mockAuthAxios } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
  },
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

describe('ClientWorkoutPlansPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        plans: [
          {
            id: 77,
            title: 'Phase 2 Strength Plan',
            status: 'active',
            goal: 'strength',
            nasmPhase: 2,
            durationWeeks: 8,
            updatedAt: '2026-06-01T12:00:00.000Z',
          },
        ],
      },
    });
  });

  it('loads selected-client plans from the canonical workout-plan list API', async () => {
    render(<ClientWorkoutPlansPanel clientId={424242} clientName="Fixture Client" />);

    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/workout/plans', {
      params: { clientId: 424242 },
    });
    expect(await screen.findByRole('heading', { name: /training plans/i })).toBeInTheDocument();
    expect(screen.getByText('Phase 2 Strength Plan')).toBeInTheDocument();
    expect(screen.getByText(/^current$/i)).toBeInTheDocument();
    expect(screen.getByText(/nasm phase 2/i)).toBeInTheDocument();
  });

  it('blocks malformed client ids before calling the workout-plan API', () => {
    render(<ClientWorkoutPlansPanel clientId="fixture-424242" clientName="Fixture Client" />);

    expect(mockAuthAxios.get).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/valid client/i);
  });
});
