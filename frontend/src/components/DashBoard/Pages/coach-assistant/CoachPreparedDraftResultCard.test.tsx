import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ExecutionResultCard } from './CoachCommandCards';

describe('Coach prepared draft result card', () => {
  it('renders the prepared draft command as an operator card', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="view_coach_intake_prepared_draft"
          client={null}
          result={{
            hasPreparedDraft: true,
            proposalId: 'proposal-1',
            proposalType: 'workout_log',
            proposalStatus: 'PENDING',
            proposalTitle: 'Review workout draft',
            reviewRoute: '/dashboard/admin/coach-assistant?intake=item-1&proposal=proposal-1',
            nextActionLabel: 'Review prepared draft',
            commandHint: 'Open the active Coach intake dossier and choose Review prepared draft.',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Prepared draft waiting/i)).toBeInTheDocument();
    expect(screen.getByText(/Review workout draft/i)).toBeInTheDocument();
    expect(screen.getByText(/workout log/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open prepared draft/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=item-1&proposal=proposal-1');
    expect(screen.queryByText('proposalId')).toBeNull();
    expect(screen.queryByText('reviewRoute')).toBeNull();
  });

  it('renders a prepare-draft state when no proposal exists yet', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="view_coach_intake_prepared_draft"
          client={null}
          result={{
            hasPreparedDraft: false,
            reviewRoute: '/dashboard/trainer/coach-assistant?intake=item-2',
            nextActionLabel: 'Prepare draft review',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No prepared draft yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Prepare draft review/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/trainer/coach-assistant?intake=item-2');
  });

  it('does not render arbitrary prepared-draft next-action labels', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="view_coach_intake_prepared_draft"
          client={null}
          result={{
            hasPreparedDraft: true,
            reviewRoute: '/dashboard/admin/coach-assistant?intake=item-3&proposal=proposal-3',
            nextActionLabel: 'Email Marcus private@example.com',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Review prepared draft/i)).toBeInTheDocument();
    expect(screen.queryByText(/Marcus/i)).toBeNull();
    expect(screen.queryByText(/private@example\.com/i)).toBeNull();
  });

  it('does not render arbitrary prepared-draft command hints', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="view_coach_intake_prepared_draft"
          client={null}
          result={{
            hasPreparedDraft: true,
            reviewRoute: '/dashboard/admin/coach-assistant?intake=item-4&proposal=proposal-4',
            commandHint: 'Call Marcus at private@example.com before approving this draft.',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Review prepared draft/i)).toBeInTheDocument();
    expect(screen.queryByText(/Marcus/i)).toBeNull();
    expect(screen.queryByText(/private@example\.com/i)).toBeNull();
  });

  it('does not render arbitrary prepared-draft title, type, or status text', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="view_coach_intake_prepared_draft"
          client={null}
          result={{
            hasPreparedDraft: true,
            proposalTitle: 'Call Marcus private@example.com before approving.',
            proposalType: 'private@example.com',
            proposalStatus: 'Email Marcus private@example.com',
            reviewRoute: '/dashboard/admin/coach-assistant?intake=item-5&proposal=proposal-5',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Review Coach proposal/i)).toBeInTheDocument();
    expect(screen.getByText(/Coach Draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs Review/i)).toBeInTheDocument();
    expect(screen.queryByText(/Marcus/i)).toBeNull();
    expect(screen.queryByText(/private@example\.com/i)).toBeNull();
  });
});
