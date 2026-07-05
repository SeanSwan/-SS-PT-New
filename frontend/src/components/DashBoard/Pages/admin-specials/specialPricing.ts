/**
 * specialPricing.ts — client-side MIRROR of backend specialOfferService pricing/floor
 * logic, for the live "deal preview" in the Create Special form.
 *
 * The SERVER is authoritative on submit: POST /api/custom-packages re-validates and
 * returns the canonical pricing. This module is a snappy optimistic preview that
 * matches the server policy 1:1 (no per-keystroke network round-trip). Kept in sync
 * with backend/services/specialOfferService.mjs — parity is covered by specialPricing.test.ts.
 *
 * CORE RULE: the $175/session PAID sticker never drops; the discount is delivered as
 * BONUS sessions. effectiveRate = totalPrice / (paid + bonus).
 */

export const STICKER_PER_SESSION = 175;
export const RATE_NO_GATE = 120; // >= this: no override needed
export const RATE_FLOOR = 100; // below this: a logged reason is required
export const RATE_ABSOLUTE_MIN = 60; // below this: hard block, no override

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface SpecialPricing {
  paidSessions: number;
  bonusSessions: number;
  totalSessions: number;
  totalPrice: number;
  effectiveHourlyRate: number;
}

/** Pricing from an explicit paid + bonus count, at the fixed sticker. */
export function computeSpecialPricing(paidSessions: number, bonusSessions: number): SpecialPricing {
  const paid = Math.max(0, Math.floor(Number(paidSessions) || 0));
  const bonus = Math.max(0, Math.floor(Number(bonusSessions) || 0));
  const totalSessions = paid + bonus;
  const totalPrice = round2(paid * STICKER_PER_SESSION);
  const effectiveHourlyRate = totalSessions > 0 ? round2(totalPrice / totalSessions) : 0;
  return { paidSessions: paid, bonusSessions: bonus, totalSessions, totalPrice, effectiveHourlyRate };
}

/** Bonus sessions needed to approach a target effective $/session, at the fixed sticker. */
export function computeBonusForTargetRate(paidSessions: number, targetEffectiveRate: number): SpecialPricing {
  const paid = Math.max(1, Math.floor(Number(paidSessions) || 0));
  const target = Number(targetEffectiveRate);
  if (!(target > 0)) return computeSpecialPricing(paid, 0);
  const totalPrice = paid * STICKER_PER_SESSION;
  const totalSessions = Math.max(paid, Math.round(totalPrice / target));
  return computeSpecialPricing(paid, totalSessions - paid);
}

export type RateTier = 'clear' | 'below_warning' | 'below_floor' | 'below_absolute_min' | 'invalid';

export interface RateGate {
  tier: RateTier;
  requiresOverride: boolean;
  requiresReason: boolean;
  hardBlocked: boolean;
  /** short human label for the status badge */
  label: string;
}

/** Classify an effective rate against the floor policy (mirrors backend evaluateRateGate). */
export function evaluateRateGate(rate: number): RateGate {
  const r = Number(rate);
  if (!(r > 0)) {
    return { tier: 'invalid', requiresOverride: false, requiresReason: false, hardBlocked: true, label: 'Set a rate' };
  }
  if (r < RATE_ABSOLUTE_MIN) {
    return { tier: 'below_absolute_min', requiresOverride: false, requiresReason: false, hardBlocked: true, label: `Below $${RATE_ABSOLUTE_MIN} min — blocked` };
  }
  if (r < RATE_FLOOR) {
    return { tier: 'below_floor', requiresOverride: true, requiresReason: true, hardBlocked: false, label: `Below $${RATE_FLOOR} floor — override + reason` };
  }
  if (r < RATE_NO_GATE) {
    return { tier: 'below_warning', requiresOverride: true, requiresReason: false, hardBlocked: false, label: `Below $${RATE_NO_GATE} — override` };
  }
  return { tier: 'clear', requiresOverride: false, requiresReason: false, hardBlocked: false, label: 'Good to go' };
}
