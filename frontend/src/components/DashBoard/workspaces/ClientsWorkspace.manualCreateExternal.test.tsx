import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockNavigate, mockAuthAxios, mockApiService, mockToast, mockUser } = vi.hoisted(() => {
  const mockAuthAxiosGet = vi.fn();
  const mockAuthAxiosPost = vi.fn();
  const mockApiServiceGet = vi.fn((url: string) => {
    if (url.includes('/api/macros/review-queue')) {
      return Promise.resolve({ data: { success: true, entries: [] } });
    }
    return Promise.resolve({ data: { success: true, clients: [] } });
  });
  const mockApiServicePatch = vi.fn(() => Promise.resolve({ data: { success: true } }));
  return {
    mockNavigate: vi.fn(),
    mockAuthAxios: { get: mockAuthAxiosGet, post: mockAuthAxiosPost },
    mockApiService: { get: mockApiServiceGet, patch: mockApiServicePatch },
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

vi.mock('../../../services/api.service', () => ({
  default: mockApiService,
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

describe('ClientsWorkspace external manual client creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/trainers') return Promise.resolve(TRAINERS_RESPONSE);
      return Promise.resolve(CLIENTS_RESPONSE);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('shows a claim-link handoff for Move Fitness clients from the canonical Client Hub', async () => {
    const user = userEvent.setup();
    const claimUrl = 'https://sswanstudios.com/claim/SWAN-ABCD1234';
    mockAuthAxiosPost.mockImplementation((url: string) => {
      if (url === '/api/admin/clients/create-external') {
        return Promise.resolve({
          data: {
            success: true,
            message: 'External client created successfully',
            data: {
              client: {
                id: 8181,
                firstName: 'Move',
                lastName: 'Client',
                email: 'move.client@example.test',
              },
              temporaryPassword: 'NeverRender123!',
              claimToken: 'SWAN-ABCD1234',
              claimUrl,
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: /^manual add$/i }));
    await user.click(screen.getByRole('button', { name: /move fitness/i }));

    expect(screen.getByRole('dialog', { name: /add move fitness client/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^username/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^password/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Move' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Client' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'move.client@example.test' } });
    await user.click(screen.getByRole('button', { name: /create client/i }));

    await waitFor(() => {
      expect(mockAuthAxiosPost.mock.calls.some(([url]) => url === '/api/admin/clients/create-external')).toBe(true);
    });
    const externalCreateCall = mockAuthAxiosPost.mock.calls.find(([url]) => url === '/api/admin/clients/create-external');
    expect(externalCreateCall?.[1]).toEqual(expect.objectContaining({
      firstName: 'Move',
      lastName: 'Client',
      email: 'move.client@example.test',
      clientSource: 'move_fitness',
      availableSessions: 0,
    }));
    expect(externalCreateCall?.[1]).not.toHaveProperty('username');
    expect(externalCreateCall?.[1]).not.toHaveProperty('password');
    expect(mockAuthAxiosPost.mock.calls.some(([url]) => url === '/api/admin/clients')).toBe(false);

    const handoff = await screen.findByRole('region', { name: /client access handoff/i });
    expect(handoff).toHaveTextContent(/claim link ready/i);
    expect(handoff).toHaveTextContent(/claim link is ready for account activation/i);
    expect(handoff).toHaveTextContent(claimUrl);
    expect(handoff).toHaveTextContent('SWAN-ABCD1234');
    expect(handoff).not.toHaveTextContent(/temporary/i);
    expect(handoff).not.toHaveTextContent(/NeverRender123/i);
    expect(within(handoff).getByRole('button', { name: /copy claim link/i })).toBeInTheDocument();
    expect(within(handoff).getByRole('button', { name: /copy claim code/i })).toBeInTheDocument();
    expect(within(handoff).queryByRole('button', { name: /copy reset link/i })).not.toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Client created',
      description: expect.stringMatching(/Move Client.*claim link is ready/i),
    }));
  });
});