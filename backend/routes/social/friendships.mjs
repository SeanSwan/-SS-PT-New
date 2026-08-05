import express from 'express';
import rateLimit from 'express-rate-limit';
import { Op, Sequelize } from 'sequelize';
import {
  MEMBER_ROLES,
  directoryAttributes,
  isStaffViewer,
} from '../../utils/memberDirectoryAccess.mjs';
import sequelize from '../../database.mjs';
import { Friendship } from '../../models/social/index.mjs';
import User from '../../models/User.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import { sendSocialRouteError } from './socialRouteResponse.helpers.mjs';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Rate limiters for abuse-prone endpoints
const searchLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, message: 'Too many search requests, try again later' } });
const requestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many friend requests, try again later' } });

/**
 * Get friends list for the current user
 */
router.get('/', async (req, res) => {
  try {
    // Get accepted friendships where current user is either requester or recipient
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, status: 'accepted' },
          { recipientId: req.user.id, status: 'accepted' }
        ]
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: directoryAttributes(req.user, ['points', 'role'])
        },
        {
          model: User,
          as: 'recipient',
          attributes: directoryAttributes(req.user, ['points', 'role'])
        }
      ]
    });

    // Format the response to get a clean array of friends
    const friends = friendships.map(friendship => {
      // If current user is requester, return recipient as friend (and vice versa)
      const friend = friendship.requesterId === req.user.id 
        ? friendship.recipient 
        : friendship.requester;
        
      return {
        id: friend.id,
        firstName: friend.firstName,
        lastName: friend.lastName,
        username: friend.username,
        photo: friend.photo,
        points: friend.points,
        role: friend.role,
        friendshipId: friendship.id,
        createdAt: friendship.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      friends
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return sendSocialRouteError(res, 500, 'Failed to fetch friends list');
  }
});

/**
 * Get all pending friend requests for the current user
 */
router.get('/requests', async (req, res) => {
  try {
    // Get pending requests where current user is the recipient
    const pendingRequests = await Friendship.findAll({
      where: {
        recipientId: req.user.id,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: directoryAttributes(req.user)
        }
      ]
    });

    // Format the response
    const requests = pendingRequests.map(request => ({
      id: request.id,
      requester: request.requester,
      createdAt: request.createdAt
    }));

    return res.status(200).json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return sendSocialRouteError(res, 500, 'Failed to fetch friend requests');
  }
});

/**
 * Send a friend request
 */
router.post('/request/:recipientId', requestLimiter, async (req, res) => {
  try {
    const { recipientId } = req.params;
    
    // Check if recipient exists
    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found'
      });
    }
    
    // Check if recipient is the current user (params are strings, user.id is number)
    const recipientIdNum = parseInt(recipientId, 10);
    if (isNaN(recipientIdNum)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient ID' });
    }
    if (recipientIdNum === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }
    
    // Use transaction to prevent race condition on concurrent requests
    const result = await sequelize.transaction(async (t) => {
      const existingFriendship = await Friendship.findOne({
        where: {
          [Op.or]: [
            { requesterId: req.user.id, recipientId: recipientIdNum },
            { requesterId: recipientIdNum, recipientId: req.user.id }
          ]
        },
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          return { status: 400, body: { success: false, message: 'You are already friends with this user' } };
        } else if (existingFriendship.status === 'pending') {
          const msg = Number(existingFriendship.requesterId) === req.user.id
            ? 'You have already sent a friend request to this user'
            : 'This user has already sent you a friend request';
          return { status: 400, body: { success: false, message: msg } };
        } else if (existingFriendship.status === 'declined') {
          existingFriendship.status = 'pending';
          await existingFriendship.save({ transaction: t });
          return { status: 200, body: { success: true, message: 'Friend request sent successfully', friendship: existingFriendship } };
        } else if (existingFriendship.status === 'blocked') {
          return { status: 403, body: { success: false, message: 'Unable to send friend request' } };
        }
      }

      const friendship = await Friendship.create({
        requesterId: req.user.id,
        recipientId: recipientIdNum,
        status: 'pending'
      }, { transaction: t });

      return { status: 201, body: { success: true, message: 'Friend request sent successfully', friendship } };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error sending friend request:', error);
    return sendSocialRouteError(res, 500, 'Failed to send friend request');
  }
});

