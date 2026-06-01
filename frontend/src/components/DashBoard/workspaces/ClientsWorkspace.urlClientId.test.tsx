import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockNavigate, mockAuthAxios, mockToast, mockUser } = vi.hoisted(() => {
  const mockAuthAxiosGet = vi.fn();
  return {
    mockNavigate: vi.fn(),
    mockAuthAxios: { get: mockAuthAxiosGet },
    mockToast: vi.fn(),
    mockUser: { id: 1, role: 'admin' as const },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: mockAuthAxios,
    user: mockUser,
  }),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock('./clients-team/tabs/TrainingTabContent', () => ({ default: () => null }));
vi.mock('./clients-team/tabs/ProgressTabContent', () => ({ default: () => null }));
vi.mock('./clients-team/tabs/BiometricsTabContent', () => ({ default: () => null }));
vi.mock('./clients-team/tabs/OverviewTabContent', () => ({ default: () => null }));
vi.mock('./clients-team/tabs/SettingsTabContent', () => ({ default: () => null }));
vi.mock('./clients-team', async () => {
  const actual = await vi.importActual<any>('./clients-team');
  return {
    ...actual,
    ClientDetailView: () => <div data-testid="mock-client-detail" />,
  };
});

import ClientsWorkspace from './ClientsWorkspace';

const FIXTURE_CLIENT_ID = 424242;

const CLIENTS_RESPONSE = {
  data: {
    success: true,
    data: {
      clients: [
        {
          id: FIXTURE_CLIENT_ID,
          firstName: 'Fixture',
          lastName: 'Client',
          email: 'fixture.client@example.test',
          clientSource: 'swanstudios',
          isActive: true,
          totalWorkouts: 7,
          availableSessions: 12,
        },
      ],
    },
  },
};

const mockAuthAxiosGet = mockAuthAxios.get as ReturnType<typeof vi.fn>;

const renderWorkspace = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ClientsWorkspace />
    </MemoryRouter>
  );

describe('ClientsWorkspace URL client id parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockResolvedValue(CLIENTS_RESPONSE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('does not auto-select a client from a malformed clientId query value', async () => {
    renderWorkspace(`/dashboard/admin/client-management?clientId=${FIXTURE_CLIENT_ID}junk`);

    expect(await screen.findByRole('button', { name: /open fixture client/i })).toBeInTheDocument();
    expect(screen.queryByText(/daily training flow/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-client-detail')).not.toBeInTheDocument();
  });
});
