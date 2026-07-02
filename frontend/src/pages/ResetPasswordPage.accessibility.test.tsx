import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import apiService from '../services/api.service';
import ResetPasswordPage from './ResetPasswordPage';

vi.mock('../services/api.service', () => ({
  default: {
    post: vi.fn(),
  },
}));

const apiServiceMock = vi.mocked(apiService);

const renderResetPasswordPage = () => render(
  <MemoryRouter initialEntries={['/reset-password/raw-token']}>
    <Routes>
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/login" element={<div>Login route</div>} />
    </Routes>
  </MemoryRouter>
);

beforeEach(() => {
  apiServiceMock.post.mockReset();
});

describe('ResetPasswordPage accessibility', () => {
  it('labels password fields and provides keyboard-accessible login navigation', async () => {
    const user = userEvent.setup();

    renderResetPasswordPage();

    expect(screen.getByLabelText(/^new password$/i)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(/^confirm new password$/i)).toHaveAttribute('autocomplete', 'new-password');

    await user.click(screen.getByRole('button', { name: /back to login/i }));

    expect(await screen.findByText(/login route/i)).toBeInTheDocument();
  });

  it('submits the reset token and strong password to the backend reset endpoint', async () => {
    const user = userEvent.setup();
    apiServiceMock.post.mockResolvedValueOnce({ data: { success: true } });

    renderResetPasswordPage();

    await user.type(screen.getByLabelText(/^new password$/i), 'NewSecurePassword123!');
    await user.type(screen.getByLabelText(/^confirm new password$/i), 'NewSecurePassword123!');
    await user.click(screen.getByRole('button', { name: /^reset password$/i }));

    await waitFor(() => {
      expect(apiServiceMock.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'raw-token',
        newPassword: 'NewSecurePassword123!',
      });
    });

    expect(await screen.findByText(/password has been reset successfully/i)).toBeInTheDocument();
  });

  it('keeps weak or mismatched activation passwords from reaching the reset API', async () => {
    const user = userEvent.setup();

    renderResetPasswordPage();

    const newPassword = screen.getByLabelText(/^new password$/i);
    const confirmPassword = screen.getByLabelText(/^confirm new password$/i);
    const submit = screen.getByRole('button', { name: /^reset password$/i });

    await user.type(newPassword, 'Weakpass1');
    await user.type(confirmPassword, 'Weakpass1');

    expect(submit).toBeDisabled();
    expect(apiServiceMock.post).not.toHaveBeenCalled();

    await user.clear(newPassword);
    await user.clear(confirmPassword);
    await user.type(newPassword, 'NewSecurePassword123!');
    await user.type(confirmPassword, 'DifferentPassword123!');

    expect(submit).toBeDisabled();
    expect(apiServiceMock.post).not.toHaveBeenCalled();
  });
});