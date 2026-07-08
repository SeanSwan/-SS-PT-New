import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminClientService } from '../../services/adminClientService';
import { PlaudClientResolver } from './PlaudClientResolver';

const { mockAuthAxios, mockUser } = vi.hoisted(() => ({
  mockAuthAxios: {
    get: vi.fn(),
  },
  mockUser: { id: 1, role: 'admin' },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios, user: mockUser }),
}));

vi.mock('../../services/adminClientService', async () => {
  const actual = await vi.importActual<typeof import('../../services/adminClientService')>(
    '../../services/adminClientService',
  );
  return {
    ...actual,
    createAdminClientService: vi.fn(),
  };
});

describe('PlaudClientResolver new-client flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.id = 1;
    mockUser.role = 'admin';
    mockAuthAxios.get.mockReset();
  });

  it('selects the created client from the create response without depending on a follow-up search', async () => {
    const createClient = vi.fn().mockResolvedValue({
      success: true,
      data: {
        client: {
          id: 99,
          firstName: 'Taylor',
          lastName: 'Reed',
          email: 'taylor@example.com',
        },
      },
    });
    vi.mocked(createAdminClientService).mockReturnValue({
      getClients: vi.fn().mockRejectedValue(new Error('search unavailable')),
      createClient,
      createExternalClient: vi.fn(),
    } as any);
    const onClientResolved = vi.fn();

    render(<PlaudClientResolver onClientResolved={onClientResolved} />);

    fireEvent.click(screen.getByRole('button', { name: /new client/i }));
    await screen.findByRole('dialog', { name: /add new client/i }, { timeout: 5000 });

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Taylor' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Reed' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'taylor@example.com' } });
    fireEvent.change(screen.getByLabelText(/^username/i), { target: { value: 'taylor.reed' } });
    // No password field anymore: new SwanStudios clients get a secure reset
    // link after creation (CreateClientModal strips password from the payload).

    fireEvent.click(screen.getByRole('button', { name: /create client/i }));

    await waitFor(() => {
      expect(onClientResolved).toHaveBeenLastCalledWith(expect.objectContaining({
        id: 99,
        fullName: 'Taylor Reed',
        email: 'taylor@example.com',
      }));
    });
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: /add new client/i })).not.toBeInTheDocument();
  });

  it('loads trainer client search from trainer assignments instead of the admin roster', async () => {
    const getClients = vi.fn().mockRejectedValue(new Error('admin roster unavailable to trainer'));
    vi.mocked(createAdminClientService).mockReturnValue({
      getClients,
      createClient: vi.fn(),
      createExternalClient: vi.fn(),
    } as any);
    mockUser.id = 9001;
    mockUser.role = 'trainer';
    mockAuthAxios.get.mockResolvedValue({
      data: {
        success: true,
        assignments: [
          {
            id: 77,
            client: {
              id: 424242,
              firstName: 'Assigned',
              lastName: 'Client',
              email: 'assigned@example.com',
              clientSource: 'swanstudios',
            },
          },
        ],
      },
    });

    render(<PlaudClientResolver onClientResolved={vi.fn()} />);

    expect(await screen.findByText('Assigned Client')).toBeInTheDocument();
    expect(mockAuthAxios.get).toHaveBeenCalledWith('/api/client-trainer-assignments/trainer/9001');
    expect(getClients).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /new client/i })).not.toBeInTheDocument();
  });
});
