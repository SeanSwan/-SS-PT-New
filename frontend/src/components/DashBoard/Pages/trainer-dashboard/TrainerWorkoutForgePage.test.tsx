import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import TrainerWorkoutForgePage from './TrainerWorkoutForgePage';

const { mockAuthAxios, mockToastSuccess, mockToastError, mockToastInfo } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    post: vi.fn(),
  },
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
    info: mockToastInfo,
  },
}));

vi.mock('../admin-clients/components/WorkoutCopilotPanel', () => ({
  default: ({ open, clientId, clientName, autoGenerate }: any) =>
    open ? (
      <div data-testid="mock-workout-copilot">
        {clientId}:{clientName}:{String(autoGenerate)}
      </div>
    ) : null,
}));

const CLIENTS_RESPONSE = {
  data: {
    success: true,
    data: {
      clients: [
        {
          id: 424242,
          firstName: 'Fixture',
          lastName: 'Client',
          username: 'fixture-client',
        },
      ],
    },
  },
};

describe('TrainerWorkoutForgePage workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxios.get.mockResolvedValue(CLIENTS_RESPONSE);
    mockAuthAxios.post.mockResolvedValue({ data: { success: true, plan: { id: 'plan-1' } } });
  });

  it('turns Add Exercise into an editable manual exercise row', async () => {
    const user = userEvent.setup();
    render(<TrainerWorkoutForgePage />);

    await user.selectOptions(await screen.findByLabelText(/select a client/i), '424242');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    expect(screen.queryByText(/coming in phase 3/i)).toBeNull();
    expect(screen.getByLabelText(/exercise 1 name/i)).toBeInTheDocument();
  });

  it('opens Swan Coach generation for the selected client', async () => {
    const user = userEvent.setup();
    render(<TrainerWorkoutForgePage />);

    await user.selectOptions(await screen.findByLabelText(/select a client/i), '424242');
    await user.click(screen.getByRole('button', { name: /generate with swan coach/i }));

    expect(screen.getByTestId('mock-workout-copilot')).toHaveTextContent('424242:Fixture Client:true');
  });

  it('saves a draft workout plan to the canonical workout-plan API', async () => {
    const user = userEvent.setup();
    render(<TrainerWorkoutForgePage />);

    await user.selectOptions(await screen.findByLabelText(/select a client/i), '424242');
    await user.type(screen.getByLabelText(/^title$/i), 'Phase 2 Pull Day');
    await user.type(screen.getByLabelText(/goal/i), 'Strength endurance');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));
    await user.type(screen.getByLabelText(/exercise 1 name/i), 'Cable Row');
    await user.click(screen.getByRole('button', { name: /save draft plan/i }));

    await waitFor(() => expect(mockAuthAxios.post).toHaveBeenCalledTimes(1));
    expect(mockAuthAxios.post).toHaveBeenCalledWith(
      '/api/workout-plans',
      expect.objectContaining({
        userId: 424242,
        title: 'Phase 2 Pull Day',
        nasmPhase: 1,
        status: 'draft',
        createdBy: 'trainer',
      })
    );
    expect(mockAuthAxios.post.mock.calls[0][1].planData.weeks[0].sessions[0].exercises[0].name).toBe('Cable Row');
  });
});
