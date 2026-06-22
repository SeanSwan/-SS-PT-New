import { describe, expect, it } from 'vitest';
import { buildNutritionRadarData } from './NutritionBalanceRadar';

describe('NutritionBalanceRadar', () => {
  it('builds radar percentages from valid nutrition totals', () => {
    expect(buildNutritionRadarData({
      protein: 75,
      carbs: 125,
      fat: 32.5,
      fiber: 15,
      hydrationMl: 1250,
    })).toEqual([
      { x: 0, y: 50 },
      { x: 1, y: 50 },
      { x: 2, y: 50 },
      { x: 3, y: 50 },
      { x: 4, y: 50 },
    ]);
  });

  it('rejects coercive nutrition values before rendering credible radar progress', () => {
    expect(buildNutritionRadarData({
      protein: ['150'] as unknown as number,
      carbs: '0x10' as unknown as number,
      fat: '1e2' as unknown as number,
      fiber: { valueOf: () => 30 } as unknown as number,
      hydrationMl: [2500] as unknown as number,
    })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('renders empty radar data while mounted macro truth is loading', () => {
    expect(buildNutritionRadarData({ loading: true })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });
});
