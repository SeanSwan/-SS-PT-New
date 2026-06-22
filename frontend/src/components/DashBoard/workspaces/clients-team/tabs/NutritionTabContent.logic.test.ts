import { describe, expect, it } from 'vitest';
import {
  buildNutritionProvenanceSummary,
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
    });
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

  it('summarizes provenance using only source and verified fields', () => {
    const summary = buildNutritionProvenanceSummary([
      entry({ source: 'photo', verified: false }),
      entry({ source: 'voice', verified: false }),
      entry({ source: 'manual', verified: true }),
    ]);

    expect(summary).toEqual({
      estimateCount: 2,
      sourceLine: 'Photo estimate, Voice estimate, Manual',
      totalCount: 3,
      verifiedCount: 1,
      verificationLine: '1 verified / 2 estimates',
    });
  });

  it('keeps empty provenance honest', () => {
    const summary = buildNutritionProvenanceSummary([]);

    expect(summary).toEqual({
      estimateCount: 0,
      sourceLine: 'No sources yet',
      totalCount: 0,
      verifiedCount: 0,
      verificationLine: 'No nutrition rows for this date',
    });
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
