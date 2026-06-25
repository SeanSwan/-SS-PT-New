import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

vi.mock('./CoachIntakeEventTrail', () => ({
  default: () => null,
}));

function makeQueue({ needsOrderingReview = false, needsClient = false } = {}) {
  const intakeId = '77777777-7777-4777-9777-777777777777';
  return {
    items: [{
      id: `coach:${intakeId}`,
      entityId: intakeId,
      kind: 'coach_intake',
      title: 'Confirmed audio workout note',
      sourceLabel: 'Coach voice note',
      queueStatus: 'ready_review',
      clientName: needsClient ? null : 'Client 12',
      clipCount: 2,
      canReview: true,
      needsClient,
      timelineAt: '2026-05-06T16:30:00.000Z',
      audioPuzzle: {
        pieceCount: 2,
        bundleCount: 1,
        autoBundleCount: 1,
        needsOrderingReview,
        confidence: 'medium',
      },
    }],
    summary: {
      total: 1,
      actionable: 1,
      today: 1,
      unprocessed: 0,
      processing: 0,
      readyReview: 1,
      failed: 0,
      needsClient: needsClient ? 1 : 0,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace draft review bridge', () => {
  it('does not expose a prompt-only draft preparation button after audio order is clear', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          queue={makeQueue()}
          activeIntakeId="77777777-7777-4777-9777-777777777777"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    const ribbon = within(target).getByLabelText('Active item status');
    expect(within(ribbon).getByText(/Prepare draft review/i)).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /prepare draft review/i })).toBeNull();
    expect(within(target).getByRole('link', { name: /^open target$/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=77777777-7777-4777-9777-777777777777');
  });

  it('does not offer draft preparation before audio order is confirmed', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          queue={makeQueue({ needsOrderingReview: true })}
          activeIntakeId="77777777-7777-4777-9777-777777777777"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    expect(within(target).queryByRole('button', { name: /prepare draft review/i })).toBeNull();
    expect(within(target).getByRole('button', { name: /^confirm audio order$/i })).toBeInTheDocument();
  });
});
