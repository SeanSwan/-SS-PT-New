/**
 * nutritionAdherence.test.ts — BP02 §5.1 pure-math locks
 * ========================================================
 * Adherence must be truthful: no comparison without a real target, no 0%
 * "failures" on unlogged days, uncapped truth with capped bars.
 */
import {
  computeMacroAdherence,
  computeWeeklyAdherence,
  hasUsableTargets,
} from './nutritionAdherence';

const targets = { calories: 2000, protein: 150, carbs: 220, fat: 70 };

describe('computeMacroAdherence', () => {
  it('computes per-macro percentages with capped bars and uncapped truth', () => {
    const rows = computeMacroAdherence(targets, {
      calories: 1500,
      protein: 180,
      carbs: 110,
      fat: 70,
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.calories.pct).toBe(75);
    expect(byKey.protein.pct).toBe(120); // over target — truth preserved
    expect(byKey.protein.barPct).toBe(100); // bar capped
    expect(byKey.carbs.pct).toBe(50);
    expect(byKey.fat.pct).toBe(100);
  });

  it('omits macros without a positive target instead of fabricating', () => {
    const rows = computeMacroAdherence({ calories: 2000, protein: 0, carbs: null }, { calories: 1000 });
    expect(rows.map((r) => r.key)).toEqual(['calories']);
  });

  it('returns nothing without targets; hasUsableTargets mirrors that', () => {
    expect(computeMacroAdherence(null, { calories: 1000 })).toEqual([]);
    expect(hasUsableTargets(null)).toBe(false);
    expect(hasUsableTargets({ calories: 0, protein: null })).toBe(false);
    expect(hasUsableTargets({ protein: 150 })).toBe(true);
  });

  it('treats missing logged values as 0, never negative', () => {
    const rows = computeMacroAdherence(targets, { protein: -50 });
    const protein = rows.find((r) => r.key === 'protein');
    expect(protein?.logged).toBe(0);
    expect(protein?.pct).toBe(0);
  });
});

describe('computeWeeklyAdherence', () => {
  it('marks unlogged days as honest gaps (null), not 0% failures', () => {
    const strip = computeWeeklyAdherence(targets, [
      { date: '2026-07-01', calories: 1800, mealCount: 3 },
      { date: '2026-07-02', calories: 0, mealCount: 0 },
      { date: '2026-07-03', calories: 2400, mealCount: 4 },
    ]);
    expect(strip[0]).toEqual({ date: '2026-07-01', pct: 90, logged: true });
    expect(strip[1]).toEqual({ date: '2026-07-02', pct: null, logged: false });
    expect(strip[2]).toEqual({ date: '2026-07-03', pct: 120, logged: true });
  });

  it('yields null pct when there is no calorie target even on logged days', () => {
    const strip = computeWeeklyAdherence({ protein: 150 }, [
      { date: '2026-07-01', calories: 1800, mealCount: 2 },
    ]);
    expect(strip[0].pct).toBeNull();
    expect(strip[0].logged).toBe(true);
  });
});
