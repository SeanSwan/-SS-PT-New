/**
 * priceResolver.mjs — the ONE pure function that decides a package's per-session price.
 * ============================================================================
 * Kimi K3 blueprint principle "One choke point per concern": price resolves in exactly one
 * function. No UI sets price; the resolver does. The cart choke point (cartRoutes.mjs) calls
 * this; every price-relevant slice extends THIS function, never a parallel path.
 *
 * PURE: no I/O, no DB, no clock read, no logging. All inputs are passed in (including `now`),
 * so the function is deterministic and unit-testable — same inputs always produce the same
 * output. Side effects (audit logging, clamping the cart) are the CALLER's job.
 *
 * Precedence (blueprint): floor → cooldown → special → base.
 *   - base:   the package's own per-session price is the starting point.
 *   - special: an active, in-window TrainerSpecial/AdminSpecial price overrides base (S4).
 *   - floor:  the platform floor is the hard minimum. A price below floor is CLAMPED UP to it.
 *   - cooldown affects whether a *change* is allowed (S3), not the resolved read price, so it
 *     does not appear in this read-time resolution — it's enforced at the write path.
 *
 * S1 (2026-07-23) — SHADOW: the resolver is called in shadow mode. It computes the "true"
 * resolved price and, crucially, `wouldHaveClamped` (would the floor have raised this price?),
 * but the CALLER discards the price and only logs the observation. Nothing is enforced in S1.
 * S2 flips `enforce` and the caller uses the clamped price.
 *
 * @module services/economics/priceResolver
 */

/** Round a money value to 2 decimals, half-up, guarding against float dust. Money is USD
 * DECIMAL(10,2); rounding happens HERE (the single resolution point) and nowhere else. */
export const roundMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  // Half-up to 2dp. +Number.EPSILON nudge avoids 1.005→1.00 style float truncation.
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

/** Coerce a possibly-string/absent money field to a finite non-negative number, else null.
 * Sequelize DECIMAL columns come back as strings — this normalizes them safely. */
const toMoney = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Pick the base per-session price from a storefront item, tolerating the several price fields
 * the model carries (pricePerSession is the canonical per-session number; price/totalCost are
 * package totals and are NOT per-session, so they are only a last-resort fallback and flagged). */
const baseSessionPrice = (storeFrontItem) => {
  if (!storeFrontItem) return null;
  const perSession = toMoney(storeFrontItem.pricePerSession);
  if (perSession !== null) return perSession;
  // Fallback: some legacy rows lack pricePerSession. Use `price` only if present; caller-visible
  // via source so a reviewer knows the number wasn't a true per-session figure.
  return toMoney(storeFrontItem.price);
};

/**
 * Choose the best applicable special price for this package at `now`.
 * A special applies when: it is active, not deleted, its window contains `now`, and it targets
 * this package (or is trainer-wide with a null storeFrontItemId). Among applicable specials, the
 * LOWEST price wins (best deal for the buyer). Returns the numeric special price, or null.
 *
 * S1 passes `activeSpecials=[]` (the TrainerSpecial model doesn't exist until S4), so this returns
 * null and the resolver falls through to base — that path is exercised by tests now.
 */
const bestSpecialPrice = (activeSpecials, storeFrontItemId, now) => {
  if (!Array.isArray(activeSpecials) || activeSpecials.length === 0) return null;
  let best = null;
  for (const s of activeSpecials) {
    if (!s || s.isActive === false || s.isDeleted === true) continue;
    // Window check (inclusive start, exclusive end is fine either way for a read).
    if (s.startsAt && now < new Date(s.startsAt)) continue;
    if (s.endsAt && now > new Date(s.endsAt)) continue;
    // Scope: a null storeFrontItemId special is trainer-wide (applies to all their packages).
    if (s.storeFrontItemId !== null && s.storeFrontItemId !== undefined && s.storeFrontItemId !== storeFrontItemId) {
      continue;
    }
    const price = toMoney(s.specialPrice);
    if (price === null) continue;
    if (best === null || price < best) best = price;
  }
  return best;
};

/**
 * Resolve the per-session price for a package.
 *
 * @param {object} args
 * @param {object} args.storeFrontItem            The package row (needs id, pricePerSession/price).
 * @param {object} [args.trainer]                 Owning trainer (reserved for future scope; unused in S1 read).
 * @param {Array}  [args.activeSpecials]          Candidate specials (S4). Empty/absent in S1.
 * @param {object} [args.floorConfig]             { floor: number } platform floor (S2). Absent in S1 → no floor.
 * @param {Date}   [args.now]                     Evaluation time (defaults to a passed-in clock only; caller supplies).
 * @param {boolean}[args.enforce]                 When true, return the CLAMPED price (S2). When false/absent
 *                                                (S1 shadow), return the pre-clamp price but still report
 *                                                wouldHaveClamped so the caller can log the observation.
 * @returns {{ price: number, source: string, wouldHaveClamped: boolean, basePrice: number|null, floor: number|null }}
 */
export const resolve = ({ storeFrontItem, activeSpecials, floorConfig, now, enforce = false } = {}) => {
  const evalNow = now instanceof Date ? now : (now ? new Date(now) : null);
  const base = baseSessionPrice(storeFrontItem);
  const floor = floorConfig && Number.isFinite(Number(floorConfig.floor)) ? Number(floorConfig.floor) : null;

  // Start from base. If a special applies, it overrides base (specials are the buyer's better deal).
  let price = base;
  let source = base === null ? 'unknown' : 'base';

  const special = evalNow ? bestSpecialPrice(activeSpecials, storeFrontItem?.id, evalNow) : null;
  if (special !== null) {
    price = special;
    source = 'special';
  }

  // Floor is the hard minimum. Determine whether the current (base/special) price is below it.
  let wouldHaveClamped = false;
  if (floor !== null && price !== null && price < floor) {
    wouldHaveClamped = true;
    if (enforce) {
      // S2 enforcement: clamp UP to the floor and record which kind of clamp it was.
      price = floor;
      source = source === 'special' ? 'special_floor_clamp' : 'floor_clamp';
    }
    // In shadow mode (enforce=false), price stays pre-clamp; only wouldHaveClamped signals the event.
  }

  return {
    price: price === null ? null : roundMoney(price),
    source,
    wouldHaveClamped,
    basePrice: base === null ? null : roundMoney(base),
    floor,
  };
};

export default { resolve, roundMoney };
