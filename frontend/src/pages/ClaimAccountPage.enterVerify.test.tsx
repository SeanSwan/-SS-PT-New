import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ClaimAccountPage from './ClaimAccountPage';

const renderClaimPage = (initialEntry = '/claim') => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/claim" element={<ClaimAccountPage />} />
      <Route path="/claim/:token" element={<ClaimAccountPage />} />
    </Routes>
  </MemoryRouter>
);

describe('ClaimAccountPage manual invite-code verification', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('verifies the invite code when Enter is pressed before password fields are shown', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: { valid: true, firstName: 'Manual' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderClaimPage();

    await user.type(screen.getByLabelText(/invite code/i), 'SWAN-ABCD1234{Enter}');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/claim/verify/SWAN-ABCD1234');
    });
    expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome,/i).textContent).toContain('Manual');
  });

  it('extracts the invite code from a pasted claim link before verification', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: { valid: true, firstName: 'Pasted' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderClaimPage();

    const inviteInput = screen.getByLabelText(/invite code/i);
    await user.click(inviteInput);
    await user.paste('https://sswanstudios.com/claim/SWAN-ABCD1234');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/claim/verify/SWAN-ABCD1234');
    });
    expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByText(/Welcome,/i).textContent).toContain('Pasted');
  });

  it('auto-verifies a direct claim link and posts the activation payload', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { valid: true, firstName: 'Direct' },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          message: 'Account activated! You can now log in.',
          data: { username: 'direct.client', firstName: 'Direct' },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    renderClaimPage('/claim/SWAN-ABCD1234');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/claim/verify/SWAN-ABCD1234');
    });

    await user.type(await screen.findByLabelText(/email/i), 'direct@example.test');
    await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePassword123!');
    await user.type(screen.getByLabelText(/^confirm password$/i), 'NewSecurePassword123!');
    await user.click(screen.getByRole('button', { name: /activate account/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/claim/activate', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'SWAN-ABCD1234',
          password: 'NewSecurePassword123!',
          email: 'direct@example.test',
        }),
      }));
    });

    expect(await screen.findByRole('heading', { name: /account activated/i })).toBeInTheDocument();
    expect(screen.getByText(/direct.client/i)).toBeInTheDocument();
  });
});
