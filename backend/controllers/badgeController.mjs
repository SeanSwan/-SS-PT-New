/**
 * Badge Controller - API Endpoints for Badge Management
 * ====================================================
 *
 * Purpose: REST API endpoints for badge CRUD operations, earning checks,
 * and admin management interface
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Endpoints:
 * - POST /api/badges - Create badge (admin)
 * - GET /api/badges - List badges with filtering
 * - GET /api/badges/:id - Get badge details
 * - PUT /api/badges/:id - Update badge (admin)
 * - DELETE /api/badges/:id - Delete badge (admin)
 * - POST /api/badges/check-earning - Check badge earnings
 * - GET /api/badges/user/:userId - Get user's badges
 * - POST /api/badges/:id/upload-image - Upload badge image
 *
 * Security:
 * - Admin-only for creation/modification/deletion
 * - User-specific access for personal badge data
 * - Rate limiting on all endpoints
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

import badgeService from '../services/badgeService.mjs';
import { piiSafeLogger } from '../utils/monitoring/piiSafeLogging.mjs';

class BadgeController {
  constructor() {
    this.logger = piiSafeLogger;
  }

  /**
   * Create a new badge
   * POST /api/badges
   */
  async createBadge(req, res) {
    try {
      const adminId = req.user.id;

      // Validate admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const badgeData = req.body;
      const badge = await badgeService.createBadge(badgeData, adminId);

      res.status(201).json({
        success: true,
        message: 'Badge created successfully',
        data: {
          badgeId: badge.id,
          name: badge.name,
          imageUrl: badge.imageUrl
        }
      });

    } catch (error) {
      this.logger.error('Badge creation failed', {
        error: error.message,
        adminId: req.user?.id,
        badgeData: req.body
      });

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get badges with filtering and pagination
   * GET /api/badges
   */
  async getBadges(req, res) {
    try {
      const filters = {
        status: req.query.status,
        category: req.query.category,
        collectionId: req.query.collectionId,
        search: req.query.search
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 100)
      };

      const result = await badgeService.getBadges(filters, pagination);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      this.logger.error('Failed to get badges', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve badges'
      });
    }
  }

  /**
   * Get badge details
   * GET /api/badges/:badgeId
   */
  async getBadge(req, res) {
    try {
      const { badgeId } = req.params;

      // Get badge from service (this method doesn't exist in service yet, so we'll use getBadges with ID filter)
      const result = await badgeService.getBadges({ id: badgeId }, { limit: 1 });

      if (!result.badges || result.badges.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
      }

      res.json({
        success: true,
        data: result.badges[0]
      });

    } catch (error) {
      this.logger.error('Failed to get badge', {
        error: error.message,
        badgeId: req.params.badgeId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve badge'
      });
    }
  }

  /**
   * Update badge
   * PUT /api/badges/:badgeId
   */
  async updateBadge(req, res) {
    try {
      const { badgeId } = req.params;
      const adminId = req.user.id;

      // Validate admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const updatedBadge = await badgeService.updateBadge(badgeId, req.body, adminId);

      res.json({
        success: true,
        message: 'Badge updated successfully',
        data: {
          badgeId,
          changes: Object.keys(req.body),
          badge: updatedBadge
        }
      });

    } catch (error) {
      this.logger.error('Badge update failed', {
        error: error.message,
        badgeId: req.params.badgeId,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update badge'
      });
    }
  }

  /**
   * Delete badge
   * DELETE /api/badges/:badgeId
   */
  async deleteBadge(req, res) {
    try {
      const { badgeId } = req.params;
      const adminId = req.user.id;
      const force = req.query.force === 'true';

      // Validate admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const result = await badgeService.deleteBadge(badgeId, force, adminId);

      res.json({
        success: true,
        message: 'Badge deleted successfully',
        data: result
      });

    } catch (error) {
      this.logger.error('Badge deletion failed', {
        error: error.message,
        badgeId: req.params.badgeId,
        adminId: req.user?.id
      });

      // Handle specific error cases
      if (error.message.includes('Cannot delete badge')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete badge'
      });
    }
  }

  /**
   * Check badge earnings for user activity
   * POST /api/badges/check-earning
   */
  async checkBadgeEarnings(req, res) {
    try {
      const userId = req.user.id;
      const activity = req.body;

      const earnedBadges = await badgeService.checkBadgeEarnings(userId, activity);

      res.json({
        success: true,
        data: {
          badgesEarned: earnedBadges,
          checkedAt: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Badge earning check failed', {
        error: error.message,
        userId: req.user?.id,
        activity: req.body
      });

      res.status(500).json({
        success: false,
        error: 'Failed to check badge earnings'
      });
    }
  }

  /**
   * Get user's earned badges
   * GET /api/badges/user/:userId
   */
  async getUserBadges(req, res) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      // Allow users to see their own badges or admins/trainers to see anyone's
      const allowedRoles = ['admin', 'trainer'];
      const canViewAll = allowedRoles.includes(req.user.role);
      const isOwnProfile = userId === currentUserId;

      if (!canViewAll && !isOwnProfile) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const options = {
        category: req.query.category,
        recent: req.query.recent === 'true'
      };

      const badges = await badgeService.getUserBadges(userId, options);

      res.json({
        success: true,
        data: {
          userId,
          totalEarned: badges.length,
          badges: badges.slice(0, 50), // Limit for performance
          badgesByCategory: this.groupBadgesByCategory(badges)
        }
      });

    } catch (error) {
      this.logger.error('Failed to get user badges', {
        error: error.message,
        userId: req.params.userId,
        currentUserId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user badges'
      });
    }
  }

  /**
   * Upload badge image
   * POST /api/badges/:badgeId/upload-image
   */
  async uploadBadgeImage(req, res) {
    try {
      const { badgeId } = req.params;
      const adminId = req.user.id;

      // Validate admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      // Get badge name for filename
      const badge = await badgeService.getBadgeById(badgeId);
      if (!badge) {
        return res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
      }

      // Upload image using service
      const imageUrl = await badgeService.uploadBadgeImage(req.file.buffer, badge.name);

      // Update badge with new image URL
      await badgeService.updateBadge(badgeId, { image: req.file.buffer }, adminId);

      res.json({
        success: true,
        message: 'Badge image updated successfully',
        data: {
          badgeId,
          imageUrl
        }
      });

    } catch (error) {
      this.logger.error('Badge image upload failed', {
        error: error.message,
        badgeId: req.params.badgeId,
        adminId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to upload badge image'
      });
    }
  }

  /**
   * Group badges by category for analytics
   * @param {Array} badges - Badge array
   * @returns {Object} Badges grouped by category
   */
  groupBadgesByCategory(badges) {
    return badges.reduce((acc, badge) => {
      acc[badge.category] = (acc[badge.category] || 0) + 1;
      return acc;
    }, {});
  }
}

// Export singleton instance
const badgeController = new BadgeController();
export default badgeController;