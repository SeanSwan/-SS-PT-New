import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClientHubGridSection from './ClientHubGridSection';
import type { ClientOption } from './ClientSelectorDropdown';

const client = (overrides: Partial<ClientOption>): ClientOption => ({
  id: 1,
  firstName: 'Roster',
  lastName: 'Client',
  email: 'roster.client@example.test',
  clientSource: 'swanstudios',
  availableSessions: 5,
  workoutCount: 2,
  ...overrides,
});

const roster: ClientOption[] = [
  client({ id: 1, firstName: 'Active', lastName: 'Alpha' }),
  client({ id: 2, firstName: 'Stub', lastName: 'Bravo', accountStatus: 'stub' }),
  client({ id: 3, firstName: 'Gone', lastName: 'Charlie', isActive: false }),
];

describe('ClientHubGridSection', () => {
  it('shows every client with live status counts by default', () => {
    render(
      <ClientHubGridSection
        clients={roster}
        onSelectClient={vi.fn()}
        onClientCardQuickAction={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /open active alpha/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open stub bravo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open gone charlie/i })).toBeInTheDocument();

    const filterBar = screen.getByRole('group', { name: /filter clients by status/i });
    expect(within(filterBar).getByRole('button', { name: /^all/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(filterBar).getByLabelText('3 all clients')).toBeInTheDocument();
    expect(within(filterBar).getByLabelText('2 active clients')).toBeInTheDocument();
    expect(within(filterBar).getByLabelText('1 deactivated clients')).toBeInTheDocument();
    expect(within(filterBar).getByLabelText('1 unclaimed clients')).toBeInTheDocument();
  });

  it('filters the grid to deactivated clients on chip press', async () => {
    const user = userEvent.setup();
    render(
      <ClientHubGridSection
        clients={roster}
        onSelectClient={vi.fn()}
        onClientCardQuickAction={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /deactivated/i }));

    expect(screen.getByRole('button', { name: /open gone charlie/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open active alpha/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deactivated/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides zero-count lifecycle chips (invited absent from this roster)', () => {
    render(
      <ClientHubGridSection
        clients={roster}
        onSelectClient={vi.fn()}
        onClientCardQuickAction={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /invited/i })).not.toBeInTheDocument();
  });

  it('keeps one-tap card quick actions working through the section', async () => {
    const user = userEvent.setup();
    const onQuickAction = vi.fn();
    render(
      <ClientHubGridSection
        clients={roster}
        onSelectClient={vi.fn()}
        onClientCardQuickAction={onQuickAction}
      />
    );

    await user.click(screen.getByRole('button', { name: /log active alpha workout/i }));

    expect(onQuickAction).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'log');
  });
});
