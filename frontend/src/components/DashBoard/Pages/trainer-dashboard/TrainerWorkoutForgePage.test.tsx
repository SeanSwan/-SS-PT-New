import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import TrainerWorkoutForgePage from './TrainerWorkoutForgePage';

const { mockAuthAxios, mockToastSuccess, mockToastError, mockToastInfo, mockUser } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    post: vi.fn(),
  },
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockUser: { id: 9001, role: 'trainer' },
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios, user: mockUser }),
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

const TRAINER_ASSIGNMENTS_RESPONSE = {
  data: {
    success: true,
    assignments: [
      {
        id: 77,
        status: 'active',
        client: {
          id: 424242,
          firstName: 'Fixture',
          lastName: 'Client',
          username: 'fixture-client',
        },
      },
    ],
  },
};

describe('TrainerWorkoutForgePage workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.id = 9001;
    mockUser.role = 'trainer';
    mockAuthAxios.get.mockResolvedValue(TRAINER_ASSIGNMENTS_RESPONSE);
    mockAuthAxios.post.mockResolvedValue({ data: { success: true, plan: { id: 'plan-1' } } });
  });

  it('loads trainer clients through the trainer assignment endpoint, not the admin-only roster', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        assignments: [
          {
            id: 77,
            status: 'active',
            client: {
              id: 424242,
              firstName: 'Assigned',
              lastName: 'Client',
              username: 'assigned-client',
            },
          },
        ],
      },
    });

    render(<TrainerWorkoutForgePage />);

    expect(await screen.findByRole('option', { name: 'Assigned Client' })).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/client-trainer-assignments/trainer/9001');
    expect(mockAuthAxios.get).not.toHaveBeenCalledWith('/api/admin/clients');
  });

  it('keeps admin users on the admin roster endpoint', async () => {
    mockUser.id = 1;
    mockUser.role = 'admin';
    mockAuthAxios.get.mockResolvedValueOnce(CLIENTS_RESPONSE);

    render(<TrainerWorkoutForgePage />);

    expect(await screen.findByRole('option', { name: 'Fixture Client' })).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/admin/clients');
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
    expect(mockAuthAxios.post.mock.calls[0][1].planData.assignmentDefaults).toEqual({
      defaultAssignmentType: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      shouldDeductSession: false,
    });
    expect(mockAuthAxios.post.mock.calls[0][1].metadata).toMatchObject({
      assignmentDefault: 'trainer_session',
      billingIntent: 'trainer_led_scheduled_flow',
      defaultShouldDeductSession: false,
    });
  });
});
