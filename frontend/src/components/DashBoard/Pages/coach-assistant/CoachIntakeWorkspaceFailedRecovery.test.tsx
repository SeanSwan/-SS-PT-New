/**
 * CoachIntakeWorkspaceFailedRecovery.test.tsx
 * ===========================================
 * Locks the operator recovery path for failed Coach intake items.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function makeFailedQueue() {
  return {
    items: [{
      id: 'failed-1',
      entityId: 'failed-1',
      kind: 'coach_intake',
      title: 'Failed voice note',
      sourceLabel: 'Coach voice note',
      queueStatus: 'failed',
      clientName: null,
      clipCount: 1,
      canReview: false,
      needsClient: false,
      errorCode: 'TRANSCRIPTION_FAILED',
      timelineAt: '2026-05-06T16:30:00.000Z',
      nextActionKey: 'review_failed_intake',
      nextActionLabel: 'Review failed intake',
    }],
    summary: { total: 1, actionable: 1, today: 0, unprocessed: 0, processing: 0, readyReview: 0, failed: 1, needsClient: 0 },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace failed intake recovery', () => {
  it('routes failed intake recovery to the real target review link without prompt buttons', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=failed-1']}>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          queue={makeFailedQueue()}
          activeIntakeId="failed-1"
        />
      </MemoryRouter>,
    );

    const target = await screen.findByLabelText(/Active review target/i);
    const ribbon = within(target).getByLabelText('Active item status');
    expect(within(ribbon).getByText('Review failed intake')).toBeInTheDocument();
    expect(within(target).queryByRole('button', { name: /^review failed intake$/i })).toBeNull();
    expect(within(target).getByRole('link', { name: /^open target$/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=failed-1');
  });
});
