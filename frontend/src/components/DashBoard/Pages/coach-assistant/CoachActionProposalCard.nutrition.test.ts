/**
 * CoachActionProposalCard.nutrition.test
 * ======================================
 * Slice 1.3 — nutrition_log review-card rendering. Locks: the nutrition proposal
 * type label, the detail rows (date/client/meals/calories + per-meal line with
 * confidence and honest "AI estimate" framing), and the summary helpers.
 */
import { describe, it, expect } from 'vitest';
import { buildDetailRows, proposalTypeLabel } from './CoachActionProposalDetailRows';
import { safeSummaryMealCount, safeSummaryCalories } from './CoachActionProposalCard.logic';

describe('nutrition_log proposal review rendering (Slice 1.3)', () => {
  it('labels the nutrition_log type', () => {
    expect(proposalTypeLabel('nutrition_log')).toBe('Nutrition log');
  });

  it('renders nutrition detail rows with per-meal confidence and AI-estimate framing', () => {
    const rows = buildDetailRows({
      nutrition: {
        clientId: 42,
        date: '2026-06-19',
        mealCount: 2,
        totalCalories: 755,
        meals: [
          { mealType: 'lunch', description: 'chicken burrito bowl', calories: 650, confidence: 0.7 },
          { mealType: 'snack', description: 'banana', calories: 105, confidence: 0.9 },
        ],
      },
      approvalGate: { confirmationMode: 'trainer_approval_required', writer: 'deterministic' },
    });
    const flat = rows.map((r) => `${r[0]}: ${r[1]}`).join('\n');
    expect(flat).toContain('Nutrition draft: AI estimate — review before approving');
    expect(flat).toContain('Date: 2026-06-19');
    expect(flat).toContain('Client: #42');
    expect(flat).toContain('Meals: 2 meals');
    expect(flat).toContain('Calories: ~755 kcal (estimate)');
    expect(flat).toContain('Lunch: chicken burrito bowl · 650 kcal · 70% conf');
    expect(flat).toContain('Snack: banana · 105 kcal · 90% conf');
  });

  it('formats meal count + calories summary chips and rejects junk', () => {
    expect(safeSummaryMealCount(3)).toBe('3 meals');
    expect(safeSummaryMealCount(1)).toBe('1 meal');
    expect(safeSummaryMealCount(null)).toBeNull();
    expect(safeSummaryCalories(650)).toBe('~650 kcal');
    expect(safeSummaryCalories(0)).toBeNull();
  });
});
