/**
 * coachIntakeQueueOrdering.test.mjs
 * =================================
 * Regression locks for shared unified Coach/PLAUD intake worklist ordering.
 */
import { describe, expect, it } from 'vitest';

import {
  pickNextCoachIntakeItem,
  sortCoachIntakeReviewOrder,
} from '../../services/coachIntakeQueueOrdering.mjs';

describe('coachIntakeQueueOrdering', () => {
  it('puts ready review items ahead of newer unprocessed items', () => {
    const items = [
      {
        id: 'coach:new-unprocessed',
        kind: 'coach_intake',
        queueStatus: 'unprocessed',
        createdAt: '2026-05-07T18:30:00.000Z',
      },
      {
        id: 'coach:old-ready',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        canReview: true,
        recordedAt: '2026-05-06T16:30:00.000Z',
        createdAt: '2026-05-07T19:00:00.000Z',
      },
    ];

    expect(sortCoachIntakeReviewOrder(items).map((item) => item.id)).toEqual([
      'coach:old-ready',
      'coach:new-unprocessed',
    ]);
  });

  it('uses recording time before created time inside the same priority bucket', () => {
    const items = [
      {
        id: 'merge:newer-created-old-recording',
        kind: 'merge_request',
        queueStatus: 'ready_review',
        canReview: true,
        recordedAt: '2026-05-05T12:00:00.000Z',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
      {
        id: 'coach:older-created-new-recording',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        canReview: true,
        recordedAt: '2026-05-06T12:00:00.000Z',
        createdAt: '2026-05-05T12:00:00.000Z',
      },
    ];

    expect(pickNextCoachIntakeItem(items)?.id).toBe('merge:newer-created-old-recording');
  });

  it('does not pick archived items as review-next targets', () => {
    const items = [
      {
        id: 'coach:archived-ready',
        kind: 'coach_intake',
        queueStatus: 'archived',
        canReview: true,
        createdAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'coach:needs-client',
        kind: 'coach_intake',
        queueStatus: 'needs_client',
        createdAt: '2026-05-02T12:00:00.000Z',
      },
    ];

    expect(pickNextCoachIntakeItem(items)?.id).toBe('coach:needs-client');
  });
});
