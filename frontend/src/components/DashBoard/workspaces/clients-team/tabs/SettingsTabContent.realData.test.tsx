import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsTabContent from './SettingsTabContent';

const { mockAuthAxios, updateClientMock } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
  },
  updateClientMock: vi.fn(),
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

vi.mock('../../../../../services/adminClientService', () => ({
  default: { updateClient: updateClientMock },
  adminClientService: { updateClient: updateClientMock },
}));

const CLIENT_RESPONSE = {
  data: {
    success: true,
    data: {
      client: {
        id: 424242,
        firstName: 'Ava',
        lastName: 'Stone',
        email: 'ava.stone@swan.test',
        phone: '555-0101',
        fitnessGoal: 'strength',
        trainingExperience: 'intermediate',
        availableSessions: 8,
        clientSource: 'swanstudios',
        sessionBillingMode: 'paid_sessions',
        healthConcerns: 'Left knee soreness after jumping.',
        emergencyContact: 'Mia Stone - 555-0199',
        isActive: true,
        profileVisibility: 'private',
        showAchievements: false,
        showWorkoutHistory: true,
        emailNotifications: false,
      },
    },
  },
};

describe('SettingsTabContent real client details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxios.get.mockResolvedValue(CLIENT_RESPONSE);
    updateClientMock.mockResolvedValue({ data: { success: true } });
  });

  it('loads and renders real client settings from the admin client detail API', async () => {
    render(<SettingsTabContent clientId={424242} clientName="Placeholder Person" />);

    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/admin/clients/424242');
    expect(await screen.findByDisplayValue('Ava')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Stone')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ava.stone@swan.test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-0101')).toBeInTheDocument();
    expect(screen.getByLabelText(/primary goal/i)).toHaveValue('strength');
    expect(screen.getByLabelText(/training experience/i)).toHaveValue('intermediate');
    expect(screen.getByLabelText(/available sessions/i)).toHaveValue(8);
    expect(screen.getByDisplayValue('Left knee soreness after jumping.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mia Stone - 555-0199')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SwanStudios paid')).toBeInTheDocument();
    expect(screen.getByText(/deduct after completed logged workouts/i)).toBeInTheDocument();
  });


  it('toggles SwanStudios no-pay mode through the admin update API', async () => {
    const onClientUpdated = vi.fn();
    render(<SettingsTabContent clientId={424242} clientName="Ava Stone" onClientUpdated={onClientUpdated} />);

    const toggle = await screen.findByRole('switch', { name: /no-pay training mode/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateClientMock).toHaveBeenCalledWith('424242', { sessionBillingMode: 'no_session_required' });
    });
    expect(onClientUpdated).toHaveBeenCalledWith({ sessionBillingMode: 'no_session_required' });
    expect(screen.getByRole('switch', { name: /no-pay training mode/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByDisplayValue('SwanStudios no-pay')).toBeInTheDocument();
    expect(screen.getByText(/no paid-session balance required/i)).toBeInTheDocument();
  });
  it('exposes read-only privacy switches with explicit on/off state', async () => {
    render(<SettingsTabContent clientId={424242} clientName="Placeholder Person" />);

    expect(await screen.findByRole('switch', { name: /account active: on/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /profile visibility: off/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /achievement visibility: off/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /workout history visibility: on/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /email notifications: off/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows Move Fitness as free tracking with no session deduction', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          client: {
            id: 424242,
            firstName: 'Fixture',
            lastName: 'Mover',
            clientSource: 'move_fitness',
            availableSessions: 9,
          },
        },
      },
    });

    render(<SettingsTabContent clientId={424242} clientName="Fixture Mover" />);

    expect(await screen.findByDisplayValue('Move Fitness free tracking')).toBeInTheDocument();
    expect(screen.getByLabelText(/available sessions/i)).toHaveValue(0);
    expect(screen.getByText(/no deduction/i)).toBeInTheDocument();
    expect(screen.queryByText(/deduct after completed logged workouts/i)).not.toBeInTheDocument();
  });

  it('does not mirror malformed or negative paid-session inventory into settings', async () => {
    mockAuthAxios.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          client: {
            id: 424242,
            firstName: 'Fixture',
            lastName: 'Paid',
            clientSource: 'swanstudios',
            availableSessions: '-3',
          },
        },
      },
    });

    render(<SettingsTabContent clientId={424242} clientName="Fixture Paid" />);

    expect(await screen.findByLabelText(/available sessions/i)).toHaveValue(0);
    expect(screen.getByDisplayValue('SwanStudios paid')).toBeInTheDocument();
  });

  it('does not call the admin client detail API for malformed client ids', () => {
    render(<SettingsTabContent clientId="fixture-424242" clientName="Fixture Paid" />);

    expect(mockAuthAxios.get).not.toHaveBeenCalled();
  });
});
