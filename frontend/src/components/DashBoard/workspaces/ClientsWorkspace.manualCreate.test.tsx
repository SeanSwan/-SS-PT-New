import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockNavigate, mockAuthAxios, mockToast, mockUser } = vi.hoisted(() => {
  const mockAuthAxiosGet = vi.fn();
  const mockAuthAxiosPost = vi.fn();
  return {
    mockNavigate: vi.fn(),
    mockAuthAxios: { get: mockAuthAxiosGet, post: mockAuthAxiosPost },
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
    ClientDetailView: ({ activeTab }: any) => (
      <div data-testid="mock-client-detail-tab">{activeTab}</div>
    ),
  };
});

import ClientsWorkspace from './ClientsWorkspace';

const CLIENTS_RESPONSE = {
  data: {
    success: true,
    data: {
      clients: [
        {
          id: 424242,
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

const EMPTY_CLIENTS_RESPONSE = {
  data: {
    success: true,
    data: {
      clients: [],
    },
  },
};

const CREATED_CLIENT_RESPONSE = {
  data: {
    success: true,
    message: 'Client created successfully',
    data: {
      client: {
        id: 5150,
        firstName: 'Manual',
        lastName: 'Client',
        email: 'manual.client@example.test',
      },
    },
  },
};

const TRAINERS_RESPONSE = {
  data: {
    success: true,
    trainers: [
      {
        id: 99,
        firstName: 'Sean',
        lastName: 'Swan',
        role: 'admin',
      },
      {
        id: 101,
        firstName: 'Ari',
        lastName: 'Coach',
        role: 'trainer',
      },
    ],
  },
};

const mockAuthAxiosGet = mockAuthAxios.get as ReturnType<typeof vi.fn>;
const mockAuthAxiosPost = mockAuthAxios.post as ReturnType<typeof vi.fn>;

const renderWorkspace = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/admin/client-management']}>
      <ClientsWorkspace />
    </MemoryRouter>
  );

describe('ClientsWorkspace manual client creation fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/trainers') return Promise.resolve(TRAINERS_RESPONSE);
      return Promise.resolve(CLIENTS_RESPONSE);
    });
    mockAuthAxiosPost.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/5150/send-password-reset') {
        return Promise.resolve({
          data: {
            success: true,
            message: 'Password reset email sent.',
            data: { credentialAction: 'reset_email_sent', resetEmailSent: true },
          },
        });
      }
      return Promise.resolve(CREATED_CLIENT_RESPONSE);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('opens a manual client form from Client Hub and refreshes the client list after submit', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: /^manual add$/i }));

    expect(screen.getByRole('dialog', { name: /add new client/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/first name/i), 'Manual');
    await user.type(screen.getByLabelText(/last name/i), 'Client');
    await user.type(screen.getByLabelText(/^email/i), 'manual.client@example.test');
    await user.type(screen.getByLabelText(/^username/i), 'manual.client');
    await user.type(screen.getByLabelText(/^password/i), 'Client123');
    await user.selectOptions(await screen.findByLabelText(/assign trainer/i), '99');

    await user.click(screen.getByRole('button', { name: /create client/i }));

    await waitFor(() => expect(mockAuthAxiosPost).toHaveBeenCalledTimes(2));
    const [path, payload] = mockAuthAxiosPost.mock.calls[0];
    expect(path).toBe('/api/admin/clients');
    expect(payload).toEqual(expect.objectContaining({
      firstName: 'Manual',
      lastName: 'Client',
      email: 'manual.client@example.test',
      username: 'manual.client',
      trainerId: '99',
      role: 'client',
      isActive: true,
    }));
    expect(mockAuthAxiosPost).toHaveBeenCalledWith(
      '/api/admin/clients/5150/send-password-reset',
      {},
      undefined,
    );
    await waitFor(() => {
      const clientListCalls = mockAuthAxiosGet.mock.calls.filter(([url]) => url === '/api/admin/clients');
      expect(clientListCalls.length).toBeGreaterThanOrEqual(2);
    });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Client created',
      description: expect.stringMatching(/Manual Client.*secure login link/i),
    }));
    expect(screen.getByRole('region', { name: /client access handoff/i })).toHaveTextContent(/secure login link sent/i);
  });

  it('loads assignable trainers into the canonical manual client form', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: /^manual add$/i }));

    await waitFor(() => {
      expect(mockAuthAxiosGet).toHaveBeenCalledWith('/api/admin/trainers', undefined);
    });

    const trainerSelect = await screen.findByLabelText(/assign trainer/i);
    expect(within(trainerSelect).getByRole('option', { name: /Sean Swan/i })).toHaveValue('99');
    expect(within(trainerSelect).getByRole('option', { name: /Ari Coach/i })).toHaveValue('101');
  });

  it('offers both Swan Coach and manual creation in the no-client first-run state', async () => {
    const user = userEvent.setup();
    mockAuthAxiosGet.mockResolvedValue(EMPTY_CLIENTS_RESPONSE);
    renderWorkspace();

    const emptyActions = await screen.findByTestId('client-hub-empty-actions');
    expect(within(emptyActions).getByRole('button', { name: /onboard with swan coach/i })).toBeInTheDocument();

    await user.click(within(emptyActions).getByRole('button', { name: /manual add/i }));

    expect(screen.getByRole('dialog', { name: /add new client/i })).toBeInTheDocument();
  });
});
