/**
 * ============================================================================
 * FILE: groups.mjs
 * PURPOSE: First-class community groups API — discovery, create, detail,
 *          update, and the group's own feed. Membership endpoints live in
 *          groupMembership.mjs (mounted below).
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-14
 * MOUNTED AT: /api/social/groups (routes/social/index.mjs, protect-gated)
 * ============================================================================
 *
 * Groups upgrade 2026-07-14 (Sean directive): "chat groups" become real
 * communities — identity, privacy, membership roles, discovery, and a feed
 * of their own (SocialPosts.groupId), with chat still linked to messaging.
 * Access rules live in services/social/groupAccessService.mjs.
 */

import express from 'express';
import { Op } from 'sequelize';
import sequelize from '../../database.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import { getUser } from '../../models/index.mjs';
import {
  SocialGroup,
  SocialGroupMember,
  SocialPost,
} from '../../models/social/index.mjs';
import { GROUP_CATEGORY_VALUES, GROUP_PRIVACY_VALUES } from '../../models/social/SocialGroup.mjs';
import {
  canModerateGroup,
  canPostInGroup,
  canViewGroupContent,
  getGroupWithMembership,
  isGroupOwner,
} from '../../services/social/groupAccessService.mjs';
import { decoratePostsForFeed } from '../../services/social/postFeedFormatter.mjs';
import { attachWorkoutDataToPost } from './socialWorkoutData.mjs';
import { sendSocialRouteError } from './socialRouteResponse.helpers.mjs';
import { serializeGroup, toPositiveInt } from './groupRouteHelpers.mjs';
import { ensureGroupConversation } from '../../services/social/groupChatLinkService.mjs';
import groupMembershipRoutes from './groupMembership.mjs';
import { directoryAttributes } from '../../utils/memberDirectoryAccess.mjs';

const router = express.Router();
router.use(protect);

// Viewer-aware: a module constant cannot be, and this shipped up to 200
// members' surnames per public group to any authenticated non-member.
const userPreviewAttrs = (viewer, extra = ['role']) =>
  directoryAttributes(viewer, extra.includes('role') ? extra : ['role', ...extra]);

/** GET / — discovery + my groups. Query: mine=true | search | category */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 24, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const mine = req.query.mine === 'true';

    const where = { isArchived: false };
    if (req.query.category && GROUP_CATEGORY_VALUES.includes(req.query.category)) {
      where.category = req.query.category;
    }
    if (req.query.search) {
      const term = `%${String(req.query.search).slice(0, 60)}%`;
      where[Op.or] = [
        { name: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
      ];
    }

    if (mine) {
      const memberships = await SocialGroupMember.findAll({
        where: { userId: req.user.id, status: { [Op.in]: ['active', 'pending'] } },
        attributes: ['groupId'],
      });
      const groupIds = memberships.map((m) => m.groupId);
      if (groupIds.length === 0) {
        return res.json({ success: true, groups: [], pagination: { limit, offset, total: 0 } });
      }
      where.id = { [Op.in]: groupIds };
    }

    const { rows, count } = await SocialGroup.findAndCountAll({
      where,
      order: [
        [sequelize.literal('"lastActivityAt" IS NULL'), 'ASC'],
        ['lastActivityAt', 'DESC'],
        ['memberCount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit,
      offset,
    });

    const memberships = await SocialGroupMember.findAll({
      where: { userId: req.user.id, groupId: { [Op.in]: rows.map((g) => g.id) } },
    });
    const membershipMap = new Map(memberships.map((m) => [m.groupId, m]));

    return res.json({
      success: true,
      groups: rows.map((g) => serializeGroup(g, membershipMap.get(g.id) || null)),
      pagination: { limit, offset, total: count },
    });
  } catch (error) {
    console.error('Error listing groups:', error);
    return sendSocialRouteError(res, 500, 'Failed to load groups');
  }
});

/** POST / — create a group; creator becomes owner; chat conversation linked. */
router.post('/', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 3 || name.length > 80) {
      return res.status(400).json({ success: false, message: 'Group name must be 3-80 characters' });
    }
    const description = req.body.description ? String(req.body.description).slice(0, 2000) : null;
    const emoji = req.body.emoji ? String(req.body.emoji).slice(0, 16) : null;
    const category = GROUP_CATEGORY_VALUES.includes(req.body.category) ? req.body.category : 'general';
    const privacy = GROUP_PRIVACY_VALUES.includes(req.body.privacy) ? req.body.privacy : 'public';

    const group = await sequelize.transaction(async (t) => {
      const created = await SocialGroup.create(
        {
          name, description, emoji, category, privacy,
          ownerId: req.user.id,
          memberCount: 1,
          lastActivityAt: new Date(),
        },
        { transaction: t }
      );
      await SocialGroupMember.create(
        { groupId: created.id, userId: req.user.id, role: 'owner', status: 'active' },
        { transaction: t }
      );
      return created;
    });

    // Chat linkage is best-effort: a messaging hiccup must not kill the group.
    try {
      const conversationId = await ensureGroupConversation(group, req.user.id);
      if (conversationId) await group.update({ conversationId });
    } catch (chatError) {
      console.warn(`Group ${group.id} chat linkage failed (non-fatal):`, chatError.message);
    }

    const membership = await SocialGroupMember.findOne({ where: { groupId: group.id, userId: req.user.id } });
    return res.status(201).json({ success: true, group: serializeGroup(group, membership) });
  } catch (error) {
    console.error('Error creating group:', error);
    return sendSocialRouteError(res, 500, 'Failed to create group');
  }
});

