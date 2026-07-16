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

import sequelize from '../../database.mjs';
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

/**
 * Guard any engagement action (view/comment/react/report/repost) on a post
 * that MAY belong to a group. Returns { ok, status, message }:
 *   - ok:true when the post is not group-scoped, or the viewer may view the
 *     group's content (public group, active member, or admin).
 *   - ok:false + 403 when it's a private group the viewer can't see.
 * Used by the pre-existing posts.mjs engagement routes so group content
 * never leaks through repost/comment/react/report/hashtag surfaces.
 */
export async function assertGroupPostAccess(post, user) {
  if (!post || !post.groupId) return { ok: true };
  const { group, membership } = await getGroupWithMembership(post.groupId, user?.id);
  // A banned member is barred from ALL engagement, even in a public group
  // (public content is otherwise open) — banning a harasser must actually
  // stop them. Admins are never banned. Checked before the view gate.
  if (user?.role !== 'admin' && membership?.status === 'banned') {
    return { ok: false, status: 403, message: 'You are banned from this group' };
  }
  if (canViewGroupContent(group, membership, user)) return { ok: true };
  return { ok: false, status: 403, message: 'Join this group to interact with its posts' };
}

/**
 * Atomically transfer group ownership to another active member. Row-locks the
 * caller's OWNER membership inside the transaction so two concurrent transfers
 * can't both pass and mint two owners. Returns { ok } or { ok:false, status,
 * message }. Caller pre-validates the group exists + is not archived.
 */
export async function transferGroupOwnership(groupId, currentOwnerId, targetUserId) {
  return sequelize.transaction(async (t) => {
    const lockedOwner = await SocialGroupMember.findOne({
      where: { groupId, userId: currentOwnerId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!lockedOwner || lockedOwner.role !== 'owner' || lockedOwner.status !== 'active') {
      return { ok: false, status: 403, message: 'Only the current group owner can transfer ownership' };
    }
    const target = await SocialGroupMember.findOne({
      where: { groupId, userId: targetUserId, status: 'active' },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!target) {
      return { ok: false, status: 404, message: 'Target must be an active member' };
    }
    await target.update({ role: 'owner' }, { transaction: t });
    await lockedOwner.update({ role: 'moderator' }, { transaction: t });
    await SocialGroup.update({ ownerId: targetUserId }, { where: { id: groupId }, transaction: t });
    return { ok: true };
  });
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
