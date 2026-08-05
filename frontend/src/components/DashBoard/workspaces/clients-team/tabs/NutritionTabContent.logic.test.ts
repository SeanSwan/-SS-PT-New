import { describe, expect, it } from 'vitest';
import {
  buildNutritionTimelineRows,
  type NutritionTimelineEntry,
} from './NutritionTabContent.logic';

const entry = (overrides: Partial<NutritionTimelineEntry> = {}): NutritionTimelineEntry => ({
  id: 77,
  mealType: 'lunch',
  description: 'chicken bowl',
  calories: 620,
  protein: 44,
  carbs: 62,
  fat: 18,
  fiber: 9,
  sugar: 11,
  sodium: 790,
  source: 'food-scanner',
  verified: false,
  createdAt: '2026-06-20T19:00:00.000Z',
  ...overrides,
});

describe('NutritionTabContent logic', () => {
  it('labels unverified photo scanner entries as estimates that need review', () => {
    const rows = buildNutritionTimelineRows([entry()]);

    expect(rows[0]).toMatchObject({
      title: 'Lunch',
      description: 'chicken bowl',
      macroLine: '620 cal - 44g protein - 9g fiber',
      sourceLabel: 'Photo estimate',
      reviewLabels: ['Needs review', 'Photo estimate'],
      needsAttention: true,
    });
  });

  it('labels verified manual entries without review pressure', () => {
    const rows = buildNutritionTimelineRows([
      entry({ source: 'manual', verified: true, mealType: 'snack', description: 'Greek yogurt' }),
    ]);

    expect(rows[0]).toMatchObject({
      title: 'Snack',
      sourceLabel: 'Manual',
      reviewLabels: ['Verified'],
      canVerify: false,
      needsAttention: false,
    });
  });

  it('labels unverified manual entries as verification-needed without calling them estimates', () => {
    const rows = buildNutritionTimelineRows([
      entry({ source: 'manual', verified: false, mealType: 'snack', description: 'Greek yogurt' }),
    ]);

    expect(rows[0]).toMatchObject({
      title: 'Snack',
      sourceLabel: 'Manual',
      reviewLabels: ['Needs verification', 'Manual'],
      canVerify: true,
      needsAttention: false,
    });
  });

  it('marks unverified manual entries flagged needs_review by the reviewer pipeline', () => {
    const rows = buildNutritionTimelineRows([
      entry({ source: 'manual', verified: false, reviewStatus: 'needs_review' }),
    ]);

    expect(rows[0].needsAttention).toBe(true);
  });

  it('never marks verified rows as needing attention regardless of reviewStatus', () => {
    const rows = buildNutritionTimelineRows([
      entry({ verified: true, reviewStatus: 'needs_review' }),
    ]);

    expect(rows[0].needsAttention).toBe(false);
  });

  it('preserves stored backend source labels for timeline rows', () => {
    const rows = buildNutritionTimelineRows([
      entry({ source: 'photo' }),
      entry({ source: 'ai_chat' }),
      entry({ source: 'voice' }),
      entry({ source: 'usda_lookup' }),
    ]);

    expect(rows.map((row) => row.sourceLabel)).toEqual([
      'Photo estimate',
      'AI estimate',
      'Voice estimate',
      'USDA lookup',
    ]);
    expect(rows.every((row) => row.canVerify)).toBe(true);
  });

  it('adds day context to the time label in range mode only', () => {
    const [dayRow] = buildNutritionTimelineRows([entry()]);
    const [rangeRow] = buildNutritionTimelineRows([entry()], { withDateLabels: true });

    expect(dayRow.createdAtLabel).not.toMatch(/Jun/);
    expect(rangeRow.createdAtLabel).toMatch(/Jun \d{2}/);
  });

  it('rejects coercive macro values before timeline macro copy', () => {
    const rows = buildNutritionTimelineRows([entry({
      calories: ['620'] as unknown as number,
      protein: '1e2',
      fiber: { valueOf: () => 9 } as unknown as number,
    })]);

    expect(rows[0].macroLine).toBe('0 cal - 0g protein - 0g fiber');
  });
});