/**
 * Accept a friend request
 */
router.post('/accept/:friendshipId', async (req, res) => {
  try {
    const { friendshipId } = req.params;
    
    // Find the friendship request
    const friendship = await Friendship.findByPk(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }
    
    // Check if the current user is the recipient of this request
    if (Number(friendship.recipientId) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this friend request'
      });
    }
    
    // Check if the request is pending
    if (friendship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This friend request cannot be accepted'
      });
    }
    
    // Accept the friend request
    friendship.status = 'accepted';
    await friendship.save();
    
    // Get the requester's info
    const requester = await User.findByPk(friendship.requesterId, {
      attributes: directoryAttributes(req.user)
    });
    
    return res.status(200).json({
      success: true,
      message: 'Friend request accepted successfully',
      friendship,
      friend: requester
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return sendSocialRouteError(res, 500, 'Failed to accept friend request');
  }
});

/**
 * Decline a friend request
 */
router.post('/decline/:friendshipId', async (req, res) => {
  try {
    const { friendshipId } = req.params;
    
    // Find the friendship request
    const friendship = await Friendship.findByPk(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }
    
    // Check if the current user is the recipient of this request
    if (Number(friendship.recipientId) !== Number(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this friend request'
      });
    }
    
    // Check if the request is pending
    if (friendship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This friend request cannot be declined'
      });
    }
    
    // Decline the friend request
    friendship.status = 'declined';
    await friendship.save();
    
    return res.status(200).json({
      success: true,
      message: 'Friend request declined successfully'
    });
  } catch (error) {
    console.error('Error declining friend request:', error);
    return sendSocialRouteError(res, 500, 'Failed to decline friend request');
  }
});

/**
 * Remove a friend (unfriend)
 */
router.delete('/:friendshipId', async (req, res) => {
  try {
    const { friendshipId } = req.params;
    
    // Find the friendship
    const friendship = await Friendship.findByPk(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
    }
    
    // Check if the current user is part of this friendship
    if (friendship.requesterId !== req.user.id && friendship.recipientId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to remove this friendship'
      });
    }
    
    // Check if the friendship is accepted
    if (friendship.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'This friendship cannot be removed'
      });
    }
    
    // Delete the friendship
    await friendship.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'Friendship removed successfully'
    });
  } catch (error) {
    console.error('Error removing friendship:', error);
    return sendSocialRouteError(res, 500, 'Failed to remove friendship');
  }
});

/**
 * Block a user
 */
router.post('/block/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is trying to block themselves
    const userIdNum = parseInt(userId, 10);
    if (userIdNum === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }
    
    // Check if a friendship already exists
    let friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, recipientId: userIdNum },
          { requesterId: userIdNum, recipientId: req.user.id }
        ]
      }
    });

    if (friendship) {
      // Update friendship to blocked status
      friendship.status = 'blocked';
      // Make sure current user is the blocker (requester)
      if (Number(friendship.recipientId) === req.user.id) {
        // Swap requester and recipient so current user is the blocker
        const temp = friendship.requesterId;
        friendship.requesterId = friendship.recipientId;
        friendship.recipientId = temp;
      }
      await friendship.save();
    } else {
      // Create a new blocked relationship
      friendship = await Friendship.create({
        requesterId: req.user.id,
        recipientId: userIdNum,
        status: 'blocked'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return sendSocialRouteError(res, 500, 'Failed to block user');
  }
});

/**
 * Unblock a user
 */
router.post('/unblock/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the blocked relationship (current user must be the blocker — requesterId after block swap)
    const userIdNum = parseInt(userId, 10);
    const friendship = await Friendship.findOne({
      where: {
        requesterId: req.user.id,
        recipientId: userIdNum,
        status: 'blocked'
      }
    });
    
    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Blocked relationship not found'
      });
    }
    
    // Delete the relationship (unblock)
    await friendship.destroy();
    
    return res.status(200).json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return sendSocialRouteError(res, 500, 'Failed to unblock user');
  }
});

/**
 * Search for users by name or username
 */
