import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMock = vi.hoisted(() => ({
  user: { id: '42', role: 'admin' as string },
  isAuthenticated: true,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: authMock.user,
    isAuthenticated: authMock.isAuthenticated,
  }),
}));

vi.mock('../UniversalMasterSchedule/UniversalMasterSchedule', () => ({
  default: ({ mode, userId }: { mode: string; userId?: string | number }) => (
    <div data-testid="resolved-schedule" data-mode={mode} data-user-id={userId}>
      Schedule mode: {mode}
    </div>
  ),
}));

import UniversalSchedule from './UniversalSchedule';

const renderAt = (path: string, props?: React.ComponentProps<typeof UniversalSchedule>) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <UniversalSchedule {...props} />
    </MemoryRouter>
  );

describe('UniversalSchedule mode resolution', () => {
  beforeEach(() => {
    authMock.user = { id: '42', role: 'admin' };
    authMock.isAuthenticated = true;
  });

  it('keeps an explicit mode prop authoritative for legacy wrapper tabs', () => {
    renderAt('/anywhere', { mode: 'trainer' });

    expect(screen.getByTestId('resolved-schedule')).toHaveAttribute('data-mode', 'trainer');
  });

  it('uses the dashboard URL role for admin view-as schedule surfaces', () => {
    renderAt('/dashboard/trainer/schedule');

    expect(screen.getByTestId('resolved-schedule')).toHaveAttribute('data-mode', 'trainer');
  });

  it('allows trainer view-as-client schedule surfaces to resolve as client mode', () => {
    authMock.user = { id: '77', role: 'trainer' };

    renderAt('/dashboard/client/schedule');

    expect(screen.getByTestId('resolved-schedule')).toHaveAttribute('data-mode', 'client');
  });

  it('normalizes DB role user to the client schedule mode', () => {
    authMock.user = { id: '155', role: 'user' };

    renderAt('/dashboard/client/schedule');

    expect(screen.getByTestId('resolved-schedule')).toHaveAttribute('data-mode', 'client');
  });

  it('fails closed for authenticated roles outside the dashboard contract', () => {
    authMock.user = { id: '88', role: 'support' };

    renderAt('/dashboard/support/schedule');

    expect(screen.getByText(/schedule access requires a paid or authorized role/i)).toBeInTheDocument();
  });

  it('keeps unauthenticated users out of the schedule surface', () => {
    authMock.isAuthenticated = false;

    renderAt('/dashboard/client/schedule');

    expect(screen.getByText(/schedule access requires login/i)).toBeInTheDocument();
  });
});
