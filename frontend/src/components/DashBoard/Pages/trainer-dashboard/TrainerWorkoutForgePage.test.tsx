import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import TrainerWorkoutForgePage from './TrainerWorkoutForgePage';

const {
  mockAuthAxios,
  mockNavigate,
  mockSearchParamsRef,
  mockToastSuccess,
  mockToastError,
  mockToastInfo,
  mockUser,
  mockLocationRef,
} = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    post: vi.fn(),
  },
  mockNavigate: vi.fn(),
  mockSearchParamsRef: { current: new URLSearchParams() },
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastInfo: vi.fn(),
  mockUser: { id: 9001, role: 'trainer' },
  // Build Plan is mounted for admin AND trainer (superset closure 2026-07-24).
  // The page resolves its handoff targets from the CURRENT path, so the tests
  // must be able to stand the page up on either dashboard.
  mockLocationRef: { current: { pathname: '/dashboard/trainer/build-plan', search: '' } },
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParamsRef.current],
  useLocation: () => mockLocationRef.current,
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
    mockSearchParamsRef.current = new URLSearchParams();
    mockLocationRef.current = { pathname: '/dashboard/trainer/build-plan', search: '' };
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
    await user.click(screen.getByRole('button', { name: /swan coach planning/i }));

    expect(screen.getByTestId('mock-workout-copilot')).toHaveTextContent('424242:Fixture Client:true');
  });

  it('preselects the routed client when Build Plan opens from trainer Home', async () => {
    mockSearchParamsRef.current = new URLSearchParams('clientId=424242&sessionId=88&source=trainer-overview');

    render(<TrainerWorkoutForgePage />);

    expect(await screen.findByRole('option', { name: 'Fixture Client' })).toBeInTheDocument();
    expect(await screen.findByLabelText(/^client$/i)).toHaveValue('424242');
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

  it('turns a saved draft into one-click logger and Workout Planner next actions', async () => {
    const user = userEvent.setup();
    render(<TrainerWorkoutForgePage />);

    await user.selectOptions(await screen.findByLabelText(/select a client/i), '424242');
    await user.type(screen.getByLabelText(/^title$/i), 'Phase 2 Pull Day');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));
    await user.type(screen.getByLabelText(/exercise 1 name/i), 'Cable Row');
    await user.click(screen.getByRole('button', { name: /save draft plan/i }));

    const nextActions = await screen.findByRole('region', { name: /plan saved next actions/i });
    expect(nextActions).toHaveTextContent('Phase 2 Pull Day');
    expect(nextActions).toHaveTextContent('Fixture Client');

    await user.click(screen.getByRole('button', { name: /log today/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/dashboard/trainer/log-workout?clientId=424242&loadPlan=today&source=build-plan',
    );

    await user.click(screen.getByRole('button', { name: /open workout planner/i }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/dashboard/trainer/workout-planner?clientId=424242&source=build-plan',
    );
  });

  /**
   * Superset closure regression (2026-07-24).
   * Build Plan is now mounted for the admin as well. `activeRole` is derived
   * from the URL (UniversalDashboardLayout.tsx:77), so a hardcoded
   * `/dashboard/trainer/*` handoff would not merely navigate — it would swap
   * the admin's entire shell (routes, sidebar, theme) into the trainer
   * dashboard. That is exactly the "it turns me into a trainer" defect.
   * An admin driving Build Plan must never leave /dashboard/admin/*.
   */
  it('keeps an admin inside the admin dashboard when handing off from Build Plan', async () => {
    mockUser.id = 1;
    mockUser.role = 'admin';
    mockLocationRef.current = { pathname: '/dashboard/admin/build-plan', search: '' };
    // Admins load the roster through the admin endpoint, not trainer assignments.
    mockAuthAxios.get.mockResolvedValue(CLIENTS_RESPONSE);

    const user = userEvent.setup();
    render(<TrainerWorkoutForgePage />);

    await user.selectOptions(await screen.findByLabelText(/select a client/i), '424242');
    await user.type(screen.getByLabelText(/^title$/i), 'Owner Session');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));
    await user.type(screen.getByLabelText(/exercise 1 name/i), 'Cable Row');
    await user.click(screen.getByRole('button', { name: /save draft plan/i }));

    await screen.findByRole('region', { name: /plan saved next actions/i });

    await user.click(screen.getByRole('button', { name: /log today/i }));
    await user.click(screen.getByRole('button', { name: /open workout planner/i }));

    const destinations = mockNavigate.mock.calls.map(([target]) => target as string);
    expect(destinations).toEqual([
      '/dashboard/admin/log-workout?clientId=424242&loadPlan=today&source=build-plan',
      '/dashboard/admin/workout-planner?clientId=424242&source=build-plan',
    ]);
    expect(destinations.some((target) => target.includes('/dashboard/trainer/'))).toBe(false);
  });
});
