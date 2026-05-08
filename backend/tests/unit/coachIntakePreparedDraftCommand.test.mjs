/**
 * coachIntakePreparedDraftCommand.test.mjs
 * ========================================
 * Read-only command coverage for active Coach intake prepared-draft summaries.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(),
}));

import { listUnifiedCoachIntakeItems } from '../../services/coachIntakeItemService.mjs';
import { dispatchViewCoachIntakePreparedDraft } from '../../services/ai/dispatchers/coachIntakeProposalDispatcher.mjs';

describe('Coach intake prepared draft command', () => {
  const sequelizeOverride = { query: vi.fn() };
  const adminCtx = { user: { id: 42, role: 'admin' }, options: { sequelize: sequelizeOverride } };

  beforeEach(() => {
    vi.mocked(listUnifiedCoachIntakeItems).mockReset();
  });

  it('returns a PII-safe summary for the active prepared draft', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      items: [{
        id: 'coach:11111111-1111-4111-9111-111111111111',
        entityId: '11111111-1111-4111-9111-111111111111',
        kind: 'coach_intake',
        queueStatus: 'ready_review',
        latestProposalId: 'proposal-1',
        latestProposal: {
          id: 'proposal-1',
          type: 'workout_log',
          status: 'PENDING',
          title: 'Review workout draft',
          createdAt: '2026-05-07T12:00:00.000Z',
        },
        clientName: 'Do Not Return',
        transcript: 'Do Not Return',
        payload: { hidden: true },
      }],
      summary: { actionable: 1 },
      schemaReady: true,
    });

    const result = await dispatchViewCoachIntakePreparedDraft(
      { intakeId: '11111111-1111-4111-9111-111111111111' },
      adminCtx,
    );

    expect(listUnifiedCoachIntakeItems).toHaveBeenCalledWith({
      userId: 42,
      scope: 'all',
      limit: 20,
      sequelizeOverride,
    });
    expect(result).toMatchObject({
      hasPreparedDraft: true,
      targetMatched: true,
      targetIntakeId: '11111111-1111-4111-9111-111111111111',
      proposalId: 'proposal-1',
      proposalType: 'workout_log',
      proposalStatus: 'PENDING',
      proposalTitle: 'Review workout draft',
      reviewRoute: '/dashboard/admin/coach-assistant?intake=11111111-1111-4111-9111-111111111111&proposal=proposal-1',
      nextActionKey: 'review_prepared_draft',
    });
    expect(JSON.stringify(result)).not.toMatch(/Do Not Return|clientName|transcript|payload/i);
  });

  it('returns the prepare-draft path when the active item has no proposal yet', async () => {
    vi.mocked(listUnifiedCoachIntakeItems).mockResolvedValue({
      items: [{
        id: 'coach:item-2',
        entityId: 'item-2',
        kind: 'coach_intake',
        queueStatus: 'unprocessed',
        latestProposalId: null,
        latestProposal: null,
      }],
      summary: { actionable: 1 },
      schemaReady: true,
    });

    await expect(dispatchViewCoachIntakePreparedDraft({ intakeId: 'item-2' }, adminCtx))
      .resolves.toMatchObject({
        hasPreparedDraft: false,
        targetMatched: true,
        targetIntakeId: 'item-2',
        proposalId: null,
        nextActionKey: 'prepare_draft_review',
        reviewRoute: '/dashboard/admin/coach-assistant?intake=item-2',
      });
  });

  it('rejects client-role access before reading the queue', async () => {
    await expect(dispatchViewCoachIntakePreparedDraft(
      {},
      { user: { id: 5, role: 'client' }, options: { sequelize: sequelizeOverride } },
    )).rejects.toThrow(/requires an admin or trainer role/i);
    expect(listUnifiedCoachIntakeItems).not.toHaveBeenCalled();
  });
});
