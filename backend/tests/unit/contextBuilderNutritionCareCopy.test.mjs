import { describe, expect, it } from 'vitest';
import { buildUnifiedContext } from '../../services/ai/contextBuilder.mjs';

const unsafeNutritionCopyPattern =
  /\b(cutting|bulking?|caloric deficit|cheat meal|clean eating|dirty bulk|sugar crash|inflammatory|deficien(?:t|cy|cies)|zero sugar|no sugar|guilt|spike insulin|wasted macros)\b/i;

describe('contextBuilder nutrition care copy', () => {
  it('keeps weight-loss goal progress recommendations care-first for AI prompt context', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: {
        client: {
          alias: 'Phoenix',
          age: 32,
          gender: 'male',
          goals: { primary: 'weight loss' },
        },
      },
      measurementContext: {
        currentWeight: 180,
        weightTrend: 'decreasing',
      },
    });

    const copy = JSON.stringify(ctx.goalProgress.recommendations);
    expect(copy).not.toMatch(unsafeNutritionCopyPattern);
    expect(copy).toContain('lower-fuel phase');
  });
});
