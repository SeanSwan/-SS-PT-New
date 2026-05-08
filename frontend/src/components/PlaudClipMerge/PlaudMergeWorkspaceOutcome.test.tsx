/**
 * PlaudMergeWorkspaceOutcome.test.tsx
 * ===================================
 * Locks focus handoff for the PLAUD post-approval success receipt.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaudMergeWorkspace } from './PlaudMergeWorkspace';

vi.mock('./PlaudClipMergePanel', () => ({ PlaudClipMergePanel: () => null }));
vi.mock('./PlaudPendingReviewsList', () => ({ PlaudPendingReviewsList: () => null }));
vi.mock('./PlaudMergeReview', () => ({
  PlaudMergeReview: ({ onApproved }: { onApproved: (state: unknown) => void }) => (
    <button type="button" onClick={() => onApproved({ workoutId: 99, mergeMarkedApproved: true })}>
      Mock approve merge
    </button>
  ),
}));
vi.mock('../../services/plaudMergeService', () => ({
  getMergeRequest: vi.fn().mockResolvedValue({
    mergeRequest: {
      mergeRequestId: '11111111-1111-4111-8111-111111111111',
      clientId: 12,
      clientName: 'Client 12',
      transcript: 'Squat three sets of ten.',
      parsedWorkout: { exercises: [{ exerciseName: 'Squat', sets: [{ reps: 10 }] }] },
      dateSplitCandidates: null,
      clipTimeline: [],
      boundaryWarning: null,
    },
  }),
}));

describe('PlaudMergeWorkspace outcome receipt', () => {
  it('focuses the success receipt after a merge approval completes', async () => {
    render(<PlaudMergeWorkspace embedded initialReviewMergeRequestId="11111111-1111-4111-8111-111111111111" />);

    fireEvent.click(await screen.findByRole('button', { name: /mock approve merge/i }));

    await waitFor(() => {
      const receipt = screen.getByRole('status');
      expect(receipt).toHaveTextContent('Workout logged successfully.');
      expect(receipt).toHaveFocus();
    });
  });
});
