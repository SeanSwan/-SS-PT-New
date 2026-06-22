/**
 * coachNutritionProposalCareCopy.test
 * ==================================
 * Locks care-first copy boundaries for Coach nutrition_log proposals before
 * generated meal descriptions reach review UI or DailyMacroLog writes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitizeProposalDetail } from '../../services/ai/coachActionProposalDetailService.mjs';

const unsafeNutritionCopyPattern =
  /\b(cutting|bulking?|caloric deficit|cheat meal|clean eating|dirty bulk|sugar crash|inflammatory|deficien(?:t|cy|cies)|zero sugar|no sugar|guilt|spike insulin|wasted macros)\b/i;

async function loadApprovalService() {
  vi.resetModules();
  const ensureClientAccess = vi.fn(async () => ({ allowed: true, clientId: 42 }));
  const createMacroEntries = vi.fn(async (meals) => ({
    mealsLogged: Array.isArray(meals) ? meals.length : 0,
    date: '2026-05-05',
  }));

  vi.doMock('../../utils/clientAccess.mjs', () => ({ ensureClientAccess }));
  vi.doMock('../../services/nutrition/macroLogService.mjs', () => ({ createMacroEntries }));

  const service = await import('../../services/ai/coachNutritionProposalApprovalService.mjs');
  return { ...service, ensureClientAccess, createMacroEntries };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('Coach nutrition proposal care-copy guards', () => {
  it('scrubs generated nutrition proposal descriptions and items before macro writes', async () => {
    const { approveNutritionLogProposal, createMacroEntries } = await loadApprovalService();
    const result = await approveNutritionLogProposal({
      id: 'proposal-1',
      req: { user: { id: 7, role: 'trainer' } },
      proposal: {
        payload: {
          clientId: 42,
          date: '2026-05-05',
          meals: [{
            mealType: 'lunch',
            description: 'Clean eating cheat meal bowl with zero sugar sauce',
            calories: 650,
            items: [{ name: 'Zero sugar chicken', serving: '1 guilt-free bowl' }],
          }],
        },
        targetUserId: 42,
      },
      db: {},
      parseProposalClientId: () => 42,
      invalidProposalClientId: () => ({ status: 400, body: { code: 'PROPOSAL_INVALID_CLIENT_ID' } }),
      claimPendingProposal: vi.fn(async () => true),
      proposalNotPending: () => ({ status: 409, body: { code: 'PROPOSAL_NOT_PENDING' } }),
      updateProposalStatus: vi.fn(async () => ({ id: 'proposal-1', status: 'APPLIED' })),
    });

    expect(result.status).toBe(200);
    const [mealsArg] = createMacroEntries.mock.calls[0];
    expect(JSON.stringify(mealsArg)).not.toMatch(unsafeNutritionCopyPattern);
    expect(mealsArg.every((meal) => meal.verified === false)).toBe(true);
  });

  it('scrubs generated nutrition meal descriptions and item leaves before review details reach the UI', () => {
    const detail = sanitizeProposalDetail({
      row: { proposal_type: 'nutrition_log' },
      proposal: {
        payload: {
          clientId: 42,
          meals: [
            {
              mealType: 'lunch',
              description: 'Clean eating cheat meal bowl with zero sugar sauce',
              calories: 650,
              items: [{ name: 'Zero sugar chicken', serving: '1 guilt-free bowl' }],
            },
          ],
        },
        targetUserId: 42,
      },
    });

    expect(JSON.stringify(detail.nutrition.meals)).not.toMatch(unsafeNutritionCopyPattern);
  });
});
