/**
 * CoachIntakeQueueItemCard.primaryAction.test.tsx
 * =================================================
 * Locks the queue row to one obvious first action for short-attention operators.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CoachIntakeQueueItemCard from './CoachIntakeQueueItemCard';

describe('CoachIntakeQueueItemCard primary action flow', () => {
  it('keeps the direct review link as the only queue-row action control', () => {
    render(
      <MemoryRouter>
        <CoachIntakeQueueItemCard
          active={false}
          coachWorkspaceHref="/dashboard/admin/coach-assistant"
          queueScope="actionable"
          item={{
            id: 'item-primary',
            entityId: 'item-primary',
            kind: 'coach_intake',
            source: 'voice_note',
            title: 'Morning lower body notes',
            sourceLabel: 'Coach voice note',
            queueStatus: 'ready_review',
            clientName: null,
            clipCount: 1,
            canReview: true,
            needsClient: false,
            timelineAt: '2026-05-06T16:30:00.000Z',
            nextActionLabel: 'Ask Coach to resolve client',
          }}
        />
      </MemoryRouter>,
    );

    const card = screen.getByLabelText(/Queue item Coach voice note/i);
    const actions = within(card).getByLabelText('Queue item next actions');
    const controls = Array.from(actions.querySelectorAll('a, button'));
    expect(controls).toHaveLength(1);
    expect(controls[0]).toHaveAccessibleName(/review intake Coach voice note/i);
    expect(within(card).getByText(/Resolve client hold/i)).toBeInTheDocument();
  });
});
