import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';

function makeQueue() {
  const readyItem = {
    id: 'ready-1',
    entityId: 'ready-1',
    kind: 'coach_intake',
    source: 'voice_note',
    title: 'Ready lower body draft',
    sourceLabel: 'Coach voice note',
    queueStatus: 'ready_review',
    clientName: null,
    canReview: true,
    needsClient: false,
    timelineAt: '2026-05-06T16:30:00.000Z',
    latestProposalId: 'proposal-ready-1',
  };

  return {
    items: [
      {
        ...readyItem,
        id: 'newer-unprocessed',
        entityId: 'newer-unprocessed',
        title: 'Newer unprocessed note',
        queueStatus: 'unprocessed',
        canReview: false,
        latestProposalId: null,
        timelineAt: '2026-05-07T16:30:00.000Z',
      },
      readyItem,
    ],
    summary: {
      total: 2,
      actionable: 1,
      today: 0,
      unprocessed: 1,
      processing: 0,
      readyReview: 1,
      failed: 0,
      needsClient: 0,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace automatic target staging', () => {
  it('surfaces the highest-priority intake dossier without requiring a first review click', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          queue={makeQueue()}
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    expect(within(target).getByRole('heading', { name: /Coach voice note/i })).toBeInTheDocument();
    expect(within(target).getByRole('button', { name: /^review prepared draft$/i })).toBeInTheDocument();
    const queueCards = screen.getAllByLabelText(/Queue item Coach voice note/i);
    const selectedCards = queueCards.filter((card) => card.getAttribute('aria-current') === 'true');

    expect(queueCards).toHaveLength(2);
    expect(selectedCards).toHaveLength(1);
    expect(selectedCards[0]).toHaveTextContent(/Ready Review/i);
    expect(queueCards.find((card) => card !== selectedCards[0])).toHaveTextContent(/Unprocessed/i);
  });
});
