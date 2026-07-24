/**
 * shadowObserver.mjs — S1 SHADOW price observation at the cart choke point.
 * ============================================================================
 * Extracted from cartRoutes.mjs (Kimi K3 S1 code-review blocker: route files must not carry
 * self-contained economics logic; the ≤300-line cap and separation-of-concerns both apply).
 * The cart route now imports one function and calls it; all the observation logic lives here.
 *
 * WHAT IT DOES: runs the pure price resolver against an item being added to a cart and appends
 * ONE PriceChangeLog row recording what the resolver WOULD do (source, wouldHaveClamped). While
 * `priceFloorEnforce` is off (S1 default), it enforces nothing and the cart's real price is
 * untouched. S2 flips the flag and the resolved price is actually used at the cart.
 *
 * HARD GUARANTEE — ZERO BEHAVIOR CHANGE: `observeCartAdd` is best-effort and fully guarded. Any
 * error (model not registered pre-migration, resolver bug, DB write failure) is swallowed after a
 * debug log. It resolves to undefined and NEVER throws into the cart flow. The cart add must
 * succeed identically whether or not this observation runs.
 *
 * PRIVACY (rule 8): rows carry IDs, roles, amounts, and small boolean/number context — no PII.
 *
 * @module services/economics/shadowObserver
 */
import logger from '../../utils/logger.mjs';
import { resolve as resolvePrice } from './priceResolver.mjs';
import { append as auditAppend } from '../audit/auditWriter.mjs';
import { getEconomicsFlags } from '../../config/economicsFlags.mjs';

/**
 * S1 SHADOW floor — the platform per-session floor used FOR OBSERVATION ONLY.
 * ============================================================================
 * Sean's locked decision #1 is a $40/session floor. That value is known now, before S2's
 * `PricingGovernanceConfig` table exists. S1 needs it so `wouldHaveClamped` is actually
 * COMPUTED (the whole point of shadow logging is to observe how often carts resolve below the
 * floor BEFORE enforcing — with no floor, wouldHaveClamped is always false and S1 sees nothing,
 * and S2's "reconcile S1 shadow data with S2 live clamps" acceptance is meaningless).
 *
 * This is NOT enforcement and NOT the config store — `priceFloorEnforce` stays false, so the
 * resolved price is never used by the cart. S2 REPLACES this constant with a read from the
 * audited config table (blueprint "Do NOT store floor in an env var" applies to enforcement).
 */
export const S1_SHADOW_FLOOR = 40;

/** Physical products have no per-session floor concept — skip them. Mirrors cartRoutes' own check
 * (kept local so this module has no dependency back on the route file). */
const isPhysicalProduct = (storefrontItem) => storefrontItem?.itemKind === 'physical_product';

/**
 * Observe (shadow-log) the price resolution for an item just added to a cart.
 * Best-effort; never throws; never affects the cart.
 *
 * @param {object} args
 * @param {object} args.storefrontItem  The resolved storefront item (from resolveCartItemSnapshot).
 * @param {number} args.chargedPrice    The price the cart actually used (snapshot.price) — logged as context.
 * @param {object} [args.actor]         { userId, role } of the buyer, for provenance.
 * @returns {Promise<void>}
 */
export const observeCartAdd = async ({ storefrontItem, chargedPrice, actor } = {}) => {
  try {
    // Only meaningful for per-session training packages; physical products have no session floor.
    if (!storefrontItem || isPhysicalProduct(storefrontItem)) return;

    const flags = getEconomicsFlags();
    // Kill switch: ops can silence shadow observation entirely without a code change.
    if (!flags.priceShadowObserve) return;

    // Resolve against the known S1 shadow floor so wouldHaveClamped is genuinely observed.
    // `enforce` mirrors the flag (default false) — in S1 the resolved price is discarded either way.
    const resolved = resolvePrice({
      storeFrontItem: storefrontItem,
      activeSpecials: [],
      floorConfig: { floor: S1_SHADOW_FLOOR },
      now: new Date(),
      enforce: flags.priceFloorEnforce,
    });

    // newPrice is NOT NULL in the model. Prefer the resolver's price, fall back to the charged
    // price; if NEITHER is a usable number, skip the observation rather than attempt a doomed
    // write (keeps the audit trail clean instead of relying on the catch to swallow a constraint error).
    const newPrice = typeof resolved.price === 'number'
      ? resolved.price
      : (typeof chargedPrice === 'number' ? chargedPrice : null);
    if (newPrice === null) return;

    await auditAppend({
      table: 'price_change_log',
      row: {
        storeFrontItemId: storefrontItem.id,
        oldPrice: null,
        newPrice,
        source: 'shadow',
        wouldHaveClamped: resolved.wouldHaveClamped,
      },
      actor: actor && actor.userId !== undefined ? { userId: actor.userId, role: actor.role } : undefined,
      context: {
        resolverSource: resolved.source,
        basePrice: resolved.basePrice,
        shadowFloor: S1_SHADOW_FLOOR,
        chargedPrice: typeof chargedPrice === 'number' ? chargedPrice : null,
        floorEnforce: flags.priceFloorEnforce,
      },
    });
  } catch (error) {
    // Never let the shadow observation affect the cart. Debug-log and move on.
    logger.debug('[econ-shadow] cart price observation skipped', {
      errorName: error?.name || 'Error',
      errorCode: error?.code || error?.type || 'econ_shadow_observation_failed',
    });
  }
};

export default { observeCartAdd, S1_SHADOW_FLOOR };