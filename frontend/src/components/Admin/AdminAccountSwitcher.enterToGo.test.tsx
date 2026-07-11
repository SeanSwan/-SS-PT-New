import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mocks (declared before importing the component under test) ---
const getMock = vi.fn();
const postMock = vi.fn();
vi.mock('../../services/api.service', () => ({
  default: { get: (...a: any[]) => getMock(...a), post: (...a: any[]) => postMock(...a) },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'admin' } }),
}));
const startSessionMock = vi.fn();
vi.mock('../../utils/adminImpersonationSession', () => ({
  isAdminImpersonationActive: () => false,
  startAdminImpersonationSession: (...a: any[]) => startSessionMock(...a),
  getDashboardPathForImpersonatedRole: () => '/dashboard/client',
}));
vi.mock('./AdminAccountCommandPanel', () => ({ default: () => null }));

import AdminAccountSwitcher from './AdminAccountSwitcher';

const target = {
  id: 501,
  displayName: 'Jane Client',
  email: 'jane@example.test',
  role: 'client',
  accountStatus: 'active',
  isActive: true,
  isLocked: false,
  canImpersonate: true,
};

describe('AdminAccountSwitcher — Enter-to-go fast path', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    startSessionMock.mockReset();
    getMock.mockImplementation((url: string) => {
      if (url.includes('/accounts/access')) {
        return Promise.resolve({ data: { accountControl: { canListTargets: true, canRunCommands: true } } });
      }
      if (url.includes('/accounts/targets')) {
        return Promise.resolve({ data: { targets: [target] } });
      }
      return Promise.resolve({ data: {} });
    });
    postMock.mockResolvedValue({ data: { impersonation: { actorRole: 'admin' } } });
    // jsdom navigation is not implemented — stub assign
    Object.defineProperty(window, 'location', {
      value: { ...window.location, assign: vi.fn() },
      writable: true,
    });
  });

  it('starts an impersonation session when Enter is pressed with a valid target selected', async () => {
    render(<AdminAccountSwitcher />);

    // wait for owner-gate check + target load to enable the action
    const openButton = await screen.findByRole('button', { name: /start test session as jane client/i });
    await waitFor(() => expect(openButton).not.toBeDisabled());

    fireEvent.keyDown(screen.getByLabelText(/find/i), { key: 'Enter' });

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    expect(postMock).toHaveBeenCalledWith('/api/auth/admin/impersonation/start', { targetUserId: 501 });
    expect(startSessionMock).toHaveBeenCalledTimes(1);
  });

  it('does not start a session on Enter while the owner gate is unconfigured', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.includes('/accounts/access')) {
        return Promise.resolve({ data: { accountControl: { code: 'OWNER_GATE_NOT_CONFIGURED' } } });
      }
      return Promise.resolve({ data: { targets: [] } });
    });

    render(<AdminAccountSwitcher />);
    await screen.findByText(/owner allowlist is missing/i);

    fireEvent.keyDown(screen.getByLabelText(/find/i), { key: 'Enter' });
    // give any stray async a tick
    await Promise.resolve();
    expect(postMock).not.toHaveBeenCalled();
  });
});
