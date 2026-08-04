/**
 * Member directory access — one place that answers
 * "what may THIS viewer see of OTHER users, and how much of it?"
 * =============================================================================
 *
 * Why this exists. The same five-part defect was found and fixed three separate
 * times, on three sibling endpoints, over four review rounds:
 *
 *   1. surnames shipped to members       (full legal names of staff included)
 *   2. no role filter                    (trainers/admins ranked among members)
 *   3. unbounded `page`                  (walk the whole Users table)
 *   4. unvalidated `tier`                (partition the table into slices)
 *   5. `count` returned                  (exact population / per-slice headcount)
 *
 * Each fix landed on one handler and the class stayed open next door —
 * `/gamification/leaderboard` was hardened while `/gamification/discover-users`,
 * 60 lines below it in the same routes file, still had all five.
 *
 * So the rule lives here, not in the handlers. A new member-facing directory
 * endpoint should import these instead of hand-rolling attribute lists and
 * offsets, and the enumeration guard test asserts the shared behaviour.
 */
import { Op } from 'sequelize';
import { LEGACY_TIER_ALIAS_KEYS, RANK_TITLES } from './levelingAlgorithm.mjs';

/** Roles that are ordinary members. `User.role` defaults to 'user'. */
export const MEMBER_ROLES = Object.freeze(['user', 'client']);

/** A member-facing directory is a TOP-N, never a cursor over the user table. */
export const MEMBER_MAX_ROWS = 100;

export const isStaffViewer = (user) =>
  user?.role === 'admin' || user?.role === 'trainer';

/**
 * Every tier value the system can actually STORE.
 *
 * Derived from `RANK_TITLES`, which is what `getTier()` writes — an earlier
 * allowlist was hand-copied from the legacy ALIAS map and covered 6 of ~100
 * storable values, so every member past level 10 had their tier filter
 * silently discarded while the code claimed to validate it.
 */
export const STORABLE_TIER_KEYS = Object.freeze(
  new Set([
    // What getTier() writes today.
    ...RANK_TITLES.map((rank) => rank.key),
    // ...plus the legacy aliases still sitting on existing rows. `User.tier`
    // DEFAULTS to `bronze_forge`, which is an alias and not a rank key — so
    // taking only the rank keys would have rejected the single most common
    // stored value on the platform.
    ...LEGACY_TIER_ALIAS_KEYS,
  ]),
);

export const isKnownTier = (tier, extraKeys) =>
  typeof tier === 'string'
  && (STORABLE_TIER_KEYS.has(tier) || Boolean(extraKeys?.has?.(tier)));

/**
 * Attributes safe to return about OTHER users.
 * Surnames are staff-only: member surfaces render firstName/username.
 */
export function directoryAttributes(user, extra = []) {
  return [
    'id',
    'firstName',
    ...(isStaffViewer(user) ? ['lastName'] : []),
    'username',
    'photo',
    ...extra,
  ];
}

/**
 * Offset a viewer may reach. Members get NO paging: the top of a slice is all
 * there is, whatever tier/metric/timeframe is requested. Capping page DEPTH was
 * not enough — the reachable set is the union over the parameter space.
 */
export const directoryOffset = (user, rawOffset) =>
  (isStaffViewer(user) ? rawOffset : 0);

export const directoryLimit = (user, normalizedLimit) =>
  (isStaffViewer(user) ? normalizedLimit : Math.min(normalizedLimit, MEMBER_MAX_ROWS));

/** Members are never told the population — that is a per-slice headcount. */
export const directoryTotal = (user, trueTotal, returnedRowCount) =>
  (isStaffViewer(user) ? trueTotal : returnedRowCount);

/** Restrict a where-clause to members unless the viewer is staff. */
export function scopeToMembers(user, whereClause = {}) {
  if (isStaffViewer(user)) return whereClause;
  return { ...whereClause, role: { [Op.in]: [...MEMBER_ROLES] } };
}

export default {
  MEMBER_ROLES,
  MEMBER_MAX_ROWS,
  STORABLE_TIER_KEYS,
  isStaffViewer,
  isKnownTier,
  directoryAttributes,
  directoryOffset,
  directoryLimit,
  directoryTotal,
  scopeToMembers,
};
