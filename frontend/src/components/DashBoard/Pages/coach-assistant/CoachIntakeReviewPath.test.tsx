import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CoachIntakeItem } from '../../../../services/coachIntakeService';
import CoachIntakeReviewPath from './CoachIntakeReviewPath';

function makeItem(overrides: Partial<CoachIntakeItem> = {}): CoachIntakeItem {
  return {
    id: 'intake-1',
    entityId: 'intake-1',
    kind: 'coach_intake',
    source: 'audio_upload',
    title: 'Marcus private@example.com lower body note',
    sourceLabel: 'private@example.com',
    queueStatus: 'ready_review',
    clientId: null,
    clientName: 'Marcus private@example.com',
    clipCount: 2,
    canReview: true,
    needsClient: true,
    timelineAt: '2026-05-06T16:30:00.000Z',
    audioPuzzle: {
      pieceCount: 2,
      bundleCount: 1,
      needsOrderingReview: true,
      confidence: 'low',
    },
    ...overrides,
  } as CoachIntakeItem;
}

describe('CoachIntakeReviewPath', () => {
  it('shows a three-step trainer path without exposing raw intake text', () => {
    render(<CoachIntakeReviewPath item={makeItem()} />);

    const path = screen.getByRole('region', { name: /intake review path/i });

    expect(within(path).getByText('1')).toBeInTheDocument();
    expect(within(path).getByText('2')).toBeInTheDocument();
    expect(within(path).getByText('3')).toBeInTheDocument();
    expect(within(path).getByText(/Verify first/i)).toBeInTheDocument();
    expect(within(path).getByText(/Use next action/i)).toBeInTheDocument();
    expect(within(path).getByText(/Approval gate/i)).toBeInTheDocument();
    expect(within(path).getByText(/Client check still needs confirmation/i)).toBeInTheDocument();
    expect(within(path).getByText(/Audio order needs review/i)).toBeInTheDocument();
    expect(within(path).getByText(/Confirm audio order/i)).toBeInTheDocument();
    expect(within(path).getByText(/Write stays locked/i)).toBeInTheDocument();
    expect(within(path).queryByText(/Marcus/i)).toBeNull();
    expect(within(path).queryByText(/private@example\.com/i)).toBeNull();
  });

  it('moves the path forward when the draft is ready for approval', () => {
    render(
      <CoachIntakeReviewPath
        item={makeItem({
          needsClient: false,
          latestProposalId: 'proposal-1',
          latestProposal: {
            id: 'proposal-1',
            type: 'workout_log',
            status: 'READY',
            title: 'Draft',
            createdAt: '2026-05-06T16:40:00.000Z',
          },
          audioPuzzle: {
            pieceCount: 1,
            bundleCount: 1,
            needsOrderingReview: false,
            confidence: 'high',
          },
        })}
      />,
    );

    const path = screen.getByRole('region', { name: /intake review path/i });

    expect(within(path).getByText(/Client check is pending|Client check is complete/i)).toBeInTheDocument();
    expect(within(path).getByText(/Review prepared draft/i)).toBeInTheDocument();
    expect(within(path).getByText(/Prepared draft is waiting/i)).toBeInTheDocument();
  });
});
