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
