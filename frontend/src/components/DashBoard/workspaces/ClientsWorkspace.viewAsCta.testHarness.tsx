/**
 * Test harness for the canonical ClientsWorkspace "View As" and daily action
 * CTA tests. Keeps route/auth mocks and synthetic client fixtures outside the
 * behavior-focused spec.
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

const harnessMocks = vi.hoisted(() => {
  const mockAuthAxiosGet = vi.fn();
  const mockAuthAxiosDelete = vi.fn();
  const mockAuthAxiosPut = vi.fn();
  const mockApiServiceGet = vi.fn((url: string) => {
    if (url.includes('/api/macros/review-queue')) {
      return Promise.resolve({ data: { success: true, entries: [] } });
    }
    return Promise.resolve({ data: { success: true, clients: [] } });
  });
  const mockApiServicePatch = vi.fn(() => Promise.resolve({ data: { success: true } }));
  return {
    mockNavigate: vi.fn(),
    mockAuthAxios: { get: mockAuthAxiosGet, delete: mockAuthAxiosDelete, put: mockAuthAxiosPut },
    mockApiService: { get: mockApiServiceGet, patch: mockApiServicePatch },
    mockToast: vi.fn(),
    mockUser: { id: 1, role: 'admin' as const },
  };
});

export const { mockNavigate, mockAuthAxios, mockApiService, mockToast, mockUser } = harnessMocks;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => harnessMocks.mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    authAxios: harnessMocks.mockAuthAxios,
    user: harnessMocks.mockUser,
  }),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: harnessMocks.mockToast,
  }),
}));

vi.mock('../../../services/api.service', () => ({
  default: harnessMocks.mockApiService,
}));

// Tab content components trigger heavy imports in JSDOM; stub them so the CTA
// render path stays focused on the top bar.
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

// Synthetic fixture id chosen to keep production PII out of commit-bound files.
export const FIXTURE_CLIENT_ID = 424242;

const makeClientResponse = (overrides: Record<string, unknown> = {}) => ({
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
          onboardingComplete: true,
          isOnboardingComplete: true,
          ...overrides,
        },
      ],
    },
  },
});

export const CLIENTS_RESPONSE = makeClientResponse();
export const MOVE_FITNESS_CLIENTS_RESPONSE = makeClientResponse({
  clientSource: 'move_fitness',
  availableSessions: 0,
});
export const INACTIVE_CLIENTS_RESPONSE = makeClientResponse({
  isActive: false,
});

export const renderWorkspace = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ClientsWorkspace />
    </MemoryRouter>
  );
