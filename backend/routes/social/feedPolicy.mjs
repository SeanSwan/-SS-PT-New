/**
 * feedPolicy — pure visibility + input policy for the social feed
 * ================================================================
 * WHY (trust triple 2026-07-06): the friends feed previously unioned
 * (own + friend ids) with public posts, which leaked friends' PRIVATE
 * posts into the feed — the single-post route correctly blocks them.
 * Policy: own posts render at ANY visibility, friends' posts only at
 * public/friends, strangers only at public.
 *
 * Also normalizes composer post types: the Home composer's
 * 'transformation' mood is not a SocialPost.type ENUM label and used
 * to 500 at the model. Aliases map to real labels; unknowns fall back.
 *
 * Pure module by design (only sequelize Op) so it unit-tests without a DB.
 */
import { Op } from 'sequelize';

export const TYPE_ALIASES = Object.freeze({ transformation: 'milestone' });

export function normalizePostType(rawType, allowedTypes, fallback = 'general') {
  const raw = typeof rawType === 'string' ? rawType.trim() : '';
  const candidate = TYPE_ALIASES[raw] || raw;
  return Array.isArray(allowedTypes) && allowedTypes.includes(candidate) ? candidate : fallback;
}

export function buildFeedVisibilityWhere(viewerId, friendIds = []) {
  const branches = [{ userId: viewerId }];
  if (friendIds.length > 0) {
    branches.push({
      userId: { [Op.in]: friendIds },
      visibility: { [Op.in]: ['public', 'friends'] },
    });
  }
  branches.push({ visibility: 'public' });
  return { [Op.or]: branches };
}

export default { TYPE_ALIASES, normalizePostType, buildFeedVisibilityWhere };
