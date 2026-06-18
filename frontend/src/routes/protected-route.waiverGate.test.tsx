import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './protected-route';

const authMock = vi.hoisted(() => ({
  value: null as any,
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authMock.value,
}));

vi.mock('@/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function makeAuth(user: Record<string, unknown>) {
  return {
    loading: false,
    isAuthenticated: true,
    user,
    refreshUser: vi.fn(),
    refreshToken: vi.fn(),
    checkPermission: vi.fn(() => true),
  };
}

function renderProtected(path: string, user: Record<string, unknown>) {
  authMock.value = makeAuth(user);

  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard/*"
          element={(
            <ProtectedRoute allowedRoles={['admin', 'trainer', 'client']}>
              <div data-testid="protected">protected dashboard</div>
            </ProtectedRoute>
          )}
        />
        <Route
          path="/user-dashboard/*"
          element={(
            <ProtectedRoute>
              <div data-testid="protected">protected user dashboard</div>
            </ProtectedRoute>
          )}
        />
        <Route path="/waiver" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute waiver mirror', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('redirects an authenticated client without a linked waiver to the waiver page', async () => {
    renderProtected('/dashboard/client/overview', {
      id: '42',
      role: 'client',
      hasLinkedWaiver: false,
      waiverStatus: 'missing',
    });

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/waiver?returnUrl=%2Fdashboard%2Fclient%2Foverview'
    );
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('allows a client with a linked waiver into the dashboard route', () => {
    renderProtected('/dashboard/client/overview', {
      id: '42',
      role: 'client',
      hasLinkedWaiver: true,
    });

    expect(screen.getByTestId('protected')).toHaveTextContent('protected dashboard');
  });

  it('does not redirect when a stale auth payload omits waiver fields', () => {
    renderProtected('/dashboard/client/overview', {
      id: '42',
      role: 'client',
    });

    expect(screen.getByTestId('protected')).toHaveTextContent('protected dashboard');
  });

  it('does not require admin operators to have a client waiver', () => {
    renderProtected('/dashboard/admin/overview', {
      id: '1',
      role: 'admin',
      hasLinkedWaiver: false,
    });

    expect(screen.getByTestId('protected')).toHaveTextContent('protected dashboard');
  });

  it('redirects the owner user-dashboard surface until waiver linkage exists', async () => {
    renderProtected('/user-dashboard/progress', {
      id: '84',
      role: 'user',
      hasLinkedWaiver: false,
      waiverStatus: 'missing',
    });

    expect(await screen.findByTestId('location')).toHaveTextContent(
      '/waiver?returnUrl=%2Fuser-dashboard%2Fprogress'
    );
  });
});
