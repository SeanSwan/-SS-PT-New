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
});
