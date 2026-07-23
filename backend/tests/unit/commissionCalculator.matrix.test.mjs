/**
 * commissionCalculator.matrix.test.mjs — the regression WALL for the S0 trainerType drift fix.
 * ============================================================================
 * Asserts exact splits for every trainerType × leadSource × loyalty combination, and
 * locks in the drift-fix guarantees:
 *   - 'affiliated' → 35/65 (was silently computed via the else-branch as 'hired')
 *   - 'independent' → 15/85
 *   - unknown trainerType → THROWS (no silent fallthrough on money code)
 *   - default (omitted type) preserves the historical 35/65 behavior explicitly
 *
 * @module tests/unit/commissionCalculator.matrix.test
 */
import { describe, expect, it } from 'vitest';
import { calculateCommissionSplit } from '../../utils/commissionCalculator.mjs';
import { BASE_RATES, RATE_FLOOR } from '../../utils/commissionRates.mjs';

const GROSS = 1000;
const SESSIONS = 10;

describe('commissionCalculator — S0 drift regression wall', () => {
  it('independent + platform → 15/85', () => {
    const r = calculateCommissionSplit('platform', GROSS, SESSIONS, false, { trainerType: 'independent' });
    expect(r.businessRate).toBe(15);
    expect(r.trainerRate).toBe(85);
    expect(r.businessCut).toBe(150);
    expect(r.trainerCut).toBe(850);
  });

  it('affiliated + platform → 35/65 (the drift-fixed value)', () => {
    const r = calculateCommissionSplit('platform', GROSS, SESSIONS, false, { trainerType: 'affiliated' });
    expect(r.businessRate).toBe(35);
    expect(r.trainerRate).toBe(65);
    expect(r.businessCut).toBe(350);
    expect(r.trainerCut).toBe(650);
  });

  it('omitted trainerType defaults to affiliated (35/65) — preserves historical behavior', () => {
    const r = calculateCommissionSplit('platform', GROSS, SESSIONS, false, {});
    expect(r.businessRate).toBe(35);
    expect(r.trainerRate).toBe(65);
  });

  it('unknown trainerType THROWS (no silent fallthrough on money)', () => {
    expect(() => calculateCommissionSplit('platform', GROSS, SESSIONS, false, { trainerType: 'hired' })).toThrow(/Unknown trainerType/);
    expect(() => calculateCommissionSplit('platform', GROSS, SESSIONS, false, { trainerType: 'employee' })).toThrow(/Unknown trainerType/);
  });

  describe('lead-source modifiers', () => {
    it('independent + trainer_brought → 10/90 (−5 business)', () => {
      const r = calculateCommissionSplit('trainer_brought', GROSS, SESSIONS, false, { trainerType: 'independent' });
      expect(r.businessRate).toBe(10);
      expect(r.trainerRate).toBe(90);
    });

    it('independent + resign → 12/88 (−3 business)', () => {
      const r = calculateCommissionSplit('resign', GROSS, SESSIONS, false, { trainerType: 'independent' });
      expect(r.businessRate).toBe(12);
      expect(r.trainerRate).toBe(88);
    });

    it('affiliated + trainer_brought → 30/70 (−5 business)', () => {
      const r = calculateCommissionSplit('trainer_brought', GROSS, SESSIONS, false, { trainerType: 'affiliated' });
      expect(r.businessRate).toBe(30);
      expect(r.trainerRate).toBe(70);
    });

    it('affiliated + resign → 32/68 (−3 business)', () => {
      const r = calculateCommissionSplit('resign', GROSS, SESSIONS, false, { trainerType: 'affiliated' });
      expect(r.businessRate).toBe(32);
      expect(r.trainerRate).toBe(68);
    });

    it('invalid lead source THROWS', () => {
      expect(() => calculateCommissionSplit('bogus', GROSS, SESSIONS, false, { trainerType: 'independent' })).toThrow(/Invalid lead source/);
    });
  });

  describe('loyalty bump (only when eligible AND sessions > 100)', () => {
    it('independent + platform + loyalty (>100 sessions) → 10/90', () => {
      const r = calculateCommissionSplit('platform', GROSS, 120, true, { trainerType: 'independent' });
      expect(r.businessRate).toBe(10);
      expect(r.loyaltyBump).toBe(true);
    });

    it('loyalty flag ignored when sessions ≤ 100', () => {
      const r = calculateCommissionSplit('platform', GROSS, 100, true, { trainerType: 'independent' });
      expect(r.businessRate).toBe(15);
      expect(r.loyaltyBump).toBe(false);
    });

    it('affiliated + trainer_brought + loyalty stacks but never below the rate floor', () => {
      // 35 − 5 (brought) − 5 (loyalty) = 25, well above floor
      const r = calculateCommissionSplit('trainer_brought', GROSS, 120, true, { trainerType: 'affiliated' });
      expect(r.businessRate).toBe(25);
      expect(r.businessRate).toBeGreaterThanOrEqual(RATE_FLOOR);
    });
  });

  describe('invariants', () => {
    it('businessCut + trainerCut always equals grossAmount (rounding-safe)', () => {
      for (const type of ['independent', 'affiliated']) {
        for (const lead of ['platform', 'trainer_brought', 'resign']) {
          for (const gross of [175, 999.99, 8400, 33600, 1100.01]) {
            const r = calculateCommissionSplit(lead, gross, SESSIONS, false, { trainerType: type });
            expect(r.businessCut + r.trainerCut).toBeCloseTo(gross, 2);
            expect(r.businessRate + r.trainerRate).toBe(100);
          }
        }
      }
    });

    it('rate table exposes exactly the two canonical types', () => {
      expect(Object.keys(BASE_RATES).sort()).toEqual(['affiliated', 'independent']);
    });
  });
});
