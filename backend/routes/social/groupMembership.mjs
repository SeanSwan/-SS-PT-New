/**
 * ============================================================================
 * FILE: groupMembership.mjs
 * PURPOSE: Membership endpoints for community groups — join, leave, member
 *          list, approvals, roles, removal/ban.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-14
 * MOUNTED BY: routes/social/groups.mjs (paths relative to /api/social/groups)
 * ============================================================================
 */

import express from 'express';
import { Op } from 'sequelize';
import { getUser } from '../../models/index.mjs';
import { SocialGroupMember } from '../../models/social/index.mjs';
import {
  canModerateGroup,
  canViewGroupContent,
  getGroupWithMembership,
  isGroupOwner,
  refreshMemberCount,
  transferGroupOwnership,
} from '../../services/social/groupAccessService.mjs';
import { directoryAttributes } from '../../utils/memberDirectoryAccess.mjs';
import { sendSocialRouteError } from './socialRouteResponse.helpers.mjs';
import { serializeGroup, toPositiveInt } from './groupRouteHelpers.mjs';
import {
  addUserToGroupChat,
  removeUserFromGroupChat,
} from '../../services/social/groupChatLinkService.mjs';

const router = express.Router();

// Viewer-aware: a module constant cannot be, and this shipped up to 200
// members' surnames per public group to any authenticated non-member.
const userPreviewAttrs = (viewer, extra = ['role']) =>
  directoryAttributes(viewer, extra.includes('role') ? extra : ['role', ...extra]);

/** POST /:id/join — public: active member; private: pending request. */
router.post('/:id/join', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: 'Valid group id required' });

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) return res.status(404).json({ success: false, message: 'Group not found' });

    if (membership) {
      if (membership.status === 'banned') {
        return res.status(403).json({ success: false, message: 'You cannot join this group' });
      }
      return res.json({
        success: true,
        group: serializeGroup(group, membership),
        message: membership.status === 'pending' ? 'Join request already pending' : 'Already a member',
      });
    }

    const status = group.privacy === 'private' ? 'pending' : 'active';
    // findOrCreate makes a concurrent double-tap idempotent instead of a
    // 500: the second racer hits the UNIQUE(groupId,userId) and reuses the
    // existing row rather than throwing SequelizeUniqueConstraintError.
    const [created, wasCreated] = await SocialGroupMember.findOrCreate({
      where: { groupId, userId: req.user.id },
      defaults: { groupId, userId: req.user.id, role: 'member', status },
    });
    if (wasCreated && created.status === 'active') {
      await refreshMemberCount(groupId);
      if (group.conversationId) {
        try { await addUserToGroupChat(group.conversationId, req.user.id); } catch { /* best-effort */ }
      }
    }
    await group.reload();
    return res.status(wasCreated ? 201 : 200).json({
      success: true,
      group: serializeGroup(group, created),
      message: !wasCreated
        ? (created.status === 'pending' ? 'Join request already pending' : 'Already a member')
        : status === 'pending' ? 'Join request sent' : 'Welcome to the group!',
    });
  } catch (error) {
    console.error('Error joining group:', error);
    return sendSocialRouteError(res, 500, 'Failed to join group');
  }
});

/** DELETE /:id/leave — leave the group (owner must transfer first). */
router.delete('/:id/leave', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: 'Valid group id required' });

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || !membership) return res.status(404).json({ success: false, message: 'Group membership not found' });
    if (membership.role === 'owner') {
      // An owner can't just leave (would orphan the group) — but if they're the
      // ONLY member, leaving retires the group (archive) instead of dead-ending.
      const otherActive = await SocialGroupMember.count({
        where: { groupId, status: 'active', userId: { [Op.ne]: req.user.id } },
      });
      if (otherActive > 0) {
        return res.status(400).json({ success: false, message: 'Transfer ownership before leaving your group' });
      }
      await membership.destroy();
      await group.update({ isArchived: true });
      return res.json({ success: true, message: 'You left and archived the group' });
    }

    await membership.destroy();
    await refreshMemberCount(groupId);
    if (group.conversationId) {
      try { await removeUserFromGroupChat(group.conversationId, req.user.id); } catch { /* best-effort */ }
    }
    return res.json({ success: true, message: 'You left the group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    return sendSocialRouteError(res, 500, 'Failed to leave group');
  }
});

/** GET /:id/members — active members (+ pending for moderators). */
router.get('/:id/members', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: 'Valid group id required' });

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!canViewGroupContent(group, membership, req.user)) {
      return res.status(403).json({ success: false, message: 'Join this group to see its members' });
    }

    // Moderators also see pending (to approve) and banned (to reinstate).
    const includeManaged = canModerateGroup(membership, req.user);
    const statuses = includeManaged ? ['active', 'pending', 'banned'] : ['active'];
    const members = await SocialGroupMember.findAll({
      where: { groupId, status: { [Op.in]: statuses } },
      order: [['role', 'ASC'], ['createdAt', 'ASC']],
      limit: 200,
    });

    const users = await getUser().findAll({
      where: { id: { [Op.in]: members.map((m) => m.userId) } },
      attributes: userPreviewAttrs(req.user),
      raw: true,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return res.json({
      success: true,
      members: members.map((m) => ({
        userId: m.userId,
        role: m.role,
        status: m.status,
        joinedAt: m.createdAt,
        user: userMap.get(m.userId) || null,
      })),
    });
  } catch (error) {
    console.error('Error listing group members:', error);
    return sendSocialRouteError(res, 500, 'Failed to load group members');
  }
});

