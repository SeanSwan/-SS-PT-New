import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { PlaudIntakeSummary } from '../../../../services/plaudIntakeService';
import CoachIntakeWorkspaceHeader from './CoachIntakeWorkspaceHeader';

function summary(overrides: Partial<PlaudIntakeSummary> = {}): PlaudIntakeSummary {
  return {
    total: 3,
    actionable: 3,
    today: 1,
    unprocessed: 0,
    processing: 0,
    readyReview: 0,
    needsClarification: 0,
    duplicateHold: 0,
    failed: 0,
    needsClient: 0,
    ...overrides,
  };
}

describe('CoachIntakeWorkspaceHeader', () => {
  it('turns the intake header into one obvious next move before secondary actions', () => {
    const onRefresh = vi.fn();

    render(
      <MemoryRouter>
        <CoachIntakeWorkspaceHeader
          clientCopy="No client has to be selected first."
          reviewNextHref="/dashboard/admin/coach-assistant?intake=next"
          workspaceHref="/dashboard/admin/coach-assistant?workspace=plaud"
          scope="needs_client"
          summary={summary({ needsClient: 2, readyReview: 0 })}
          onRefresh={onRefresh}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Next best move')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /resolve client hold/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=next');
    expect(screen.getByText(/confirm the client before any draft can write/i)).toBeInTheDocument();


    expect(screen.queryByRole('button', { name: /ask coach/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh queue/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open plaud/i })).toBeInTheDocument();
  });

  it('groups secondary queue tools after the next move instead of competing as peer CTAs', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspaceHeader
          clientCopy="No client has to be selected first."
          reviewNextHref="/dashboard/admin/coach-assistant?intake=next"
          workspaceHref="/dashboard/admin/coach-assistant?workspace=plaud"
          scope="actionable"
          summary={summary({ readyReview: 2 })}
          onRefresh={vi.fn()}
        />
      </MemoryRouter>,
    );

    const nextMove = screen.getByLabelText('Next best Coach intake move');
    const tools = screen.getByRole('group', { name: 'Queue tools' });

    expect(nextMove.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(tools).getByRole('button', { name: /refresh queue/i })).toBeInTheDocument();
    expect(within(tools).queryByRole('button', { name: /inspect audio/i })).not.toBeInTheDocument();
    expect(within(tools).getByRole('link', { name: /open plaud/i })).toBeInTheDocument();
  });
});
