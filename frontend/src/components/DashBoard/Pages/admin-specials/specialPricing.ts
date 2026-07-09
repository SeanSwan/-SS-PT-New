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
// Informational thresholds ONLY — the admin is the final decider (Sean
// 2026-07-08). None of these block a save; they just label the rate.
export const RATE_NO_GATE = 120; // >= this: "standard"
export const RATE_FLOOR = 100; // 100-120: "discounted"
export const RATE_ABSOLUTE_MIN = 60; // 60-100: "deep deal"; < 60: "custom deal"

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

export type RateTier = 'standard' | 'discounted' | 'deep_deal' | 'custom_deal' | 'invalid';

export interface RateGate {
  tier: RateTier;
  /** kept false always — no gating (admin is the final decider) */
  requiresOverride: boolean;
  requiresReason: boolean;
  /** true only for a non-positive rate (a typo); never for a low price */
  hardBlocked: boolean;
  /** short human label for the informational status badge */
  label: string;
}

/**
 * Classify an effective rate into an INFORMATIONAL label (mirrors backend
 * evaluateRateGate). NEVER blocks a save — the admin picks any price and it
 * saves (Sean 2026-07-08). Only a non-positive rate is flagged as invalid.
 */
export function evaluateRateGate(rate: number): RateGate {
  const r = Number(rate);
  if (!(r > 0)) {
    return { tier: 'invalid', requiresOverride: false, requiresReason: false, hardBlocked: true, label: 'Set a rate' };
  }
  if (r >= RATE_NO_GATE) {
    return { tier: 'standard', requiresOverride: false, requiresReason: false, hardBlocked: false, label: `$${round2(r)}/session` };
  }
  if (r >= RATE_FLOOR) {
    return { tier: 'discounted', requiresOverride: false, requiresReason: false, hardBlocked: false, label: `Discounted · $${round2(r)}/session` };
  }
  if (r >= RATE_ABSOLUTE_MIN) {
    return { tier: 'deep_deal', requiresOverride: false, requiresReason: false, hardBlocked: false, label: `Deep deal · $${round2(r)}/session` };
  }
  return { tier: 'custom_deal', requiresOverride: false, requiresReason: false, hardBlocked: false, label: `Custom deal · $${round2(r)}/session` };
}
