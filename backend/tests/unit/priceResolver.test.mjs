/**
 * priceResolver.test.mjs — precedence + shadow/enforce wall for the S1 pure price resolver.
 * ============================================================================
 * Locks the blueprint precedence (floor → special → base) and the S1-vs-S2 behavior split:
 *   - shadow mode (enforce=false): reports wouldHaveClamped but does NOT change the price
 *   - enforce mode (enforce=true, S2): clamps below-floor prices UP to the floor
 * 12+ cases covering base, special, floor-clamp, special-floor-clamp, windows, scope, and rounding.
 *
 * Pure function — no DB, no mocks needed.
 *
 * @module tests/unit/priceResolver.test
 */
import { describe, expect, it } from 'vitest';
import { resolve, roundMoney } from '../../services/economics/priceResolver.mjs';

const NOW = new Date('2026-07-23T12:00:00Z');
const item = (over = {}) => ({ id: 88, pricePerSession: 50, ...over });
const floor = (f) => ({ floor: f });

describe('priceResolver — S1 precedence + shadow/enforce wall', () => {
  // 1. base price, no floor, no special → base
  it('1. base with no floor/special → base price, source=base', () => {
    const r = resolve({ storeFrontItem: item({ pricePerSession: 50 }), now: NOW });
    expect(r.price).toBe(50);
    expect(r.source).toBe('base');
    expect(r.wouldHaveClamped).toBe(false);
  });

  // 2. base above floor → unchanged, no clamp
  it('2. base above floor → unchanged, wouldHaveClamped=false', () => {
    const r = resolve({ storeFrontItem: item({ pricePerSession: 50 }), floorConfig: floor(40), now: NOW });
    expect(r.price).toBe(50);
    expect(r.wouldHaveClamped).toBe(false);
  });

  // 3. base BELOW floor, SHADOW → price unchanged, wouldHaveClamped=true
  it('3. base below floor in SHADOW → price NOT changed, wouldHaveClamped=true', () => {
    const r = resolve({ storeFrontItem: item({ pricePerSession: 35 }), floorConfig: floor(40), now: NOW, enforce: false });
    expect(r.price).toBe(35); // shadow: NOT clamped
    expect(r.wouldHaveClamped).toBe(true);
    expect(r.source).toBe('base');
  });

  // 4. base BELOW floor, ENFORCE → clamped up to floor, source=floor_clamp
  it('4. base below floor with ENFORCE → clamped to floor, source=floor_clamp', () => {
    const r = resolve({ storeFrontItem: item({ pricePerSession: 35 }), floorConfig: floor(40), now: NOW, enforce: true });
    expect(r.price).toBe(40);
    expect(r.wouldHaveClamped).toBe(true);
    expect(r.source).toBe('floor_clamp');
  });

  // 5. base exactly AT floor → not clamped (floor is inclusive minimum)
  it('5. base exactly at floor → not clamped', () => {
    const r = resolve({ storeFrontItem: item({ pricePerSession: 40 }), floorConfig: floor(40), now: NOW, enforce: true });
    expect(r.price).toBe(40);
    expect(r.wouldHaveClamped).toBe(false);
  });

  // 6. active special beats base (lower special wins)
  it('6. active in-window special overrides base, source=special', () => {
    const specials = [{ storeFrontItemId: 88, specialPrice: 42, isActive: true, startsAt: '2026-07-20', endsAt: '2026-07-30' }];
    const r = resolve({ storeFrontItem: item({ pricePerSession: 50 }), activeSpecials: specials, floorConfig: floor(40), now: NOW });
    expect(r.price).toBe(42);
    expect(r.source).toBe('special');
    expect(r.wouldHaveClamped).toBe(false);
  });

  // 7. special BELOW floor, SHADOW → special price kept, wouldHaveClamped=true
  it('7. special below floor in SHADOW → special kept, wouldHaveClamped=true', () => {
    const specials = [{ storeFrontItemId: 88, specialPrice: 30, isActive: true, startsAt: '2026-07-20', endsAt: '2026-07-30' }];
    const r = resolve({ storeFrontItem: item(), activeSpecials: specials, floorConfig: floor(40), now: NOW, enforce: false });
    expect(r.price).toBe(30);
    expect(r.wouldHaveClamped).toBe(true);
    expect(r.source).toBe('special');
  });

  // 8. special BELOW floor, ENFORCE → clamped, source=special_floor_clamp
  it('8. special below floor with ENFORCE → clamped, source=special_floor_clamp', () => {
    const specials = [{ storeFrontItemId: 88, specialPrice: 30, isActive: true, startsAt: '2026-07-20', endsAt: '2026-07-30' }];
    const r = resolve({ storeFrontItem: item(), activeSpecials: specials, floorConfig: floor(40), now: NOW, enforce: true });
    expect(r.price).toBe(40);
    expect(r.source).toBe('special_floor_clamp');
    expect(r.wouldHaveClamped).toBe(true);
  });

  // 9. EXPIRED special ignored → falls back to base
  it('9. expired special ignored → base price', () => {
    const specials = [{ storeFrontItemId: 88, specialPrice: 42, isActive: true, startsAt: '2026-06-01', endsAt: '2026-06-30' }];
    const r = resolve({ storeFrontItem: item({ pricePerSession: 50 }), activeSpecials: specials, now: NOW });
    expect(r.price).toBe(50);
    expect(r.source).toBe('base');
  });

  // 10. special for a DIFFERENT package ignored; trainer-wide (null id) applies
  it('10. mismatched-package special ignored; trainer-wide special applies', () => {
    const otherPkg = [{ storeFrontItemId: 99, specialPrice: 42, isActive: true, startsAt: '2026-07-20', endsAt: '2026-07-30' }];
    const rMismatch = resolve({ storeFrontItem: item({ pricePerSession: 50 }), activeSpecials: otherPkg, now: NOW });
    expect(rMismatch.price).toBe(50); // ignored

    const trainerWide = [{ storeFrontItemId: null, specialPrice: 44, isActive: true, startsAt: '2026-07-20', endsAt: '2026-07-30' }];
    const rWide = resolve({ storeFrontItem: item({ pricePerSession: 50 }), activeSpecials: trainerWide, now: NOW });
    expect(rWide.price).toBe(44);
    expect(rWide.source).toBe('special');
  });

  // 11. lowest of multiple applicable specials wins
  it('11. lowest applicable special wins', () => {
    const specials = [
      { storeFrontItemId: 88, specialPrice: 48, isActive: true, startsAt: '2026-07-20', endsAt: '2026-07-30' },
      { storeFrontItemId: null, specialPrice: 43, isActive: true, startsAt: '2026-07-20', endsAt: '2026-07-30' },
    ];
    const r = resolve({ storeFrontItem: item({ pricePerSession: 50 }), activeSpecials: specials, now: NOW });
    expect(r.price).toBe(43);
  });

  // 12. deleted / inactive special ignored
  it('12. deleted or inactive special ignored → base', () => {
    const specials = [
      { storeFrontItemId: 88, specialPrice: 20, isActive: false, startsAt: '2026-07-20', endsAt: '2026-07-30' },
      { storeFrontItemId: 88, specialPrice: 22, isActive: true, isDeleted: true, startsAt: '2026-07-20', endsAt: '2026-07-30' },
    ];
    const r = resolve({ storeFrontItem: item({ pricePerSession: 50 }), activeSpecials: specials, floorConfig: floor(40), now: NOW, enforce: true });
    expect(r.price).toBe(50);
    expect(r.source).toBe('base');
    expect(r.wouldHaveClamped).toBe(false);
  });

  // 13. missing pricePerSession falls back to price; unknown source when neither present
  it('13. missing per-session price → falls back to price; neither → unknown', () => {
    const rFallback = resolve({ storeFrontItem: { id: 88, price: 60 }, now: NOW });
    expect(rFallback.price).toBe(60);

    const rUnknown = resolve({ storeFrontItem: { id: 88 }, now: NOW });
    expect(rUnknown.price).toBeNull();
    expect(rUnknown.source).toBe('unknown');
  });

  // 14. rounding is half-up to 2dp at the single resolution point
  it('14. roundMoney is half-up to 2 decimals', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(42.999)).toBe(43);
    expect(roundMoney('35.50')).toBe(35.5);
    expect(roundMoney(NaN)).toBe(0);
  });

  // 15. THE cart S1 shadow scenario: $40 shadow floor, below-floor package, enforce=false →
  // price is NOT changed but wouldHaveClamped is observed (this is exactly what the cart logs in S1).
  it('15. cart S1 shadow: $38 pkg vs $40 floor, enforce off → price kept, wouldHaveClamped=true', () => {
    const r = resolve({ storeFrontItem: item({ pricePerSession: 38 }), activeSpecials: [], floorConfig: floor(40), now: NOW, enforce: false });
    expect(r.price).toBe(38);
    expect(r.wouldHaveClamped).toBe(true);
    expect(r.source).toBe('base');
  });

  // 16. cart S1 shadow: at/above floor → no clamp observed
  it('16. cart S1 shadow: $50 pkg vs $40 floor → wouldHaveClamped=false', () => {
    const r = resolve({ storeFrontItem: item({ pricePerSession: 50 }), activeSpecials: [], floorConfig: floor(40), now: NOW, enforce: false });
    expect(r.price).toBe(50);
    expect(r.wouldHaveClamped).toBe(false);
  });
});