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

  it('puts prepared pending drafts ahead of ready items that still need draft preparation', () => {
    const items = [
      {
        id: 'coach:old-ready-without-draft',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        canReview: true,
        recordedAt: '2026-05-05T12:00:00.000Z',
        createdAt: '2026-05-05T12:00:00.000Z',
      },
      {
        id: 'coach:newer-prepared-draft',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        canReview: true,
        latestProposalId: 'proposal-1',
        latestProposal: { status: 'PENDING' },
        recordedAt: '2026-05-06T12:00:00.000Z',
        createdAt: '2026-05-06T12:00:00.000Z',
      },
    ];

    expect(sortCoachIntakeReviewOrder(items).map((item) => item.id)).toEqual([
      'coach:newer-prepared-draft',
      'coach:old-ready-without-draft',
    ]);
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

  it('does not elevate terminal proposal statuses above reviewable items', () => {
    const items = [
      {
        id: 'coach:applied-proposal',
        kind: 'coach_intake',
        queueStatus: 'unprocessed',
        latestProposalId: 'proposal-applied',
        latestProposal: { status: 'APPLIED' },
        createdAt: '2026-05-04T12:00:00.000Z',
      },
      {
        id: 'coach:ready-review',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        canReview: true,
        createdAt: '2026-05-06T12:00:00.000Z',
      },
    ];

    expect(pickNextCoachIntakeItem(items)?.id).toBe('coach:ready-review');
  });

  it('does not elevate failed items with stale proposal metadata', () => {
    const items = [
      {
        id: 'coach:failed-with-proposal',
        kind: 'coach_intake',
        queueStatus: 'failed',
        latestProposalId: 'proposal-stale',
        latestProposal: { status: 'PENDING' },
        createdAt: '2026-05-04T12:00:00.000Z',
      },
      {
        id: 'coach:unprocessed',
        kind: 'coach_intake',
        queueStatus: 'unprocessed',
        createdAt: '2026-05-06T12:00:00.000Z',
      },
    ];

    expect(pickNextCoachIntakeItem(items)?.id).toBe('coach:unprocessed');
  });

  it('prioritizes explicit clarification and duplicate-hold gates before generic unprocessed intake', () => {
    const items = [
      {
        id: 'coach:generic-unprocessed',
        kind: 'coach_intake',
        queueStatus: 'unprocessed',
        createdAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'coach:duplicate-hold',
        kind: 'coach_intake',
        queueStatus: 'duplicate_hold',
        createdAt: '2026-05-02T12:00:00.000Z',
      },
      {
        id: 'coach:needs-clarification',
        kind: 'coach_intake',
        queueStatus: 'needs_clarification',
        createdAt: '2026-05-03T12:00:00.000Z',
      },
    ];

    expect(sortCoachIntakeReviewOrder(items).map((item) => item.id)).toEqual([
      'coach:needs-clarification',
      'coach:duplicate-hold',
      'coach:generic-unprocessed',
    ]);
  });

  it('does not promote duplicate holds ahead of gate buckets just because a draft exists', () => {
    const items = [
      {
        id: 'coach:ready-review',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        createdAt: '2026-05-03T12:00:00.000Z',
        latestProposalId: 'proposal-ready',
        latestProposal: { status: 'PENDING' },
      },
      {
        id: 'coach:duplicate-hold',
        kind: 'coach_intake',
        queueStatus: 'duplicate_hold',
        createdAt: '2026-05-01T12:00:00.000Z',
        latestProposalId: 'proposal-held',
        latestProposal: { status: 'PENDING' },
      },
      {
        id: 'coach:needs-clarification',
        kind: 'coach_intake',
        queueStatus: 'needs_clarification',
        createdAt: '2026-05-02T12:00:00.000Z',
        latestProposalId: 'proposal-clarify',
        latestProposal: { status: 'PENDING' },
      },
    ];

    expect(sortCoachIntakeReviewOrder(items).map((item) => item.id)).toEqual([
      'coach:ready-review',
      'coach:needs-clarification',
      'coach:duplicate-hold',
    ]);
  });
});
