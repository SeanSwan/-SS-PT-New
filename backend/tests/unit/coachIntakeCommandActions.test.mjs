/**
 * coachIntakeCommandActions.test.mjs
 * ==================================
 * Regression locks for unified Swan Coach intake commands. These commands
 * operate across Coach-created intake drafts plus PLAUD queue items without
 * exposing transcript bodies or client names to AI command result cards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(),
}));

import { listUnifiedCoachIntakeItems } from '../../services/coachIntakeItemService.mjs';
import {
  dispatchReviewNextCoachIntake,
  dispatchViewCoachIntakeQueue,
  _internal,
} from '../../services/ai/dispatchers/coachIntakeDispatchers.mjs';

describe('Unified Coach intake dispatcher behavior', () => {
  const sequelizeOverride = { query: vi.fn() };

  beforeEach(() => {
    vi.mocked(listUnifiedCoachIntakeItems).mockReset();
  });

  it('returns a flat unified queue summary without transcripts or client names', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 10,
      schemaReady: true,
      summary: {
        total: 3,
        actionable: 3,
        today: 2,
        unprocessed: 1,
        processing: 0,
        readyReview: 1,
        failed: 0,
        needsClient: 1,
      },
      items: [
        {
          id: 'coach:11111111-1111-1111-1111-111111111111',
          entityId: '11111111-1111-1111-1111-111111111111',
          kind: 'coach_intake',
          queueStatus: 'ready_review',
          canReview: true,
          clientName: 'Do Not Return',
          transcript: 'Do Not Return',
          createdAt: '2026-05-05T12:00:00.000Z',
        },
      ],
    });

    const result = await dispatchViewCoachIntakeQueue(
      { scope: 'actionable', limit: 10 },
      { user: { id: 42, role: 'admin' }, options: { sequelize: sequelizeOverride } },
    );

    expect(listUnifiedCoachIntakeItems).toHaveBeenCalledWith({
      userId: 42,
      scope: 'actionable',
      limit: 10,
      sequelizeOverride,
    });
    expect(result).toMatchObject({
      total: 3,
      actionable: 3,
      today: 2,
      unprocessed: 1,
      readyReview: 1,
      needsClient: 1,
      nextKind: 'coach_intake',
      nextCanReview: true,
      queueRoute: '/dashboard/admin/coach-assistant',
      reviewRoute: '/dashboard/admin/coach-assistant?intake=11111111-1111-1111-1111-111111111111',
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|clientName|transcript/i);
  });

  it('routes reviewable PLAUD merge requests to the PLAUD review workspace', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 20,
      schemaReady: true,
      summary: {
        total: 1,
        actionable: 1,
        today: 1,
        unprocessed: 0,
        processing: 0,
        readyReview: 1,
        failed: 0,
        needsClient: 0,
      },
      items: [
        {
          id: 'merge:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          entityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          kind: 'merge_request',
          queueStatus: 'ready_review',
          canReview: true,
          createdAt: '2026-05-05T12:00:00.000Z',
        },
      ],
    });

    const result = await dispatchReviewNextCoachIntake(
      {},
      { user: { id: 7, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    );

    expect(result).toMatchObject({
      nextKind: 'merge_request',
      nextEntityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      queueRoute: '/dashboard/trainer/coach-assistant',
      reviewRoute: '/dashboard/trainer/plaud?mergeRequestId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });
  });

  it('does not require PLAUD env flags when the unified queue contains Coach intake items', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      scope: 'actionable',
      limit: 10,
      schemaReady: true,
      summary: {
        total: 0,
        actionable: 0,
        today: 0,
        unprocessed: 0,
        processing: 0,
        readyReview: 0,
        failed: 0,
        needsClient: 0,
      },
      items: [],
    });

    await expect(dispatchViewCoachIntakeQueue(
      {},
      { user: { id: 42, role: 'trainer' }, options: { sequelize: sequelizeOverride } },
    )).resolves.toMatchObject({
      queueRoute: '/dashboard/trainer/coach-assistant',
      reviewRoute: null,
    });
  });

  it('rejects client-role unified intake commands', async () => {
    await expect(dispatchViewCoachIntakeQueue(
      {},
      { user: { id: 12, role: 'client' }, options: { sequelize: sequelizeOverride } },
    )).rejects.toThrow(/requires an admin or trainer role/i);
    expect(listUnifiedCoachIntakeItems).not.toHaveBeenCalled();
  });

  it('prioritizes ready review, then oldest recording timeline', () => {
    const next = _internal.pickNextItem([
      {
        id: 'coach:old-note',
        kind: 'coach_intake',
        queueStatus: 'unprocessed',
        createdAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'merge:new-ready',
        kind: 'merge_request',
        queueStatus: 'ready_review',
        canReview: true,
        createdAt: '2026-05-06T12:00:00.000Z',
      },
      {
        id: 'coach:old-ready',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        canReview: true,
        recordedAt: '2026-05-05T12:00:00.000Z',
        createdAt: '2026-05-07T12:00:00.000Z',
      },
    ]);

    expect(next?.id).toBe('coach:old-ready');
  });

});
