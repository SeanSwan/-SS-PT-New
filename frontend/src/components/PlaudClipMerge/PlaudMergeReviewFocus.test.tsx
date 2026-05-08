/**
 * PlaudMergeReviewFocus.test.tsx
 * ==============================
 * Locks keyboard and screen-reader orientation for direct PLAUD review links.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaudMergeReview } from './PlaudMergeReview';
import type { PlaudMergeReviewState } from './PlaudMergeWorkspace.types';

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

describe('PlaudMergeReview focus handoff', () => {
  it('scrolls and focuses the review panel after a direct merge review opens', async () => {
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
    const originalFocus = window.HTMLElement.prototype.focus;
    const scrollIntoView = vi.fn();
    const focus = vi.fn();

    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window.HTMLElement.prototype, 'focus', {
      configurable: true,
      value: focus,
    });

    try {
      render(
        <PlaudMergeReview
          reviewState={makeReviewState()}
          embedded
          onBack={vi.fn()}
          onApproved={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
        expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      });

      expect(screen.getByTestId('plaud-merge-review-panel')).toHaveAttribute('tabindex', '-1');
    } finally {
      Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
        configurable: true,
        value: originalScrollIntoView,
      });
      Object.defineProperty(window.HTMLElement.prototype, 'focus', {
        configurable: true,
        value: originalFocus,
      });
    }
  });

  it('shows active merge status, blocking gate, and next action in the review panel', () => {
    const reviewState = {
      ...makeReviewState(),
      clientId: null,
      clientName: null,
    };

    render(
      <PlaudMergeReview
        reviewState={reviewState}
        embedded
        onBack={vi.fn()}
        onApproved={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Active merge status')).toBeInTheDocument();
    expect(screen.getByText('Why this is active')).toBeInTheDocument();
    expect(screen.getByText('Direct review link opened this merge.')).toBeInTheDocument();
    expect(screen.getByText('Time anchor')).toBeInTheDocument();
    expect(screen.getByText('Timeline pending')).toBeInTheDocument();
    expect(screen.getByText('Blocking gate')).toBeInTheDocument();
    expect(screen.getByText('Client must be resolved')).toBeInTheDocument();
    expect(screen.getByText('Next action')).toBeInTheDocument();
    expect(screen.getByText('Return to merge queue')).toBeInTheDocument();
  });

  it('shows upload timeline context in the active status ribbon', () => {
    const reviewState: PlaudMergeReviewState = {
      ...makeReviewState(),
      clipTimeline: [
        {
          mergeStep: 1,
          clipId: 'clip-1',
          filename: 'first.mp3',
          uploadedAt: '2026-05-04T11:00:00.000Z',
          durationSec: 60,
          source: 'manual_upload',
          orderMode: 'uploaded_at_asc',
        },
        {
          mergeStep: 2,
          clipId: 'clip-2',
          filename: 'second.mp3',
          uploadedAt: '2026-05-04T11:30:00.000Z',
          durationSec: 90,
          source: 'manual_upload',
          orderMode: 'uploaded_at_asc',
        },
      ],
    };

    render(
      <PlaudMergeReview
        reviewState={reviewState}
        embedded
        onBack={vi.fn()}
        onApproved={vi.fn()}
      />,
    );

    expect(screen.getByText('Time anchor')).toBeInTheDocument();
    expect(screen.getByText(/Upload timeline: 2 clips/i)).toBeInTheDocument();
  });

  it('focuses the matching PLAUD action from the active status ribbon', () => {
    const onBack = vi.fn();
    const reviewState = {
      ...makeReviewState(),
      clientId: null,
      clientName: null,
    };

    render(
      <PlaudMergeReview
        reviewState={reviewState}
        embedded
        onBack={onBack}
        onApproved={vi.fn()}
      />,
    );

    const ribbon = screen.getByLabelText('Active merge status');
    fireEvent.click(within(ribbon).getByRole('button', { name: /focus next action/i }));

    expect(screen.getByRole('button', { name: /back to merge queue/i })).toHaveFocus();
  });

  it('focuses a date confirmation input when date split review is the blocking gate', () => {
    const reviewState: PlaudMergeReviewState = {
      ...makeReviewState(),
      dateSplitCandidates: {
        referenceDate: '2026-05-07',
        referenceSource: 'recording',
        timeZone: 'America/Los_Angeles',
        segmentCount: 1,
        needsDateReviewCount: 1,
        futureDateBlockedCount: 0,
        segments: [{
          segmentId: 'segment-1',
          segmentIndex: 1,
          date: '2026-05-06',
          dateSource: 'phrase:last_weekday',
          dateConfidence: 'low',
          needsDateConfirmation: true,
          futureDateBlocked: false,
          evidence: 'last Tuesday',
          referenceDate: '2026-05-07',
          referenceSource: 'recording',
          timeZone: 'America/Los_Angeles',
          startLine: 1,
          endLine: 2,
          text: 'Last Tuesday we squatted three sets of ten.',
        }],
      },
    };

    render(
      <PlaudMergeReview
        reviewState={reviewState}
        embedded
        onBack={vi.fn()}
        onApproved={vi.fn()}
      />,
    );

    const ribbon = screen.getByLabelText('Active merge status');
    fireEvent.click(within(ribbon).getByRole('button', { name: /focus next action/i }));

    expect(screen.getByLabelText('Trainer-confirmed date for segment 1')).toHaveFocus();
  });
});
