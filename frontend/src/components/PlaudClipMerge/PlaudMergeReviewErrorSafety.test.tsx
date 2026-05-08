import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaudMergeReview } from './PlaudMergeReview';
import type { PlaudMergeReviewState } from './PlaudMergeWorkspace.types';
import { applyMergeApproval } from './PlaudMergeWorkspace.apply';

vi.mock('./PlaudMergeWorkspace.apply', () => ({
  applyMergeApproval: vi.fn(),
  applyMergeSegmentApproval: vi.fn(),
}));

vi.mock('../../services/plaudMergeService', () => ({
  approveMergeRequest: vi.fn(),
  parseMergeRequestSegment: vi.fn(),
}));

const applyMergeApprovalMock = vi.mocked(applyMergeApproval);

function makeReviewState(): PlaudMergeReviewState {
  return {
    mergeRequestId: '11111111-1111-4111-8111-111111111111',
    clientId: 12,
    clientName: 'Client 12',
    transcript: 'Squat three sets of ten.',
    parsedWorkout: {
      exercises: [
        {
          exerciseName: 'Squat',
          sets: [{ reps: 10, weight: 135 }],
        },
      ],
    },
    dateSplitCandidates: null,
    clipTimeline: [],
    boundaryWarning: null,
    source: 'resume',
  };
}

describe('PlaudMergeReview action error safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not expose arbitrary apply error code or message detail', async () => {
    applyMergeApprovalMock.mockRejectedValue({
      response: {
        data: {
          error: {
            code: 'UNSAFE_BACKEND_DETAIL',
            message: 'do-not-render-private-detail',
          },
        },
      },
    });

    render(
      <PlaudMergeReview
        reviewState={makeReviewState()}
        embedded
        onBack={vi.fn()}
        onApproved={vi.fn()}
      />,
    );

    const approveButton = document.querySelector('[data-plaud-next-action="approve"]');
    expect(approveButton).toBeInstanceOf(HTMLButtonElement);
    fireEvent.click(approveButton as HTMLButtonElement);

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('PLAUD_ERROR');
      expect(alert).toHaveTextContent('Failed to apply workout');
      expect(alert).not.toHaveTextContent('UNSAFE_BACKEND_DETAIL');
      expect(alert).not.toHaveTextContent('do-not-render-private-detail');
    });
  });
});
