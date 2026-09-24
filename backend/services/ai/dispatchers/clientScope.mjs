/**
 * Client scope helpers for AI command dispatchers.
 * Keeps the route-selected/resolved client authoritative over stale classifier
 * params when a command runs after client resolution or confirmation.
 */

const toPositiveClientId = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const resolveCommandClientId = (params = {}, ctx = {}) => (
  toPositiveClientId(ctx.resolvedClient?.id) ?? toPositiveClientId(params.clientId)
);

/**
 * The PRE-COLLAPSE pair — card 1.2 / finding FF19 (GLM 5.3-flash, 2026-09-01).
 *
 * `resolveCommandClientId` collapses two competing identities into one before
 * anything downstream can compare them: the client the operator SELECTED
 * (`ctx.resolvedClient`) and the client the classifier EXTRACTED from speech
 * (`params.clientId`). That collapse is correct for dispatch — the selection
 * must win — but it destroys the very comparison the cross-client alarm needs.
 * Wire the confirmation tier to post-collapse values and `cross_client` becomes
 * unreachable by construction: both sides are the same number, the alarm never
 * fires, and the tests pass while proving nothing.
 *
 * So the tier consumes THIS instead: both candidates, plus the effective value
 * (identical to resolveCommandClientId, so dispatch behaviour is unchanged) and
 * a marker for where the effective value came from.
 *
 * @returns {{ locked: number|null, target: number|null, effective: number|null,
 *             collapsedFrom: 'selection'|'params'|'none' }}
 */
export const resolveCommandClientPair = (params = {}, ctx = {}) => {
  const locked = toPositiveClientId(ctx.resolvedClient?.id);
  const target = toPositiveClientId(params.clientId);
  const effective = locked ?? target;
  return {
    locked,
    target,
    effective,
    collapsedFrom: locked !== null ? 'selection' : (target !== null ? 'params' : 'none'),
  };
};
