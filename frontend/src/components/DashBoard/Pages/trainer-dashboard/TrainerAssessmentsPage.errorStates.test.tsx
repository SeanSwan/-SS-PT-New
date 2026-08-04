/**
 * TrainerAssessmentsPage error/loading states (launch audit lane 5, 2026-08-03).
 * Regression: a failed roster or history fetch used to collapse silently into
 * an empty dropdown / empty history with no explanation and no retry path.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrainerAssessmentsPage from './TrainerAssessmentsPage';

const { mockAuthAxios, mockUser } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
    post: vi.fn(),
  },
  mockUser: { id: 9001, role: 'trainer' },
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios, user: mockUser }),
}));

vi.mock('./components/NASMTeachMode', () => ({
  default: () => <div data-testid="mock-nasm-teach-mode" />,
}));

const HISTORY_RESPONSE = { data: { success: true, data: { analyses: [] } } };
const TRAINER_ASSIGNMENTS_RESPONSE = {
  data: {
    success: true,
    assignments: [
      {
        id: 77,
        status: 'active',
        client: { id: 424242, firstName: 'Assigned', lastName: 'Client', username: 'assigned-client' },
      },
    ],
  },
};

const routeOk = (path: string) => {
  if (path === '/api/movement-analysis') return Promise.resolve(HISTORY_RESPONSE);
  if (path === '/api/client-trainer-assignments/trainer/9001') {
    return Promise.resolve(TRAINER_ASSIGNMENTS_RESPONSE);
  }
  return Promise.reject(new Error(`Unexpected GET ${path}`));
};

describe('TrainerAssessmentsPage error and loading states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.id = 9001;
    mockUser.role = 'trainer';
  });

  it('surfaces a visible error with retry when the client roster fetch fails', async () => {
    let rosterCalls = 0;
    mockAuthAxios.get.mockImplementation((path: string) => {
      if (path === '/api/client-trainer-assignments/trainer/9001') {
        rosterCalls += 1;
        return rosterCalls === 1
          ? Promise.reject(new Error('network down'))
          : Promise.resolve(TRAINER_ASSIGNMENTS_RESPONSE);
      }
      return routeOk(path);
    });

    render(<TrainerAssessmentsPage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/client/i);

    await userEvent.click(screen.getByRole('button', { name: /retry loading clients/i }));
    expect(await screen.findByRole('option', { name: 'Assigned Client' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /retry loading clients/i })).not.toBeInTheDocument();
    });
  });

  it('surfaces a visible error with retry when assessment history fails, instead of a silent empty list', async () => {
    let historyCalls = 0;
    mockAuthAxios.get.mockImplementation((path: string) => {
      if (path === '/api/movement-analysis') {
        historyCalls += 1;
        return historyCalls === 1
          ? Promise.reject(new Error('500'))
          : Promise.resolve(HISTORY_RESPONSE);
      }
      return routeOk(path);
    });

    render(<TrainerAssessmentsPage />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/history|assessment/i);

    await userEvent.click(screen.getByRole('button', { name: /retry loading history/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /retry loading history/i })).not.toBeInTheDocument();
    });
  });

  it('surfaces the same failure notice for an admin on the admin roster endpoint', async () => {
    mockUser.id = 1;
    mockUser.role = 'admin';
    let rosterCalls = 0;
    mockAuthAxios.get.mockImplementation((path: string) => {
      if (path === '/api/movement-analysis') return Promise.resolve(HISTORY_RESPONSE);
      if (path === '/api/admin/clients') {
        rosterCalls += 1;
        return rosterCalls === 1
          ? Promise.reject(new Error('boom'))
          : Promise.resolve({
              data: {
                success: true,
                data: { clients: [{ id: 515151, firstName: 'Admin', lastName: 'Client', username: 'admin-client' }] },
              },
            });
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`));
    });

    render(<TrainerAssessmentsPage />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /retry loading clients/i }));
    expect(await screen.findByRole('option', { name: 'Admin Client' })).toBeInTheDocument();
  });

  it('announces the roster loading state while the fetch is in flight', async () => {
    let resolveRoster: (value: unknown) => void = () => {};
    mockAuthAxios.get.mockImplementation((path: string) => {
      if (path === '/api/client-trainer-assignments/trainer/9001') {
        return new Promise(resolve => {
          resolveRoster = resolve;
        });
      }
      return routeOk(path);
    });

    render(<TrainerAssessmentsPage />);

    expect(await screen.findByText(/loading clients/i)).toBeInTheDocument();

    resolveRoster(TRAINER_ASSIGNMENTS_RESPONSE);
    expect(await screen.findByRole('option', { name: 'Assigned Client' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/loading clients/i)).not.toBeInTheDocument();
    });
  });
});
