/**
 * ============================================================================
 * FILE: groupRouteHelpers.mjs
 * PURPOSE: Shared helpers for the group route modules (groups.mjs +
 *          groupMembership.mjs) — id coercion + group serialization.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-15
 * ============================================================================
 */

export const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

/** Serialize a SocialGroup for the API, attaching the viewer's membership. */
export function serializeGroup(group, membership = null) {
  const json = typeof group.toJSON === 'function' ? group.toJSON() : { ...group };
  return {
    ...json,
    myMembership: membership ? { role: membership.role, status: membership.status } : null,
  };
}
