import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  getValidatedToken: vi.fn(),
  storeToken: vi.fn(),
  handleTokenError: vi.fn(),
  cleanupAllTokens: vi.fn(),
  getToken: vi.fn(),
  getRefreshToken: vi.fn(),
  isTokenExpired: vi.fn(),
  refreshAccessToken: vi.fn(),
  setAuthToken: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: () => null,
}));

vi.mock('../services/api.service', () => ({
  default: {
    get: mocks.apiGet,
    setAuthToken: mocks.setAuthToken,
    post: vi.fn(),
  },
  ProductionTokenManager: {
    getToken: mocks.getToken,
    getRefreshToken: mocks.getRefreshToken,
    isTokenExpired: mocks.isTokenExpired,
    refreshAccessToken: mocks.refreshAccessToken,
  },
}));

vi.mock('../utils/tokenCleanup', () => ({
  default: {
    getValidatedToken: mocks.getValidatedToken,
    storeToken: mocks.storeToken,
    handleTokenError: mocks.handleTokenError,
    cleanupAllTokens: mocks.cleanupAllTokens,
  },
}));

vi.mock('../services/client-progress-service', () => ({
  createClientProgressService: () => ({}),
}));

vi.mock('../services/exercise-service', () => ({
  createExerciseService: () => ({}),
}));

vi.mock('../services/adminClientService', () => ({
  createAdminClientService: () => ({}),
}));

vi.mock('../services/session-service', () => ({
  default: {},
}));

vi.mock('../hooks/useBackendConnection', () => ({
  useBackendConnection: () => ({}),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
  },
}));

const Probe = () => {
  const { user, loading } = useAuth();

  if (loading) return <div data-testid="auth-state">loading</div>;
  return <div data-testid="auth-state">{user?.role ?? 'guest'}</div>;
};

describe('AuthProvider session refresh on boot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.getToken.mockReturnValue('expired-access-token');
    mocks.getRefreshToken.mockReturnValue('valid-refresh-token');
    mocks.isTokenExpired.mockReturnValue(true);
    mocks.refreshAccessToken.mockResolvedValue('fresh-access-token');
    mocks.getValidatedToken
      .mockReturnValueOnce(null)
      .mockReturnValue('fresh-access-token');
    mocks.storeToken.mockReturnValue(true);
    mocks.apiGet.mockResolvedValue({
      data: {
        user: {
          id: '42',
          email: 'client@example.test',
          username: 'client',
          firstName: 'Client',
          lastName: 'Example',
          role: 'client',
          isActive: true,
          createdAt: '2026-06-09T00:00:00.000Z',
          updatedAt: '2026-06-09T00:00:00.000Z',
        },
      },
    });
  });

  it('refreshes an expired access token before restoring the authenticated user', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('client');
    });

    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.storeToken).toHaveBeenCalledWith('fresh-access-token');
    expect(mocks.setAuthToken).toHaveBeenCalledWith('fresh-access-token');
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/auth/me');
    expect(mocks.cleanupAllTokens).not.toHaveBeenCalled();
  });
});
