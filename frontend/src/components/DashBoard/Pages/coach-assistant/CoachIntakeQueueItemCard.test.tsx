/**
 * CoachIntakeQueueItemCard.test.tsx
 * =================================
 * Locks per-item gate/action visibility in the Coach intake queue.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CoachIntakeQueueItemCard from './CoachIntakeQueueItemCard';

describe('CoachIntakeQueueItemCard', () => {
  it('does not render raw client names from queue metadata', () => {
    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          item={{
            id: 'item-client-safe',
            entityId: 'item-client-safe',
            kind: 'coach_intake',
            source: 'chat_narrative',
            title: 'Marcus private@example.com lower body note',
            sourceLabel: 'private@example.com',
            queueStatus: 'ready_review',
            clientId: 42,
            clientName: 'Marcus private@example.com',
            clipCount: 1,
            canReview: true,
            needsClient: false,
            timelineAt: '2026-05-06T16:30:00.000Z',
          }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByLabelText(/Queue item Long Coach note/i);
    expect(within(card).getByText((content, element) => (
      element?.tagName.toLowerCase() === 'strong' && /Long Coach note/i.test(content)
    ))).toBeInTheDocument();
    expect(within(card).getByText(/Selected client/i)).toBeInTheDocument();
    expect(within(card).queryByText(/Marcus/i)).toBeNull();
    expect(within(card).queryByText(/private@example\.com/i)).toBeNull();
  });

  it('renders gate and next-action chips from backend queue metadata', () => {
    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          queueScope="failed"
          item={{
            id: 'item-1',
            entityId: 'item-1',
            kind: 'coach_intake',
            source: 'voice_note',
            title: 'Morning lower body notes',
            sourceLabel: 'Coach voice note',
            queueStatus: 'ready_review',
            clientName: null,
            clipCount: 1,
            canReview: true,
            needsClient: true,
            timelineAt: '2026-05-06T16:30:00.000Z',
            nextBlockingGate: 'Client confirmation required',
            nextActionLabel: 'Ask Coach to resolve client',
          }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByLabelText(/Queue item Coach voice note/i);
    expect(within(card).getByText(/Client confirmation required/i)).toBeInTheDocument();
    expect(within(card).getByText(/Resolve client hold/i)).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /resolve client/i })).not.toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /review intake Coach voice note/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=item-1&scope=failed');
  });

  it('shows specific safe next-action chips for clarification and duplicate-hold actions without prompt buttons', () => {
    const baseItem = {
      id: 'item-2',
      entityId: 'item-2',
      kind: 'coach_intake' as const,
      source: 'chat_narrative',
      title: 'Evening intake note',
      sourceLabel: 'Long Coach note',
      clientName: null,
      clipCount: 0,
      canReview: false,
      needsClient: false,
      timelineAt: '2026-05-06T16:30:00.000Z',
    };

    const { rerender } = render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          item={{
            ...baseItem,
            queueStatus: 'needs_clarification',
            nextBlockingGate: 'Clarification required',
            nextActionKey: 'answer_clarification',
            nextActionLabel: 'Answer Coach clarification',
            holdReason: {
              label: 'Client confirmation needed',
              detail: 'Raw transcript mentioned private@example.com',
              candidateCount: 2,
              confidenceBand: 'medium',
            },
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Answer Coach clarification/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /answer coach clarification/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review intake Long Coach note/i })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          item={{
            ...baseItem,
            queueStatus: 'duplicate_hold',
            nextBlockingGate: 'Duplicate risk requires review',
            nextActionKey: 'review_duplicate_hold',
            nextActionLabel: 'Review duplicate risk',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Review duplicate risk/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review duplicate risk/i })).not.toBeInTheDocument();
  });
  it('previews safe hold-reason facts without exposing detail text in the queue card', () => {
    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          item={{
            id: 'item-3',
            entityId: 'item-3',
            kind: 'coach_intake',
            source: 'chat_narrative',
            title: 'Client puzzle note',
            sourceLabel: 'Long Coach note',
            queueStatus: 'needs_clarification',
            clientName: null,
            clipCount: 0,
            canReview: false,
            needsClient: false,
            timelineAt: '2026-05-06T16:30:00.000Z',
            nextBlockingGate: 'Clarification required',
            holdReason: {
              label: 'Client confirmation needed',
              detail: 'Raw transcript mentioned private@example.com',
              candidateCount: 2,
              confidenceBand: 'medium',
            },
          }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByLabelText(/Queue item Long Coach note/i);
    expect(within(card).getByLabelText(/Hold reason preview/i)).toBeInTheDocument();
    expect(within(card).getByText(/Client confirmation needed/i)).toBeInTheDocument();
    expect(within(card).getByText(/2 candidates/i)).toBeInTheDocument();
    expect(within(card).getByText(/Medium confidence/i)).toBeInTheDocument();
    expect(within(card).queryByText(/private@example\.com/i)).not.toBeInTheDocument();
  });

  it('does not render arbitrary hold-reason labels from queue metadata', () => {
    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          item={{
            id: 'item-4',
            entityId: 'item-4',
            kind: 'coach_intake',
            source: 'chat_narrative',
            title: 'Unsafe hold reason',
            sourceLabel: 'Long Coach note',
            queueStatus: 'needs_clarification',
            clientName: null,
            clipCount: 0,
            canReview: false,
            needsClient: false,
            timelineAt: '2026-05-06T16:30:00.000Z',
            holdReason: {
              label: 'private@example.com',
              candidateCount: 2,
              confidenceBand: 'medium',
            },
          }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByLabelText(/Queue item Long Coach note/i);
    expect(within(card).queryByLabelText(/Hold reason preview/i)).toBeNull();
    expect(within(card).queryByText(/private@example\.com/i)).toBeNull();
  });

  it('does not render arbitrary gate or action labels from queue metadata', () => {
    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          item={{
            id: 'item-5',
            entityId: 'item-5',
            kind: 'coach_intake',
            source: 'chat_narrative',
            title: 'Unsafe gate action',
            sourceLabel: 'Long Coach note',
            queueStatus: 'needs_clarification',
            clientName: null,
            clipCount: 0,
            canReview: false,
            needsClient: false,
            timelineAt: '2026-05-06T16:30:00.000Z',
            nextBlockingGate: 'Marcus needs private@example.com confirmation',
            nextActionLabel: 'Email Marcus private@example.com',
          }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByLabelText(/Queue item Long Coach note/i);
    expect(within(card).queryByText(/Marcus/i)).toBeNull();
    expect(within(card).queryByText(/private@example\.com/i)).toBeNull();
    expect(within(card).queryByText(/Email Marcus/i)).toBeNull();
    expect(within(card).queryByRole('button')).toBeNull();
  });

  it('does not render arbitrary audio confidence labels from queue metadata', () => {
    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          item={{
            id: 'item-6',
            entityId: 'item-6',
            kind: 'coach_intake',
            source: 'voice_note',
            title: 'Audio intake',
            sourceLabel: 'Voice note',
            queueStatus: 'unprocessed',
            clientName: null,
            clipCount: 2,
            canReview: false,
            needsClient: false,
            timelineAt: '2026-05-06T16:30:00.000Z',
            audioPuzzle: {
              pieceCount: 2,
              bundleCount: 1,
              confidence: 'private@example.com',
              needsOrderingReview: false,
            },
          } as any}
        />
      </MemoryRouter>,
    );

    const card = screen.getByLabelText(/Queue item Coach voice note/i);
    expect(within(card).getByText(/medium confidence/i)).toBeInTheDocument();
    expect(within(card).queryByText(/private@example\.com/i)).toBeNull();
  });
});
