import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientAssignment } from './MyClientsView.types';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn(),
  loadClients: vi.fn(),
  handleRefresh: vi.fn(),
}));

const fixtureAssignment: ClientAssignment = {
  id: 'assignment-42',
  assignedAt: '2026-06-01T12:00:00.000Z',
  isActive: true,
  client: {
    id: '42',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test',
    availableSessions: 4,
    clientSource: 'swanstudios',
    fitnessGoal: 'Strength',
    trainingExperience: 'intermediate',
    onboardingStatus: 'completed',
    onboardingComplete: true,
    onboardingCompletionPercentage: 100,
    onboardingPct: 100,
    totalSessionsCompleted: 6,
    lastSessionDate: '2026-06-10T12:00:00.000Z',
    nextSessionDate: '2026-06-20T12:00:00.000Z',
    status: 'active',
    goals: { current: 1, completed: 2 },
    progress: { overallProgress: 0, recentTrend: 'stable' },
    membershipLevel: 'premium',
    joinDate: '2026-05-01T12:00:00.000Z',
  },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('./useTrainerClients', () => ({
  useTrainerClients: () => ({
    error: null,
    filteredClients: [fixtureAssignment],
    handleRefresh: mocks.handleRefresh,
    loadClients: mocks.loadClients,
    loading: false,
    refreshing: false,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    setStatusFilter: vi.fn(),
    stats: {
      totalClients: 1,
      paidSessionInventory: 4,
      completedSessions: 6,
      loggedClients: 1,
    },
    statusFilter: 'all',
  }),
}));

vi.mock('../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel', () => ({
  default: () => null,
}));

import MyClientsView from './MyClientsView';

describe('MyClientsView trainer log intent mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('makes the client picker visibly and accessibly about logging today', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/trainer/clients?intent=log_workout']}>
        <MyClientsView />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /pick client to log workout/i })).toBeInTheDocument();
    expect(screen.getByText(/1 ready to log/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose the client, then today/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /open ada lovelace/i }));

    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard/trainer/log-workout?clientId=42&loadPlan=today');
  });
});
