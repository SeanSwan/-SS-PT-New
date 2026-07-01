import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
  return {
    mockNavigate: vi.fn(),
    mockAuthAxios: { get: mockAuthAxiosGet, post: mockAuthAxiosPost },
    mockApiService: { get: mockApiServiceGet, patch: vi.fn(() => Promise.resolve({ data: { success: true } })) },
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
          clientSource: 'move_fitness',
          accountStatus: 'stub',
          isActive: true,
          totalWorkouts: 0,
          availableSessions: 0,
        },
      ],
    },
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

describe('ClientsWorkspace selected-client claim-link recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockResolvedValue(CLIENTS_RESPONSE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('generates a copyable claim link for a selected stub client from the canonical Client Hub', async () => {
    const user = userEvent.setup();
    const claimUrl = 'https://sswanstudios.com/claim/SWAN-ABCD1234';
    mockAuthAxiosPost.mockImplementation((url: string) => {
      if (url === '/api/claim/generate-token') {
        return Promise.resolve({
          data: {
            success: true,
            message: 'Claim link generated.',
            data: {
              token: 'SWAN-ABCD1234',
              claimUrl,
              expiresAt: '2026-07-01T00:00:00.000Z',
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    renderWorkspace();

    await user.click(await screen.findByRole('button', { name: /open fixture client/i }));
    await user.click(await screen.findByRole('button', { name: /generate claim link for fixture client/i }));
    await user.click(await screen.findByRole('button', { name: /^generate claim link$/i }));

    await waitFor(() => {
      expect(mockAuthAxiosPost).toHaveBeenCalledWith('/api/claim/generate-token', { clientId: 424242 });
    });
    expect(mockAuthAxiosPost.mock.calls.some(([url]) => url === '/api/admin/clients/424242/send-password-reset')).toBe(false);

    const handoff = await screen.findByRole('region', { name: /client access handoff/i });
    expect(handoff).toHaveTextContent(/claim link ready/i);
    expect(handoff).toHaveTextContent(/claim link is ready for account activation/i);
    expect(handoff).toHaveTextContent(claimUrl);
    expect(handoff).toHaveTextContent('SWAN-ABCD1234');
    expect(within(handoff).getByRole('button', { name: /copy claim link/i })).toBeInTheDocument();
    expect(within(handoff).getByRole('button', { name: /copy claim code/i })).toBeInTheDocument();
    expect(within(handoff).queryByRole('button', { name: /copy reset link/i })).not.toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Claim link ready',
      description: 'Claim link generated.',
    }));
  });
});