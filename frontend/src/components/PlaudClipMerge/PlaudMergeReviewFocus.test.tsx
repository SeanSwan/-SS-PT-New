/**
 * PlaudMergeReviewFocus.test.tsx
 * ==============================
 * Locks keyboard and screen-reader orientation for direct PLAUD review links.
 */
import { render, screen, waitFor } from '@testing-library/react';
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
});
