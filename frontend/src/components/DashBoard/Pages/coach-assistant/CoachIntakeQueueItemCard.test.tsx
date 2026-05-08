/**
 * CoachIntakeQueueItemCard.test.tsx
 * =================================
 * Locks per-item gate/action visibility in the Coach intake queue.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeQueueItemCard from './CoachIntakeQueueItemCard';

describe('CoachIntakeQueueItemCard', () => {
  it('renders gate and next-action chips from backend queue metadata', () => {
    const onCommandPrompt = vi.fn();

    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          onCommandPrompt={onCommandPrompt}
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

    const card = screen.getByLabelText(/Queue item Morning lower body notes/i);
    expect(within(card).getByText(/Client confirmation required/i)).toBeInTheDocument();
    expect(within(card).getByText(/Ask Coach to resolve client/i)).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: /ask coach to resolve client/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('review Coach intake item-1');
    expect(within(card).getByRole('link', { name: /review intake morning lower body notes/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=item-1&scope=failed');
  });

  it('sends specific safe prompts for clarification and duplicate-hold actions', () => {
    const onCommandPrompt = vi.fn();
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
          onCommandPrompt={onCommandPrompt}
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

    fireEvent.click(screen.getByRole('button', { name: /answer coach clarification/i }));
    expect(onCommandPrompt).toHaveBeenLastCalledWith(expect.stringContaining('Answer Coach clarification for intake item-2.'));
    expect(onCommandPrompt).toHaveBeenLastCalledWith(expect.stringContaining('Gate reason: Client confirmation needed.'));
    expect(onCommandPrompt).toHaveBeenLastCalledWith(expect.stringContaining('Safe gate facts: 2 candidates, Medium confidence.'));
    expect(onCommandPrompt).toHaveBeenLastCalledWith(expect.not.stringContaining('private@example.com'));
    expect(onCommandPrompt).toHaveBeenLastCalledWith(expect.stringContaining('Do not write, create, update, log, or submit'));

    rerender(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          onCommandPrompt={onCommandPrompt}
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

    fireEvent.click(screen.getByRole('button', { name: /review duplicate risk/i }));
    expect(onCommandPrompt).toHaveBeenLastCalledWith(expect.stringContaining('Review duplicate risk for intake item-2.'));
    expect(onCommandPrompt).toHaveBeenLastCalledWith(expect.stringContaining('Do not write, create, update, log, or submit'));
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

    const card = screen.getByLabelText(/Queue item Client puzzle note/i);
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

    const card = screen.getByLabelText(/Queue item Unsafe hold reason/i);
    expect(within(card).queryByLabelText(/Hold reason preview/i)).toBeNull();
    expect(within(card).queryByText(/private@example\.com/i)).toBeNull();
  });

  it('does not render arbitrary gate or action labels from queue metadata', () => {
    const onCommandPrompt = vi.fn();

    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          onCommandPrompt={onCommandPrompt}
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

    const card = screen.getByLabelText(/Queue item Unsafe gate action/i);
    expect(within(card).queryByText(/Marcus/i)).toBeNull();
    expect(within(card).queryByText(/private@example\.com/i)).toBeNull();
    expect(within(card).queryByText(/Email Marcus/i)).toBeNull();
    expect(within(card).queryByRole('button')).toBeNull();
    expect(onCommandPrompt).not.toHaveBeenCalled();
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

    const card = screen.getByLabelText(/Queue item Audio intake/i);
    expect(within(card).getByText(/medium confidence/i)).toBeInTheDocument();
    expect(within(card).queryByText(/private@example\.com/i)).toBeNull();
  });
});
