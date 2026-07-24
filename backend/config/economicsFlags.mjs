/**
 * economicsFlags.mjs — one config surface for every trainer-economics enforcement flag.
 * ============================================================================
 * Kimi K3 blueprint principle "Shadow before teeth": every enforcement mechanism
 * (pricing floor, fraud ladder, throttle) ships LOGGING-ONLY first, proves itself
 * against production data, then flips its enforcement flag. All flags live HERE so
 * there is exactly one place to read/flip them — never a hardcoded literal in a service.
 *
 * Defaults are the SAFE (observe-only) values. Each flag is overridable via an env var
 * so ops can flip enforcement on a deployed service without a code change:
 *   ECON_PRICE_FLOOR_ENFORCE=true   → S2 floor clamps carts (default: shadow-log only)
 *   ECON_PRICE_SHADOW_OBSERVE=false → S1 stops writing shadow observations (default: observing ON)
 *   ECON_FRAUD_SHADOW=false         → S8 detector leaves shadow mode (default: shadow ON)
 *   ECON_THROTTLE_ENFORCE=true      → S11 auto-throttle acts (default: metering only)
 *
 * These flags gate MONEY + AVAILABILITY behavior. Flipping any of them is a high-stakes
 * action — the change belongs in a reviewed deploy, not an ad-hoc runtime toggle.
 *
 * S1 (2026-07-23): `priceFloorEnforce` (default false) and `priceShadowObserve` (default true)
 * are read by the shadow-mode cart resolver. `fraudShadow` / `throttleEnforce` are declared now
 * so later slices import a stable shape.
 *
 * @module config/economicsFlags
 */

/** Parse a boolean-ish env var. Only the literal string 'true' (case-insensitive, trimmed)
 * flips a flag; anything else — unset, 'false', '1', '0', garbage — keeps the safe default.
 * Fail-safe by construction: a typo in the env var never accidentally enables enforcement. */
const envBool = (name, fallback) => {
  const raw = process.env[name];
  if (raw === undefined || raw === null) return fallback;
  return String(raw).trim().toLowerCase() === 'true';
};

/**
 * Resolve the current economics flags. Reads `process.env` on every call so a test can
 * set an env var and observe the effect without module-cache reset. Cheap (3 env reads).
 *
 * @returns {{ priceFloorEnforce: boolean, priceShadowObserve: boolean, fraudShadow: boolean, throttleEnforce: boolean }}
 */
export const getEconomicsFlags = () => ({
  // S2: when true, the price resolver CLAMPS carts to the floor. When false (default),
  // the resolver still RUNS but its result is discarded and only `wouldHaveClamped` is logged.
  priceFloorEnforce: envBool('ECON_PRICE_FLOOR_ENFORCE', false),
  // S1: when true (default), the cart choke point writes a shadow PriceChangeLog observation per
  // add. Kill switch — set ECON_PRICE_SHADOW_OBSERVE=false to silence the observation entirely
  // (e.g. if it ever adds measurable cart latency) without touching code.
  priceShadowObserve: envBool('ECON_PRICE_SHADOW_OBSERVE', true),
  // S8: when true, the fraud detector leaves shadow mode and its scores can drive the
  // response ladder. Default true = shadow ON = scores computed, ZERO trainer-facing effect.
  fraudShadow: envBool('ECON_FRAUD_SHADOW', true),
  // S11: when true, usage over 100% cap auto-throttles AI + bandwidth. Default false =
  // metering only, no automatic availability changes.
  throttleEnforce: envBool('ECON_THROTTLE_ENFORCE', false),
});

export default getEconomicsFlags;
