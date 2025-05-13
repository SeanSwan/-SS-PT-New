import express from 'express';
import { Friendship } from '../../models/social/index.mjs';
import User from '../../models/User.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

/**
 * Get friends list for the current user
 */
router.get('/', async (req, res) => {
  try {
    // Get accepted friendships where current user is either requester or recipient
    const friendships = await Friendship.findAll({
      where: {
        [req.db.Sequelize.Op.or]: [
          { requesterId: req.user.id, status: 'accepted' },
          { recipientId: req.user.id, status: 'accepted' }
        ]
      },
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'points', 'role']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'points', 'role']
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
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch friends list',
      error: error.message
    });
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
          attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
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
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch friend requests',
      error: error.message
    });
  }
});

/**
 * Send a friend request
 */
router.post('/request/:recipientId', async (req, res) => {
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
    
    // Check if recipient is the current user
    if (recipientId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a friend request to yourself'
      });
    }
    
    // Check if a friendship already exists between these users
    const existingFriendship = await Friendship.findOne({
      where: {
        [req.db.Sequelize.Op.or]: [
          { requesterId: req.user.id, recipientId },
          { requesterId: recipientId, recipientId: req.user.id }
        ]
      }
    });
    
    if (existingFriendship) {
      // Return different messages based on the status
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already friends with this user'
        });
      } else if (existingFriendship.status === 'pending') {
        if (existingFriendship.requesterId === req.user.id) {
          return res.status(400).json({
            success: false,
            message: 'You have already sent a friend request to this user'
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'This user has already sent you a friend request'
          });
        }
      } else if (existingFriendship.status === 'declined') {
        // Allow re-requesting if previously declined
        existingFriendship.status = 'pending';
        await existingFriendship.save();
        
        return res.status(200).json({
          success: true,
          message: 'Friend request sent successfully',
          friendship: existingFriendship
        });
      } else if (existingFriendship.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'Unable to send friend request'
        });
      }
    }
    
    // Create a new friendship request
    const friendship = await Friendship.create({
      requesterId: req.user.id,
      recipientId,
      status: 'pending'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      friendship
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send friend request',
      error: error.message
    });
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
    if (friendship.recipientId !== req.user.id) {
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
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
    });
    
    return res.status(200).json({
      success: true,
      message: 'Friend request accepted successfully',
      friendship,
      friend: requester
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to accept friend request',
      error: error.message
    });
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
    if (friendship.recipientId !== req.user.id) {
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
    return res.status(500).json({
      success: false,
      message: 'Failed to decline friend request',
      error: error.message
    });
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
    return res.status(500).json({
      success: false,
      message: 'Failed to remove friendship',
      error: error.message
    });
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
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }
    
    // Check if a friendship already exists
    let friendship = await Friendship.findOne({
      where: {
        [req.db.Sequelize.Op.or]: [
          { requesterId: req.user.id, recipientId: userId },
          { requesterId: userId, recipientId: req.user.id }
        ]
      }
    });
    
    if (friendship) {
      // Update friendship to blocked status
      friendship.status = 'blocked';
      // Make sure current user is the blocker (requester)
      if (friendship.recipientId === req.user.id) {
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
        recipientId: userId,
        status: 'blocked'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to block user',
      error: error.message
    });
  }
});

/**
 * Unblock a user
 */
router.post('/unblock/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find the blocked relationship
    const friendship = await Friendship.findOne({
      where: {
        requesterId: req.user.id,
        recipientId: userId,
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
    return res.status(500).json({
      success: false,
      message: 'Failed to unblock user',
      error: error.message
    });
  }
});

/**
 * Get a list of users who might be friends (suggestions)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get the current user's friends
    const friendships = await Friendship.findAll({
      where: {
        [req.db.Sequelize.Op.or]: [
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
        [req.db.Sequelize.Op.or]: [
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
        id: { [req.db.Sequelize.Op.notIn]: excludeIds },
        role: { [req.db.Sequelize.Op.in]: ['client', 'trainer'] } // Only suggest clients or trainers
      },
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role'],
      limit,
      order: [['createdAt', 'DESC']] // For simplicity, suggest newer users first
    });
    
    return res.status(200).json({
      success: true,
      suggestions: suggestedUsers
    });
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch friend suggestions',
      error: error.message
    });
  }
});

export default router;
