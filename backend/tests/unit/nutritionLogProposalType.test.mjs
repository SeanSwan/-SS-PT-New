/**
 * nutritionLogProposalType.test
 * =============================
 * Slice 1.2 — NUTRITION_LOG approval-gate proposal type.
 * Locks: the model's nutrition_log draft classifies into a typed proposal with
 * meals + client scope, rejects empty/description-less meals, and is subject to
 * the encrypted detail-review-before-approve gate (same bar as workout_log).
 * The deterministic write (createMacroEntries) is exercised by the approval
 * service; this suite locks the classification + review-gate contract.
 */
import { describe, it, expect } from 'vitest';
import { classifyActionBlock } from '../../services/ai/coachActionProposalClassifier.mjs';
import { COACH_PROPOSAL_TYPE } from '../../services/ai/coachActionProposalService.mjs';
import { proposalRequiresDetailReview } from '../../services/ai/coachProposalReviewTokenService.mjs';

const opts = { proposalTypes: COACH_PROPOSAL_TYPE, schemaVersion: '2026-05-07', routeContext: null };
const convo = { targetUserId: 42 };

describe('NUTRITION_LOG proposal classification (Slice 1.2)', () => {
  it('classifies a structured nutrition_log coach_action_proposal with meals + client scope', () => {
    const result = classifyActionBlock(
      {
        action: 'coach_action_proposal',
        proposal_type: 'nutrition_log',
        payload: {
          date: '2026-06-19',
          meals: [
            { mealType: 'lunch', description: 'chicken burrito bowl', calories: 650, protein: 45, carbs: 70, fat: 18 },
            { mealType: 'snack', description: 'banana', calories: 105 },
          ],
        },
      },
      convo,
      opts,
    );
    expect(result).not.toBeNull();
    expect(result.type).toBe(COACH_PROPOSAL_TYPE.NUTRITION_LOG);
    expect(result.payload.meals).toHaveLength(2);
    expect(result.payload.clientId).toBe(42);
    expect(result.payload.proposalMeta.requiresConfirmation).toBe(true);
  });

  it('rejects a nutrition_log proposal with no meals', () => {
    expect(classifyActionBlock(
      { action: 'coach_action_proposal', proposal_type: 'nutrition_log', payload: { meals: [] } },
      convo,
      opts,
    )).toBeNull();
  });

  it('rejects a meal that has no description', () => {
    expect(classifyActionBlock(
      { action: 'coach_action_proposal', proposal_type: 'nutrition_log', payload: { meals: [{ calories: 200 }] } },
      convo,
      opts,
    )).toBeNull();
  });

  it('accepts the legacy direct import_nutrition_log action and scopes it to the client', () => {
    const result = classifyActionBlock(
      { action: 'import_nutrition_log', meals: [{ description: 'oatmeal with berries', calories: 300 }] },
      convo,
      opts,
    );
    expect(result).not.toBeNull();
    expect(result.type).toBe(COACH_PROPOSAL_TYPE.NUTRITION_LOG);
    expect(result.payload.clientId).toBe(42);
  });

  it('requires encrypted detail-review before approval (same gate as workout_log)', () => {
    expect(proposalRequiresDetailReview('nutrition_log')).toBe(true);
    expect(proposalRequiresDetailReview('workout_log')).toBe(true);
  });
});
