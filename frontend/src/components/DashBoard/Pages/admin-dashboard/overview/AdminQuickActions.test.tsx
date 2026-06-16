import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { describe, expect, it, vi } from 'vitest';
import AdminQuickActions from './AdminQuickActions';
import { buildAdminOverviewQuickActions } from './AdminOverviewQuickActions.config';

const renderAdminQuickActions = (actions: ReturnType<typeof buildAdminOverviewQuickActions>) =>
  render(
    <ThemeProvider theme={{ colors: { accent: '#60C0F0' } }}>
      <AdminQuickActions actions={actions} />
    </ThemeProvider>,
  );

describe('AdminQuickActions', () => {
  it('turns the first admin controls into one ordered today flow', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const actions = buildAdminOverviewQuickActions(navigate as any);

    renderAdminQuickActions(actions);

    const todayFlow = screen.getByRole('list', { name: /admin today flow/i });
    const steps = within(todayFlow).getAllByRole('listitem');

    expect(steps).toHaveLength(4);
    expect(within(steps[0]).getByText(/step 1/i)).toBeInTheDocument();
    expect(within(steps[0]).getByRole('button', { name: /coach command/i })).toBeInTheDocument();
    expect(within(steps[1]).getByText(/step 2/i)).toBeInTheDocument();
    expect(within(steps[1]).getByRole('button', { name: /log client/i })).toBeInTheDocument();
    expect(within(steps[2]).getByText(/step 3/i)).toBeInTheDocument();
    expect(within(steps[2]).getByRole('button', { name: /my workout/i })).toBeInTheDocument();
    expect(within(steps[3]).getByText(/step 4/i)).toBeInTheDocument();
    expect(within(steps[3]).getByRole('button', { name: /onboard client/i })).toBeInTheDocument();

    await user.click(within(steps[1]).getByRole('button', { name: /log client/i }));
    expect(navigate).toHaveBeenCalledWith('/dashboard/admin/client-management?intent=log_workout');
  });
});
