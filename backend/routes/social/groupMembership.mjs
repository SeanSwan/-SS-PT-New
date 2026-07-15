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
} from '../../services/social/groupAccessService.mjs';
import { sendSocialRouteError } from './socialRouteResponse.helpers.mjs';
import {
  addUserToGroupChat,
  removeUserFromGroupChat,
} from '../../services/social/groupChatLinkService.mjs';

const router = express.Router();

const USER_PREVIEW_ATTRS = ['id', 'firstName', 'lastName', 'username', 'photo', 'role'];

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

function serializeGroup(group, membership = null) {
  const json = typeof group.toJSON === 'function' ? group.toJSON() : { ...group };
  return {
    ...json,
    myMembership: membership ? { role: membership.role, status: membership.status } : null,
  };
}

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
    const created = await SocialGroupMember.create({ groupId, userId: req.user.id, role: 'member', status });
    if (status === 'active') {
      await refreshMemberCount(groupId);
      if (group.conversationId) {
        try { await addUserToGroupChat(group.conversationId, req.user.id); } catch { /* best-effort */ }
      }
    }
    await group.reload();
    return res.status(201).json({
      success: true,
      group: serializeGroup(group, created),
      message: status === 'pending' ? 'Join request sent' : 'Welcome to the group!',
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
      return res.status(400).json({ success: false, message: 'Transfer ownership before leaving your group' });
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

    const includePending = canModerateGroup(membership, req.user);
    const statuses = includePending ? ['active', 'pending'] : ['active'];
    const members = await SocialGroupMember.findAll({
      where: { groupId, status: { [Op.in]: statuses } },
      order: [['role', 'ASC'], ['createdAt', 'ASC']],
      limit: 200,
    });

    const users = await getUser().findAll({
      where: { id: { [Op.in]: members.map((m) => m.userId) } },
      attributes: USER_PREVIEW_ATTRS,
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

/** POST /:id/members/:userId/approve — approve a pending request (mods). */
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

    const target = await SocialGroupMember.findOne({ where: { groupId, userId: targetUserId, status: 'pending' } });
    if (!target) return res.status(404).json({ success: false, message: 'No pending request for that user' });

    await target.update({ status: 'active' });
    await refreshMemberCount(groupId);
    if (group.conversationId) {
      try { await addUserToGroupChat(group.conversationId, targetUserId); } catch { /* best-effort */ }
    }
    return res.json({ success: true, message: 'Member approved' });
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

export default router;
