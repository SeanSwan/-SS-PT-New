/**
 * ============================================================================
 * FILE: groupAccessService.mjs
 * PURPOSE: Membership + visibility rules for SocialGroups (single source).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-14
 * ============================================================================
 *
 * RULES:
 * - Public group: any authenticated user can view meta + feed; must join to post.
 * - Private group: meta (name/emoji/description/counts) is browsable, but the
 *   feed + member list require an ACTIVE membership. Join creates a PENDING
 *   request that an owner/moderator approves.
 * - Admins (role==='admin') bypass view gates for moderation duty, not posting.
 * - Banned members are treated as non-members everywhere except re-join (403).
 */

import { SocialGroup, SocialGroupMember } from '../../models/social/index.mjs';

export async function getGroupWithMembership(groupId, userId) {
  const group = await SocialGroup.findByPk(groupId);
  if (!group) return { group: null, membership: null };
  const membership = await SocialGroupMember.findOne({ where: { groupId, userId } });
  return { group, membership };
}

export function isActiveMember(membership) {
  return Boolean(membership && membership.status === 'active');
}

export function canModerateGroup(membership, user) {
  if (user?.role === 'admin') return true;
  return isActiveMember(membership) && ['owner', 'moderator'].includes(membership.role);
}

export function isGroupOwner(membership, user) {
  if (user?.role === 'admin') return true;
  return isActiveMember(membership) && membership.role === 'owner';
}

/** View the group's CONTENT (feed, member list). Meta is always browsable. */
export function canViewGroupContent(group, membership, user) {
  if (!group || group.isArchived) return false;
  if (user?.role === 'admin') return true;
  if (group.privacy === 'public') return true;
  return isActiveMember(membership);
}

/** Post into the group's feed. Requires active membership (admins included). */
export function canPostInGroup(group, membership) {
  if (!group || group.isArchived) return false;
  return isActiveMember(membership);
}

/** Recount + persist memberCount after any membership mutation. */
export async function refreshMemberCount(groupId, transaction = null) {
  const count = await SocialGroupMember.count({
    where: { groupId, status: 'active' },
    transaction,
  });
  await SocialGroup.update(
    { memberCount: count },
    { where: { id: groupId }, transaction }
  );
  return count;
}
