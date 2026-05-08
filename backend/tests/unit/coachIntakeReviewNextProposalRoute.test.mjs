/**
 * coachIntakeReviewNextProposalRoute.test.mjs
 * ===========================================
 * Locks Review Next routes to the prepared-draft panel when the next Coach
 * intake already has a latest proposal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(),
}));

vi.mock('../../services/coachIntakeHealthService.mjs', () => ({
  getCoachIntakeHealth: vi.fn(),
}));

import { listUnifiedCoachIntakeItems } from '../../services/coachIntakeItemService.mjs';
import { dispatchReviewNextCoachIntake } from '../../services/ai/dispatchers/coachIntakeDispatchers.mjs';

describe('Review Next prepared-draft routes', () => {
  beforeEach(() => {
    vi.mocked(listUnifiedCoachIntakeItems).mockReset();
  });

  it('deep-links Coach review-next results to the latest proposal when present', async () => {
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
      items: [{
        id: 'coach:11111111-1111-4111-9111-111111111111',
        entityId: '11111111-1111-4111-9111-111111111111',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        canReview: true,
        latestProposalId: 'proposal:ready draft',
        latestProposal: {
          id: 'proposal:ready draft',
          type: 'workout_log',
          status: 'PENDING',
          title: 'Review workout draft',
        },
        transcript: 'Do Not Return',
        clientName: 'Do Not Return',
        createdAt: '2026-05-05T12:00:00.000Z',
      }],
    });

    const result = await dispatchReviewNextCoachIntake(
      {},
      { user: { id: 7, role: 'trainer' }, options: { sequelize: { query: vi.fn() } } },
    );

    expect(result).toMatchObject({
      nextKind: 'coach_intake',
      nextEntityId: '11111111-1111-4111-9111-111111111111',
      nextLatestProposalId: 'proposal:ready draft',
      nextLatestProposalStatus: 'PENDING',
      nextLatestProposalType: 'workout_log',
      reviewRoute: '/dashboard/trainer/coach-assistant?intake=11111111-1111-4111-9111-111111111111&proposal=proposal%3Aready%20draft',
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|clientName|transcript/i);
  });
});
