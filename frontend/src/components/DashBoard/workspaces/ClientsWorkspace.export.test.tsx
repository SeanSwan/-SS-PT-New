import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAuthAxios,
  mockExportClients,
  mockNavigate,
  mockToast,
} = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  mockExportClients: vi.fn(),
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
}));

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
    services: {
      adminClient: {
        exportClients: mockExportClients,
      },
    },
    user: { id: 1, role: 'admin' },
  }),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('./ClientsWorkspaceTabs', () => ({
  useClientsWorkspaceTabRenderers: () => ({
    renderTraining: () => null,
    renderProgress: () => null,
    renderNutrition: () => null,
    renderBiometrics: () => null,
    renderOverview: () => null,
    renderSettings: () => null,
  }),
}));

vi.mock('./ClientActivationQueuePanel', () => ({ default: () => null }));
vi.mock('./clients-team/ClientNutritionEstimateReviewPanel', () => ({ default: () => null }));
vi.mock('./clients-team/ClientNutritionRosterTriagePanel', () => ({ default: () => null }));

import ClientsWorkspace from './ClientsWorkspace';

const EMPTY_CLIENTS_RESPONSE = {
  data: {
    success: true,
    data: {
      clients: [],
    },
  },
};

const renderWorkspace = () => render(
  <MemoryRouter initialEntries={['/dashboard/admin/client-management']}>
    <ClientsWorkspace />
  </MemoryRouter>
);

describe('ClientsWorkspace native client-directory export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxios.get.mockResolvedValue(EMPTY_CLIENTS_RESPONSE);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('downloads the complete CSV directory from the canonical Client Hub and prevents duplicate clicks', async () => {
    const user = userEvent.setup();
    let finishExport: ((value: boolean) => void) | undefined;
    mockExportClients.mockImplementation(() => new Promise<boolean>((resolve) => {
      finishExport = resolve;
    }));
    renderWorkspace();

    const exportButton = await screen.findByRole('button', {
      name: /export client directory as csv/i,
    });
    await user.click(exportButton);

    expect(mockExportClients).toHaveBeenCalledWith('csv');
    expect(mockExportClients).toHaveBeenCalledTimes(1);
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAttribute('aria-busy', 'true');

    await user.click(exportButton);
    expect(mockExportClients).toHaveBeenCalledTimes(1);

    finishExport?.(true);

    await waitFor(() => expect(exportButton).toBeEnabled());
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Client export ready',
      description: 'The complete client directory was downloaded as a CSV file.',
      variant: 'success',
    });
  });

  it('reports a failed export without presenting a success state', async () => {
    const user = userEvent.setup();
    mockExportClients.mockRejectedValue(new Error('synthetic network failure'));
    renderWorkspace();

    const exportButton = await screen.findByRole('button', {
      name: /export client directory as csv/i,
    });
    await user.click(exportButton);

    await waitFor(() => expect(exportButton).toBeEnabled());
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Client export failed',
      description: 'No file was downloaded. Try again.',
      variant: 'destructive',
    });
    expect(mockToast).not.toHaveBeenCalledWith(expect.objectContaining({
      title: 'Client export ready',
    }));
  });
});