/** GET /:id — group detail (meta browsable; content flags per access rules). */
router.get('/:id', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: 'Valid group id required' });

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    return res.json({
      success: true,
      group: {
        ...serializeGroup(group, membership),
        canViewContent: canViewGroupContent(group, membership, req.user),
        canPost: canPostInGroup(group, membership),
        canModerate: canModerateGroup(membership, req.user),
      },
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    return sendSocialRouteError(res, 500, 'Failed to load group');
  }
});

/** PUT /:id — update meta (owner/moderator). */
router.put('/:id', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: 'Valid group id required' });

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!canModerateGroup(membership, req.user)) {
      return res.status(403).json({ success: false, message: 'Only group moderators can edit the group' });
    }

    const updates = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 3 || name.length > 80) {
        return res.status(400).json({ success: false, message: 'Group name must be 3-80 characters' });
      }
      updates.name = name;
    }
    if (req.body.description !== undefined) updates.description = String(req.body.description).slice(0, 2000);
    if (req.body.emoji !== undefined) updates.emoji = req.body.emoji ? String(req.body.emoji).slice(0, 16) : null;
    if (req.body.category !== undefined && GROUP_CATEGORY_VALUES.includes(req.body.category)) updates.category = req.body.category;
    if (req.body.privacy !== undefined && GROUP_PRIVACY_VALUES.includes(req.body.privacy)) updates.privacy = req.body.privacy;

    await group.update(updates);
    return res.json({ success: true, group: serializeGroup(group, membership) });
  } catch (error) {
    console.error('Error updating group:', error);
    return sendSocialRouteError(res, 500, 'Failed to update group');
  }
});

/** DELETE /:id — archive the group (owner or admin). Soft delete: isArchived
    hides it from discovery/feed/join everywhere. Resolves the sole-owner
    dead-end (owner who can't leave/transfer can now retire the group). */
router.delete('/:id', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: 'Valid group id required' });

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) return res.status(404).json({ success: false, message: 'Group not found' });
    // Only the owner (or a platform admin) may retire a group.
    if (!isGroupOwner(membership, req.user)) {
      return res.status(403).json({ success: false, message: 'Only the group owner can archive this group' });
    }

    await group.update({ isArchived: true });
    return res.json({ success: true, message: 'Group archived' });
  } catch (error) {
    console.error('Error archiving group:', error);
    return sendSocialRouteError(res, 500, 'Failed to archive group');
  }
});

/** GET /:id/feed — the group's own post feed (same shape as the main feed). */
router.get('/:id/feed', async (req, res) => {
  try {
    const groupId = toPositiveInt(req.params.id);
    if (!groupId) return res.status(400).json({ success: false, message: 'Valid group id required' });
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const { group, membership } = await getGroupWithMembership(groupId, req.user.id);
    if (!group || group.isArchived) return res.status(404).json({ success: false, message: 'Group not found' });
    if (!canViewGroupContent(group, membership, req.user)) {
      return res.status(403).json({ success: false, message: 'Join this group to see its feed' });
    }

    const where = { groupId, moderationStatus: { [Op.or]: ['approved', null] } };
    const posts = await SocialPost.findAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: getUser(),
        as: 'user',
        attributes: userPreviewAttrs(req.user, ['clientSource', 'level', 'tier', 'points']),
      }],
    });

    const decorated = await decoratePostsForFeed(posts, req.user.id);
    return res.json({
      success: true,
      posts: decorated.map(attachWorkoutDataToPost),
      group: serializeGroup(group, membership),
      canPost: canPostInGroup(group, membership),
      pagination: { limit, offset, total: await SocialPost.count({ where }) },
    });
  } catch (error) {
    console.error('Error fetching group feed:', error);
    return sendSocialRouteError(res, 500, 'Failed to load group feed');
  }
});

// Membership endpoints (join/leave/members/approve/role/remove/transfer).
router.use('/', groupMembershipRoutes);

export default router;
