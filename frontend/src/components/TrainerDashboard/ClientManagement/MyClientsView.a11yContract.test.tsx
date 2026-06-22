/**
 * MyClientsView.a11yContract.test.tsx
 * -----------------------------------
 * Render-level regression locks for the accessibility behaviors added in the
 * GLM-5.2 design refactor (Round-3 hostile-review coverage gap): status-filter
 * aria-pressed, search aria-label, and the accessible skeleton loading state.
 * These exercise the real component so a regression that drops the a11y wiring
 * fails here (source-string checks alone could not catch a runtime break).
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientAssignment } from './MyClientsView.types';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toast: vi.fn(),
  loadClients: vi.fn(),
  handleRefresh: vi.fn(),
  state: { loading: false },
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
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('./useTrainerClients', () => ({
  useTrainerClients: () => ({
    error: null,
    filteredClients: mocks.state.loading ? [] : [fixtureAssignment],
    handleRefresh: mocks.handleRefresh,
    loadClients: mocks.loadClients,
    loading: mocks.state.loading,
    refreshing: false,
    searchTerm: '',
    setSearchTerm: vi.fn(),
    setStatusFilter: vi.fn(),
    stats: { totalClients: 1, paidSessionInventory: 4, completedSessions: 6, loggedClients: 1 },
    statusFilter: 'all',
  }),
}));

vi.mock('../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel', () => ({
  default: () => null,
}));

import MyClientsView from './MyClientsView';

describe('MyClientsView a11y contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.loading = false;
  });

  it('labels the client search and exposes aria-pressed toggle state on the status filters', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/trainer/clients']}>
        <MyClientsView />
      </MemoryRouter>,
    );

    // Search input is labelled for screen readers (not placeholder-only).
    expect(screen.getByLabelText('Search clients by name or email')).toBeInTheDocument();

    // statusFilter='all' -> the All Clients filter reports pressed, the others report not-pressed.
    expect(screen.getByRole('button', { name: /all clients/i, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^active$/i, pressed: false })).toBeInTheDocument();
  });

  it('renders an accessible skeleton region while loading', () => {
    mocks.state.loading = true;

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/trainer/clients']}>
        <MyClientsView />
      </MemoryRouter>,
    );

    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy?.getAttribute('aria-label')).toBe('Loading your clients');
  });
});