router.get('/search', searchLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);

    if (!q || String(q).trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const escaped = String(q).trim().replace(/[%_\\]/g, '\\$&');
    const searchTerm = `%${escaped}%`;
    // Op imported at module level

    // Get blocked user IDs to exclude them
    const blocks = await Friendship.findAll({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, status: 'blocked' },
          { recipientId: req.user.id, status: 'blocked' }
        ]
      }
    });
    const blockedIds = blocks.map(b =>
      b.requesterId === req.user.id ? b.recipientId : b.requesterId
    );

    const excludeIds = [...blockedIds, req.user.id];

    // Search users by firstName, lastName, or username
    const users = await User.findAll({
      where: {
        id: { [Op.notIn]: excludeIds },
        [Op.or]: [
          { firstName: { [Op.iLike]: searchTerm } },
          { lastName: { [Op.iLike]: searchTerm } },
          { username: { [Op.iLike]: searchTerm } },
          Sequelize.where(
            Sequelize.fn('concat', Sequelize.col('firstName'), ' ', Sequelize.col('lastName')),
            { [Op.iLike]: searchTerm }
          )
        ]
      },
      attributes: directoryAttributes(req.user, ['role']),
      limit,
      order: [['firstName', 'ASC']]
    });

    // Get existing friendship statuses for these users
    const userIds = users.map(u => u.id);
    const existingFriendships = userIds.length > 0 ? await Friendship.findAll({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, recipientId: { [Op.in]: userIds } },
          { requesterId: { [Op.in]: userIds }, recipientId: req.user.id }
        ]
      }
    }) : [];

    // Build a map of userId -> friendship status
    const friendshipMap = {};
    existingFriendships.forEach(f => {
      const otherId = f.requesterId === req.user.id ? f.recipientId : f.requesterId;
      friendshipMap[otherId] = {
        status: f.status,
        friendshipId: f.id,
        isRequester: f.requesterId === req.user.id
      };
    });

    const results = users.map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      photo: u.photo,
      role: u.role,
      friendshipStatus: friendshipMap[u.id]?.status || null,
      friendshipId: friendshipMap[u.id]?.friendshipId || null,
      isRequester: friendshipMap[u.id]?.isRequester || false
    }));

    return res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return sendSocialRouteError(res, 500, 'Failed to search users');
  }
});

/**
 * Get a list of users who might be friends (suggestions)
 */
router.get('/suggestions', async (req, res) => {
  try {
    // SECURITY: was `parseInt(req.query.limit) || 10` with no cap, so
    // ?limit=100000 returned the surname of every client AND trainer in one
    // response. Capped, and staff are no longer suggested to members.
    const requestedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 10;
    
    // Get the current user's friends
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, status: 'accepted' },
          { recipientId: req.user.id, status: 'accepted' }
        ]
      }
    });
    
    // Extract friend IDs
    const friendIds = friendships.map(f => 
      f.requesterId === req.user.id ? f.recipientId : f.requesterId
    );
    
    // Also get blocked users
    const blocks = await Friendship.findAll({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, status: 'blocked' },
          { recipientId: req.user.id, status: 'blocked' }
        ]
      }
    });
    
    // Extract blocked user IDs
    const blockedIds = blocks.map(b => 
      b.requesterId === req.user.id ? b.recipientId : b.requesterId
    );
    
    // Combine friend IDs and blocked IDs with current user ID
    const excludeIds = [...friendIds, ...blockedIds, req.user.id];
    
    // Find users who:
    // 1. Are not already friends
    // 2. Are not blocked
    // 3. Are not the current user
    // 4. Have similar traits (e.g., recent activity, similar interests)
    const suggestedUsers = await User.findAll({
      where: {
        id: { [Op.notIn]: excludeIds },
        // Members are suggested MEMBERS. Suggesting staff is what put trainer
        // surnames in a member-facing response.
        ...(isStaffViewer(req.user)
          ? { role: { [Op.in]: ['client', 'trainer'] } }
          : { role: { [Op.in]: [...MEMBER_ROLES] } })
      },
      attributes: directoryAttributes(req.user, ['role']),
      limit,
      order: [['createdAt', 'DESC']] // For simplicity, suggest newer users first
    });
    
    return res.status(200).json({
      success: true,
      suggestions: suggestedUsers
    });
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    return sendSocialRouteError(res, 500, 'Failed to fetch friend suggestions');
  }
});

export default router;
