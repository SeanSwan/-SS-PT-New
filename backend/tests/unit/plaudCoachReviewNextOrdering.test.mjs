/**
 * plaudCoachReviewNextOrdering.test.mjs
 * =====================================
 * Focused queue-ordering locks for the Swan Coach "review next PLAUD intake"
 * command. The broad Phase 6 action test file is at the project line cap, so
 * this file keeps the hostile-review fix isolated.
 */
import { describe, expect, it } from 'vitest';

import { _internal } from '../../services/ai/dispatchers/plaudDispatchers.mjs';

describe('PLAUD Coach review-next ordering', () => {
  it('picks the oldest actionable item within the same priority bucket', () => {
    const next = _internal.pickNextItem([
      {
        id: 'merge:newer-ready',
        queueStatus: 'ready_review',
        canReview: true,
        createdAt: '2026-05-05T18:00:00.000Z',
      },
      {
        id: 'merge:older-ready',
        queueStatus: 'ready_review',
        canReview: true,
        createdAt: '2026-05-05T12:00:00.000Z',
      },
    ]);

    expect(next?.id).toBe('merge:older-ready');
  });

  it('uses recording timeline before upload creation time for queue aging', () => {
    const next = _internal.pickNextItem([
      {
        id: 'clip:uploaded-first',
        queueStatus: 'unprocessed',
        canReview: false,
        timelineAt: '2026-05-05T17:00:00.000Z',
        createdAt: '2026-05-05T12:00:00.000Z',
      },
      {
        id: 'clip:recorded-first',
        queueStatus: 'unprocessed',
        canReview: false,
        recordedAt: '2026-05-05T11:00:00.000Z',
        createdAt: '2026-05-05T18:00:00.000Z',
      },
    ]);

    expect(next?.id).toBe('clip:recorded-first');
  });

  it('still prioritizes ready review over older unprocessed clips', () => {
    const next = _internal.pickNextItem([
      {
        id: 'clip:old-unprocessed',
        queueStatus: 'unprocessed',
        canReview: false,
        createdAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'merge:ready',
        queueStatus: 'ready_review',
        canReview: true,
        createdAt: '2026-05-05T12:00:00.000Z',
      },
    ]);

    expect(next?.id).toBe('merge:ready');
  });

  it('does not emit direct merge review routes for malformed entity ids', () => {
    const item = {
      id: 'merge:malformed',
      kind: 'merge_request',
      queueStatus: 'ready_review',
      canReview: true,
      entityId: '------------------------------------',
    };

    expect(_internal.reviewRouteForItem(item, '/dashboard/admin/plaud')).toBe('/dashboard/admin/plaud?review=next');
    expect(_internal.summaryEntityIdForItem(item)).toBeNull();
  });
});