/** POST /:id/members/:userId/approve — approve a pending request OR reinstate
    a banned member (both → active). Moderator-gated. */
router.post('/:id/members/:userId/approve', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    const targetUserId = toPositiveInt(req.params.userId);
    if (!groupId || !targetUserId) return res.status(400).json({ success: false, message: 'Valid ids required' });

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!canModerateGroup(membership, req.user)) {
      return res.status(403).json({ success: false, message: 'Only group moderators can approve members' });
    }

    const target = await SocialGroupMember.findOne({
      where: { groupId, userId: targetUserId, status: { [Op.in]: ['pending', 'banned'] } },
    });
    if (!target) return res.status(404).json({ success: false, message: 'No pending or banned member for that user' });
    const wasBanned = target.status === 'banned';

    await target.update({ status: 'active' });
    await refreshMemberCount(groupId);
    if (group.conversationId) {
      try { await addUserToGroupChat(group.conversationId, targetUserId); } catch { /* best-effort */ }
    }
    return res.json({ success: true, message: wasBanned ? 'Member reinstated' : 'Member approved' });
  } catch (error) {
    console.error('Error approving group member:', error);
    return sendSocialRouteError(res, 500, 'Failed to approve member');
  }
});

/** PATCH /:id/members/:userId — change role member<->moderator (owner only). */
router.patch('/:id/members/:userId', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    const targetUserId = toPositiveInt(req.params.userId);
    const nextRole = req.body.role;
    if (!groupId || !targetUserId || !['member', 'moderator'].includes(nextRole)) {
      return res.status(400).json({ success: false, message: 'Valid ids and role (member|moderator) required' });
    }

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!isGroupOwner(membership, req.user)) {
      return res.status(403).json({ success: false, message: 'Only the group owner can change roles' });
    }

    const target = await SocialGroupMember.findOne({ where: { groupId, userId: targetUserId, status: 'active' } });
    if (!target) return res.status(404).json({ success: false, message: 'Active member not found' });
    if (target.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Owner role cannot be changed here' });
    }

    await target.update({ role: nextRole });
    return res.json({ success: true, message: `Member is now a ${nextRole}` });
  } catch (error) {
    console.error('Error updating member role:', error);
    return sendSocialRouteError(res, 500, 'Failed to update member role');
  }
});

/** DELETE /:id/members/:userId — remove (or ban with ?ban=true) a member. */
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    const targetUserId = toPositiveInt(req.params.userId);
    if (!groupId || !targetUserId) return res.status(400).json({ success: false, message: 'Valid ids required' });

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!canModerateGroup(membership, req.user)) {
      return res.status(403).json({ success: false, message: 'Only group moderators can remove members' });
    }

    const target = await SocialGroupMember.findOne({ where: { groupId, userId: targetUserId } });
    if (!target) return res.status(404).json({ success: false, message: 'Member not found' });
    if (target.role === 'owner') {
      return res.status(400).json({ success: false, message: 'The owner cannot be removed' });
    }
    // Moderators cannot remove other moderators — only the owner can.
    if (target.role === 'moderator' && !isGroupOwner(membership, req.user)) {
      return res.status(403).json({ success: false, message: 'Only the owner can remove a moderator' });
    }

    if (req.query.ban === 'true') {
      await target.update({ status: 'banned', role: 'member' });
    } else {
      await target.destroy();
    }
    await refreshMemberCount(groupId);
    if (group.conversationId) {
      try { await removeUserFromGroupChat(group.conversationId, targetUserId); } catch { /* best-effort */ }
    }
    return res.json({ success: true, message: req.query.ban === 'true' ? 'Member banned' : 'Member removed' });
  } catch (error) {
    console.error('Error removing group member:', error);
    return sendSocialRouteError(res, 500, 'Failed to remove member');
  }
});

/** POST /:id/transfer-ownership — hand the group to another active member.
    Resolves the "transfer before leaving" instruction the API gives owners.
    The atomic, race-safe swap lives in groupAccessService.transferGroupOwnership. */
router.post('/:id/transfer-ownership', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    const targetUserId = toPositiveInt(req.body.userId);
    if (!groupId || !targetUserId) {
      return res.status(400).json({ success: false, message: 'Valid group id and userId required' });
    }
    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You already own this group' });
    }

    // Reject transfers on a missing/archived group before the swap — the
    // service assumes the caller has done this existence/archived check.
    const { group } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const result = await transferGroupOwnership(groupId, req.user.id, targetUserId);
    if (!result.ok) return res.status(result.status).json({ success: false, message: result.message });
    return res.json({ success: true, message: 'Ownership transferred' });
  } catch (error) {
    console.error('Error transferring ownership:', error);
    return sendSocialRouteError(res, 500, 'Failed to transfer ownership');
  }
});

export default router;
