import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminClientService } from '../../services/adminClientService';
import { PlaudClientResolver } from './PlaudClientResolver';

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
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'Client123' } });

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
});
