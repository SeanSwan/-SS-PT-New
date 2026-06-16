import { screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLIENTS_RESPONSE,
  mockAuthAxios,
  mockNavigate,
  renderWorkspace,
} from './ClientsWorkspace.viewAsCta.testHarness';

const mockAuthAxiosGet = mockAuthAxios.get as ReturnType<typeof vi.fn>;

describe('ClientsWorkspace intent mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthAxiosGet.mockImplementation((url: string) => {
      if (url === '/api/admin/clients') return Promise.resolve(CLIENTS_RESPONSE);
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('makes the admin log-workout intent visible before the client pick', async () => {
    const user = userEvent.setup();
    renderWorkspace('/dashboard/admin/client-management?intent=log_workout');

    const mode = await screen.findByRole('region', { name: /log workout mode/i });
    expect(mode).toHaveTextContent(/pick the client/i);
    expect(mode).toHaveTextContent(/logger opens next/i);

    await user.click(screen.getByRole('button', { name: /open fixture client/i }));

    expect(screen.getByTestId('mock-client-detail-tab')).toHaveTextContent('training');
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard/admin/log-workout'));
  });
});
