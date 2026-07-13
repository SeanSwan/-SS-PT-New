import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dataMock = vi.hoisted(() => ({
  fetchClientHubClients: vi.fn(),
  fetchClientHubClientsStrict: vi.fn(),
  fetchClientHubAdminClients: vi.fn(),
  fetchClientHubTrainerClients: vi.fn(),
  fetchAdminClientById: vi.fn(),
  fetchTrainerClientById: vi.fn(),
  resolveInitialClientSelection: vi.fn(),
}));

vi.mock('./ClientsWorkspace.data', () => dataMock);

const stableAuth = vi.hoisted(() => ({
  authAxios: { get: async () => ({ data: {} }) },
  user: { id: 777, role: 'trainer' },
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => stableAuth,
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('./clients-team/useManualClientCreation', () => ({
  useManualClientCreation: () => ({
    manualCreateOpen: false,
    manualCreateTrainers: [],
    creationHandoff: null,
    openManualCreate: vi.fn(),
    closeManualCreate: vi.fn(),
    clearCreationHandoff: vi.fn(),
    handleManualCreate: vi.fn(),
  }),
}));

vi.mock('./ClientActivationQueuePanel', () => ({
  default: () => <div data-testid="activation-queue-panel" />,
}));

import ClientsWorkspace from './ClientsWorkspace';

const trainerRoster = [
  {
    id: 61,
    firstName: 'Assigned',
    lastName: 'Client',
    email: 'assigned@example.com',
    clientSource: 'swanstudios',
    sessionBillingMode: 'paid_sessions',
    isActive: true,
    availableSessions: 4,
    workoutCount: 9,
    lastSessionDate: null,
    nextSessionDate: null,
    joinDate: null,
    fitnessGoal: '',
    trainingExperience: '',
    dateOfBirth: null,
    onboardingComplete: true,
    isOnboardingComplete: true,
    onboardingPct: 100,
    onboardingCompletionPercentage: 100,
    completionPercentage: 100,
    onboardingFieldLedger: null,
    onboardingMissingFields: [],
  },
];

describe('ClientsWorkspace trainer audience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataMock.fetchClientHubClientsStrict.mockResolvedValue(trainerRoster);
    dataMock.resolveInitialClientSelection.mockResolvedValue(null);
  });

  it('loads the assigned-clients roster through the trainer data lane', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/trainer/clients']}>
        <ClientsWorkspace audience="trainer" />
      </MemoryRouter>,
    );

    await waitFor(() => expect(dataMock.fetchClientHubClientsStrict).toHaveBeenCalled());
    expect(dataMock.fetchClientHubClientsStrict).toHaveBeenCalledWith(expect.anything(), 'trainer', 777);
    expect((await screen.findAllByText(/assigned client/i)).length).toBeGreaterThan(0);
  });

  it('hides every admin account control from the trainer top bar', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/trainer/clients']}>
        <ClientsWorkspace audience="trainer" />
      </MemoryRouter>,
    );
    await screen.findAllByText(/assigned client/i);

    expect(screen.queryByRole('button', { name: /new client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /manual add/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /trainer assignments/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /onboarding workbench/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /open swan coach/i }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('activation-queue-panel')).not.toBeInTheDocument();
  });

  it('shows the trainer empty state without admin create actions', async () => {
    dataMock.fetchClientHubClientsStrict.mockResolvedValue([]);
    render(
      <MemoryRouter initialEntries={['/dashboard/trainer/clients']}>
        <ClientsWorkspace audience="trainer" />
      </MemoryRouter>,
    );

    expect((await screen.findAllByText(/no assigned clients yet/i)).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('client-hub-empty-actions')).not.toBeInTheDocument();
  });
});

describe('trainer route mount lock', () => {
  it('mounts TrainerClientsWorkspace at /dashboard/trainer/clients', () => {
    const routesSource = readFileSync(
      resolve(__dirname, '../UniversalDashboardLayout.routes.tsx'),
      'utf8',
    );
    const routeComponentsSource = readFileSync(
      resolve(__dirname, '../UniversalDashboardLayout.routeComponents.tsx'),
      'utf8',
    );
    expect(routesSource).toContain("{ path: '/clients', component: TrainerClientsWorkspace");
    expect(routeComponentsSource).toContain(
      "export const TrainerClientsWorkspace = React.lazy(() => import('./workspaces/TrainerClientsWorkspace'))",
    );
    const trainerWrapperSource = readFileSync(
      resolve(__dirname, 'TrainerClientsWorkspace.tsx'),
      'utf8',
    );
    expect(trainerWrapperSource).toContain('<ClientsWorkspace audience="trainer" />');
  });
});
