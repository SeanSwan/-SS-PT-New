/**
 * specialOfferService.mjs — S1 core for per-client "SwanStudios Special" pricing
 * ==============================================================================
 * Single source of truth for the per-client bonus-session special-pricing feature.
 *
 * CORE RULE (never violate): the $175/session PAID sticker NEVER drops. The whole
 * discount is delivered as BONUS sessions. "Effective rate" = totalPrice / (paid+bonus).
 *
 * Effective-rate floor policy (Sean-arbitrated 2026-07-04):
 *   rate >= 120  -> OK, no gate
 *   100 <= rate < 120 -> requires explicit admin override (belowThresholdApproved)
 *   60  <= rate < 100 -> requires override AND a logged overrideReason (below-floor)
 *   rate < 60         -> HARD BLOCK (absolute minimum, no override)
 *
 * A "special" = a CustomPackage (spine) backed by a HIDDEN, client-scoped
 * StorefrontItem (isSpecialOffer=true, excluded from the public catalog) whose
 * `sessions`/`totalSessions` = paid+bonus, so the existing idempotent grant
 * (SessionGrantService) credits the full total with ZERO changes to the grant path.
 *
 * Pure functions (no DB) are unit-tested directly. DB-touching functions take their
 * Sequelize models as parameters so callers inject them and tests can stub them.
 */

export const STICKER_PER_SESSION = 175; // the paid sticker — never lowered
export const RATE_NO_GATE = 120;        // effective rate >= this needs no override
export const RATE_FLOOR = 100;          // below this needs a logged reason
export const RATE_ABSOLUTE_MIN = 60;    // below this: hard block, no override

export class SpecialOfferError extends Error {
  constructor(message, { code = 'SPECIAL_OFFER_ERROR', status = 400, details = null } = {}) {
    super(message);
    this.name = 'SpecialOfferError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/**
 * Pure: compute pricing from paid + bonus at the fixed sticker.
 * @returns {{paidSessions,bonusSessions,totalSessions,pricePerSession,totalPrice,effectiveHourlyRate}}
 */
export function computeSpecialPricing({ paidSessions, bonusSessions = 0, pricePerSession = STICKER_PER_SESSION }) {
  const paid = Number(paidSessions);
  const bonus = Number(bonusSessions);
  const rate = Number(pricePerSession);
  if (!Number.isInteger(paid) || paid < 1) {
    throw new SpecialOfferError('paidSessions must be a positive integer', { code: 'INVALID_PAID' });
  }
  if (!Number.isInteger(bonus) || bonus < 0) {
    throw new SpecialOfferError('bonusSessions must be a non-negative integer', { code: 'INVALID_BONUS' });
  }
  if (!(rate > 0)) {
    throw new SpecialOfferError('pricePerSession must be > 0', { code: 'INVALID_RATE' });
  }
  const totalSessions = paid + bonus;
  const totalPrice = round2(paid * rate);
  const effectiveHourlyRate = round2(totalPrice / totalSessions);
  return { paidSessions: paid, bonusSessions: bonus, totalSessions, pricePerSession: rate, totalPrice, effectiveHourlyRate };
}

/**
 * Pure: bonus sessions needed to hit a target effective rate, at the fixed sticker.
 * Powers the admin "type the effective $/session" UX. Whole sessions only, so the
 * realized effective rate is the closest achievable to the target.
 */
export function computeBonusForTargetRate({ paidSessions, targetEffectiveRate, pricePerSession = STICKER_PER_SESSION }) {
  const paid = Number(paidSessions);
  const target = Number(targetEffectiveRate);
  const rate = Number(pricePerSession);
  if (!Number.isInteger(paid) || paid < 1) {
    throw new SpecialOfferError('paidSessions must be a positive integer', { code: 'INVALID_PAID' });
  }
  if (!(target > 0)) {
    throw new SpecialOfferError('targetEffectiveRate must be > 0', { code: 'INVALID_TARGET' });
  }
  if (!(rate > 0)) {
    throw new SpecialOfferError('pricePerSession must be > 0', { code: 'INVALID_RATE' });
  }
  const totalPrice = paid * rate;
  // totalSessions to reach the target rate, floored at paid (bonus can't be negative)
  const totalSessions = Math.max(paid, Math.round(totalPrice / target));
  const bonusSessions = totalSessions - paid;
  return { ...computeSpecialPricing({ paidSessions: paid, bonusSessions, pricePerSession: rate }), targetEffectiveRate: target };
}

/**
 * Pure: classify an effective rate against the floor policy (no throw).
 * @returns {{ok,tier,requiresOverride,requiresReason,hardBlocked}}
 */
export function evaluateRateGate(effectiveHourlyRate) {
  const rate = Number(effectiveHourlyRate);
  if (!(rate > 0)) {
    return { ok: false, tier: 'invalid', requiresOverride: false, requiresReason: false, hardBlocked: true };
  }
  if (rate < RATE_ABSOLUTE_MIN) {
    return { ok: false, tier: 'below_absolute_min', requiresOverride: false, requiresReason: false, hardBlocked: true };
  }
  if (rate < RATE_FLOOR) {
    return { ok: true, tier: 'below_floor', requiresOverride: true, requiresReason: true, hardBlocked: false };
  }
  if (rate < RATE_NO_GATE) {
    return { ok: true, tier: 'below_warning', requiresOverride: true, requiresReason: false, hardBlocked: false };
  }
  return { ok: true, tier: 'clear', requiresOverride: false, requiresReason: false, hardBlocked: false };
}

/**
 * Pure: enforce the floor policy. Throws SpecialOfferError when violated.
 * @returns {{tier,requiresOverride,requiresReason}} on success (audit metadata)
 */
export function assertRateFloor({ effectiveHourlyRate, belowThresholdApproved = false, overrideReason = null }) {
  const gate = evaluateRateGate(effectiveHourlyRate);
  if (gate.hardBlocked) {
    throw new SpecialOfferError(
      `Effective rate $${round2(effectiveHourlyRate)}/session is below the absolute minimum of $${RATE_ABSOLUTE_MIN}. Reduce bonus sessions.`,
      { code: 'BELOW_ABSOLUTE_MIN', details: { effectiveHourlyRate, absoluteMin: RATE_ABSOLUTE_MIN } }
    );
  }
  if (gate.requiresOverride && !belowThresholdApproved) {
    throw new SpecialOfferError(
      `Effective rate $${round2(effectiveHourlyRate)}/session is below the $${RATE_NO_GATE} gate. Explicit admin override is required.`,
      { code: 'OVERRIDE_REQUIRED', details: { effectiveHourlyRate, gate: RATE_NO_GATE } }
    );
  }
  if (gate.requiresReason && (!overrideReason || String(overrideReason).trim().length === 0)) {
    throw new SpecialOfferError(
      `Effective rate $${round2(effectiveHourlyRate)}/session is below the $${RATE_FLOOR} floor. A logged override reason is required.`,
      { code: 'REASON_REQUIRED', details: { effectiveHourlyRate, floor: RATE_FLOOR } }
    );
  }
  return { tier: gate.tier, requiresOverride: gate.requiresOverride, requiresReason: gate.requiresReason };
}

/**
 * Pure: map a validityType (+ optional n) to a starting redemption limit.
 * @returns {number|null} null = unlimited (ongoing / time_window)
 */
export function resolveRedemptionLimit(validityType, nTimes) {
  switch (validityType) {
    case 'one_time':
      return 1;
    case 'n_times': {
      const n = Number(nTimes);
      if (!Number.isInteger(n) || n < 2) {
        throw new SpecialOfferError('n_times requires maxRedemptions >= 2', { code: 'INVALID_NTIMES' });
      }
      return n;
    }
    case 'time_window':
      return null; // unlimited within the window (expiresAt bounds it)
    case 'ongoing':
      return null; // unlimited until admin toggles it off
    default:
      throw new SpecialOfferError(`Invalid validityType: ${validityType}`, { code: 'INVALID_VALIDITY' });
  }
}

/**
 * Pure: cross-field validity rules that resolveRedemptionLimit can't see on its own.
 * A time_window special is defined by its end date, so it MUST carry an expiresAt —
 * otherwise a "6-month / 1-year" deal would be evergreen (unlimited redemptions + no
 * expiry). (S1 hostile-review MED-1.)
 */
export function assertValidityRules({ validityType, expiresAt }) {
  if (validityType === 'time_window' && !expiresAt) {
    throw new SpecialOfferError('time_window validity requires an expiresAt date.', { code: 'EXPIRY_REQUIRED', status: 400 });
  }
  return true;
}

/**
 * Create the HIDDEN, client-scoped StorefrontItem backing a CustomPackage special.
 * `sessions`/`totalSessions` = paid+bonus so the existing grant credits the full total.
 * `price`/`totalCost` = paid total; `pricePerSession` pinned to the $175 STICKER (never
 * the effective rate). isSpecialOffer=true => excluded from the public catalog.
 * @param {object} customPackage - a persisted CustomPackage instance/plain object
 * @param {{StorefrontItem: import('sequelize').ModelStatic, transaction?: object}} deps
 */
export async function createHiddenStorefrontItemForPackage(customPackage, { StorefrontItem, transaction } = {}) {
  if (!StorefrontItem) {
    throw new SpecialOfferError('StorefrontItem model is required', { code: 'MODEL_REQUIRED', status: 500 });
  }
  const totalSessions = Number(customPackage.totalSessions);
  const paidSessions = Number(customPackage.paidSessions);
  const bonusSessions = Number(customPackage.bonusSessions);
  const totalPrice = round2(customPackage.totalPrice);

  return StorefrontItem.create({
    name: customPackage.name || 'SwanStudios Special',
    description: customPackage.description
      || `${totalSessions} sessions (${paidSessions} paid + ${bonusSessions} bonus)`,
    packageType: 'custom',
    itemKind: 'training_package',
    isTaxable: false,
    fulfillmentType: 'none',
    isSpecialOffer: true,
    isActive: true,
    sessions: totalSessions,       // grant credits the FULL total (paid + bonus)
    totalSessions,
    pricePerSession: STICKER_PER_SESSION, // sticker, NOT the effective rate
    price: totalPrice,
    totalCost: totalPrice,
    displayOrder: 9999,
  }, { transaction });
}

/**
 * IDOR + validity guard. Reusable at add-to-cart, checkout creation, and grant.
 * Throws SpecialOfferError (403/404/409/410) unless the authenticated user owns an
 * active, unexpired, still-redeemable special. Returns true on success.
 */
export function assertClientOwnsActiveSpecial({ customPackage, userId, now = new Date() }) {
  if (!customPackage) {
    throw new SpecialOfferError('Special offer not found.', { code: 'SPECIAL_NOT_FOUND', status: 404 });
  }
  if (Number(customPackage.clientId) !== Number(userId)) {
    throw new SpecialOfferError('This special offer belongs to another client.', { code: 'NOT_OWNER', status: 403 });
  }
  if (customPackage.status !== 'active') {
    throw new SpecialOfferError(`This special offer is ${customPackage.status}.`, { code: 'NOT_ACTIVE', status: 409 });
  }
  if (customPackage.expiresAt && new Date(customPackage.expiresAt).getTime() <= now.getTime()) {
    throw new SpecialOfferError('This special offer has expired.', { code: 'EXPIRED', status: 410 });
  }
  const remaining = customPackage.remainingRedemptions;
  if (remaining !== null && remaining !== undefined && Number(remaining) <= 0) {
    throw new SpecialOfferError('This special offer has no redemptions left.', { code: 'NO_REDEMPTIONS_LEFT', status: 409 });
  }
  return true;
}

/**
 * Look up the special (CustomPackage) that backs a given hidden StorefrontItem.
 * @param {number} storefrontItemId
 * @param {{CustomPackage: import('sequelize').ModelStatic, transaction?: object}} deps
 */
export async function findSpecialByStorefrontItemId(storefrontItemId, { CustomPackage, transaction } = {}) {
  if (!CustomPackage) {
    throw new SpecialOfferError('CustomPackage model is required', { code: 'MODEL_REQUIRED', status: 500 });
  }
  return CustomPackage.findOne({ where: { storefrontItemId }, transaction });
}

/**
 * Record a redemption AFTER a special is purchased (call inside the grant transaction).
 * Decrements remainingRedemptions and flips status to 'redeemed' when exhausted or one_time.
 * Double-grant idempotency is handled upstream by cart.sessionsGranted.
 * @returns {object} the applied updates (empty if unlimited/ongoing)
 */
export async function recordSpecialRedemption(customPackage, { transaction } = {}) {
  const updates = {};
  const remaining = customPackage.remainingRedemptions;
  if (remaining !== null && remaining !== undefined) {
    const left = Math.max(0, Number(remaining) - 1);
    updates.remainingRedemptions = left;
    if (left <= 0) updates.status = 'redeemed';
  } else if (customPackage.validityType === 'one_time') {
    updates.status = 'redeemed';
  }
  if (Object.keys(updates).length > 0) {
    await customPackage.update(updates, { transaction });
  }
  return updates;
}

/**
 * Load the CustomPackage specials linked to a set of cart items, keyed by storefrontItemId.
 * Uses the CustomPackage <-> storefrontItem link as the source of truth (independent of
 * whichever StorefrontItem attributes were loaded onto the cart items).
 */
async function loadSpecialsForCartItems(cartItems, { CustomPackage, transaction } = {}) {
  const map = new Map();
  if (!CustomPackage || !Array.isArray(cartItems) || cartItems.length === 0) return map;
  const ids = [...new Set(cartItems
    .map((i) => Number(i.storefrontItemId))
    .filter((n) => Number.isInteger(n) && n > 0))];
  if (ids.length === 0) return map;
  const rows = await CustomPackage.findAll({ where: { storefrontItemId: ids }, transaction });
  for (const row of rows) map.set(Number(row.storefrontItemId), row);
  return map;
}

/**
 * Guard a whole cart: for every cart item backed by a special, assert the authenticated
 * user owns an active, unexpired, still-redeemable special and that quantity is 1.
 * Throws SpecialOfferError on the first violation. No-op for carts with no specials.
 */
export async function assertCartSpecialsRedeemable({ cartItems = [], userId, CustomPackage, now = new Date() }) {
  const specials = await loadSpecialsForCartItems(cartItems, { CustomPackage });
  if (specials.size === 0) return true;
  for (const item of cartItems) {
    const special = specials.get(Number(item.storefrontItemId));
    if (!special) continue;
    assertClientOwnsActiveSpecial({ customPackage: special, userId, now });
    if (Number(item.quantity) > 1) {
      throw new SpecialOfferError('A special offer can only be purchased once per order.', { code: 'SPECIAL_QUANTITY', status: 409 });
    }
  }
  return true;
}

/**
 * Record redemptions for every special in a purchased cart. Call INSIDE the grant
 * transaction so it commits atomically with the session credit. Returns redeemed ids.
 */
export async function recordCartSpecialRedemptions({ cartItems = [], CustomPackage, transaction }) {
  const specials = await loadSpecialsForCartItems(cartItems, { CustomPackage, transaction });
  const recorded = [];
  for (const special of specials.values()) {
    await recordSpecialRedemption(special, { transaction });
    recorded.push(special.id);
  }
  return recorded;
}
