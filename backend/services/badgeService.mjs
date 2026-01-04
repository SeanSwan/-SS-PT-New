/**
 * Badge Service - Custom Admin-Created Achievement System
 * =======================================================
 *
 * Purpose: Core service for managing custom badges created by admins,
 * including creation, awarding, and progress tracking
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Service Responsibilities:
 * - Badge CRUD operations (admin only)
 * - Badge earning evaluation and awarding
 * - Badge collection management
 * - Image upload and CDN integration
 * - Progress tracking and notifications
 *
 * Key Features:
 * - Flexible badge criteria (JSON-based rules)
 * - Automatic badge awarding on user actions
 * - Custom reward structures (points, titles, customizations)
 * - Collection-based organization
 * - Real-time progress updates
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

import { piiSafeLogger } from '../utils/monitoring/piiSafeLogging.mjs';
import sequelize from '../database.mjs';
import { QueryTypes } from 'sequelize';

class BadgeService {
  constructor() {
    this.logger = piiSafeLogger;
  }

  /**
   * Create a new badge
   * @param {Object} badgeData - Badge creation data
   * @param {string} adminId - Admin user ID creating the badge
   * @returns {Promise<Object>} Created badge
   */
  async createBadge(badgeData, adminId) {
    try {
      this.logger.info('Creating new badge', {
        adminId,
        badgeName: badgeData.name,
        category: badgeData.category
      });

      // Validate badge data
      await this.validateBadgeData(badgeData);

      // Handle image upload if provided
      let imageUrl = null;
      if (badgeData.image) {
        imageUrl = await this.uploadBadgeImage(badgeData.image, badgeData.name);
      }

      // Create badge record
      const badge = {
        id: crypto.randomUUID(),
        name: badgeData.name,
        description: badgeData.description,
        category: badgeData.category,
        difficulty: badgeData.difficulty,
        imageUrl,
        criteriaType: badgeData.criteriaType,
        criteria: badgeData.criteria,
        rewards: badgeData.rewards || { points: 100 },
        collectionId: badgeData.collectionId || null,
        isActive: true,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Insert into database
      const queryText = `
        INSERT INTO "Badges" (
          id, name, description, category, difficulty, "imageUrl",
          "criteriaType", criteria, rewards, "collectionId",
          "isActive", "createdBy", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const values = [
        badge.id, badge.name, badge.description, badge.category, badge.difficulty, badge.imageUrl,
        badge.criteriaType, JSON.stringify(badge.criteria), JSON.stringify(badge.rewards), badge.collectionId,
        badge.isActive, badge.createdBy, badge.createdAt, badge.updatedAt
      ];

      const result = await sequelize.query(queryText, { type: QueryTypes.INSERT, bind: values });

      // Update collection badge count if applicable
      if (badge.collectionId) {
        await this.updateCollectionBadgeCount(badge.collectionId);
      }

      this.logger.info('Badge created successfully', {
        badgeId: badge.id,
        badgeName: badge.name
      });

      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to create badge', {
        error: error.message,
        adminId,
        badgeData
      });
      throw error;
    }
  }

  /**
   * Get badges with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated badge results
   */
  async getBadges(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const whereConditions = [];
      const values = [];
      let paramIndex = 1;

      if (filters.status) {
        whereConditions.push(`"isActive" = $${paramIndex}`);
        values.push(filters.status === 'active');
        paramIndex++;
      }

      if (filters.category) {
        whereConditions.push(`category = $${paramIndex}`);
        values.push(filters.category);
        paramIndex++;
      }

      if (filters.collectionId) {
        whereConditions.push(`"collectionId" = $${paramIndex}`);
        values.push(filters.collectionId);
        paramIndex++;
      }

      if (filters.search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM "Badges" ${whereClause}`;
      const countResult = await sequelize.query(countQuery, { type: QueryTypes.SELECT, bind: values });
      const total = parseInt(countResult.rows[0].total);

      // Get badges with pagination
      const badgesQuery = `
        SELECT
          b.*,
          bc.name as collection_name,
          bc.theme as collection_theme,
          COUNT(ub."badgeId") as earned_count
        FROM "Badges" b
        LEFT JOIN "BadgeCollections" bc ON b."collectionId" = bc.id
        LEFT JOIN "UserBadges" ub ON b.id = ub."badgeId"
        ${whereClause}
        GROUP BY b.id, bc.name, bc.theme
        ORDER BY b."createdAt" DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const badgesResult = await sequelize.query(badgesQuery, { type: QueryTypes.SELECT, bind: values });

      // Parse JSON fields
      const badges = badgesResult.rows.map(badge => ({
        ...badge,
        criteria: typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria,
        rewards: typeof badge.rewards === 'string' ? JSON.parse(badge.rewards) : badge.rewards
      }));

      return {
        badges,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      this.logger.error('Failed to get badges', { error: error.message, filters, pagination });
      throw error;
    }
  }

  /**
   * Check if user has earned any badges based on activity
   * @param {string} userId - User ID
   * @param {Object} activity - Activity data
   * @returns {Promise<Array>} Earned badges
   */
  async checkBadgeEarnings(userId, activity) {
    try {
      this.logger.info('Checking badge earnings', { userId, activityType: activity.type });

      // Get active badges that match activity type
      const badges = await this.getEligibleBadges(activity.type);

      const earnedBadges = [];

      for (const badge of badges) {
        // Check if user already has this badge
        const hasBadge = await this.userHasBadge(userId, badge.id);
        if (hasBadge) continue;

        // Evaluate badge criteria
        const criteriaMet = await this.evaluateBadgeCriteria(userId, badge, activity);
        if (criteriaMet) {
          // Award the badge
          const awardedBadge = await this.awardBadgeToUser(userId, badge, activity);
          earnedBadges.push(awardedBadge);
        }
      }

      if (earnedBadges.length > 0) {
        this.logger.info('Badges earned', {
          userId,
          badgeCount: earnedBadges.length,
          badges: earnedBadges.map(b => b.name)
        });
      }

      return earnedBadges;

    } catch (error) {
      this.logger.error('Failed to check badge earnings', {
        error: error.message,
        userId,
        activity
      });
      throw error;
    }
  }

  /**
   * Award badge to user
   * @param {string} userId - User ID
   * @param {Object} badge - Badge object
   * @param {Object} context - Earning context
   * @returns {Promise<Object>} Awarded badge data
   */
  async awardBadgeToUser(userId, badge, context = {}) {
    try {
      // Create user badge record
      const userBadge = {
        id: crypto.randomUUID(),
        userId,
        badgeId: badge.id,
        earnedAt: new Date(),
        earningType: context.type || 'automatic',
        earningContext: context,
        awardedBy: context.awardedBy || null,
        isDisplayed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const queryText = `
        INSERT INTO "UserBadges" (
          id, "userId", "badgeId", "earnedAt", "earningType",
          "earningContext", "awardedBy", "isDisplayed", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        userBadge.id, userBadge.userId, userBadge.badgeId, userBadge.earnedAt,
        userBadge.earningType, JSON.stringify(userBadge.earningContext),
        userBadge.awardedBy, userBadge.isDisplayed, userBadge.createdAt, userBadge.updatedAt
      ];

      await sequelize.query(queryText, { type: QueryTypes.INSERT, bind: values });

      // Apply badge rewards
      await this.applyBadgeRewards(userId, badge);

      // Send notification
      await this.sendBadgeNotification(userId, badge);

      this.logger.info('Badge awarded to user', {
        userId,
        badgeId: badge.id,
        badgeName: badge.name
      });

      return {
        ...badge,
        earnedAt: userBadge.earnedAt,
        earningContext: userBadge.earningContext
      };

    } catch (error) {
      this.logger.error('Failed to award badge', {
        error: error.message,
        userId,
        badgeId: badge.id
      });
      throw error;
    }
  }

  /**
   * Update a badge
   * @param {string} badgeId - Badge ID
   * @param {Object} badgeData - Updated badge data
   * @param {string} adminId - Admin user ID making the update
   * @returns {Promise<Object>} Updated badge
   */
  async updateBadge(badgeId, badgeData, adminId) {
    try {
      this.logger.info('Updating badge', { badgeId, adminId, changes: Object.keys(badgeData) });

      // Validate badge data if provided
      if (Object.keys(badgeData).length > 0) {
        await this.validateBadgeData({ ...badgeData, id: badgeId });
      }

      // Handle image upload if provided
      let imageUrl = null;
      if (badgeData.image) {
        // Get current badge name for filename
        const currentBadge = await this.getBadgeById(badgeId);
        imageUrl = await this.uploadBadgeImage(badgeData.image, currentBadge.name);
      }

      // Build update query
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (badgeData.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        values.push(badgeData.name);
        paramIndex++;
      }

      if (badgeData.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        values.push(badgeData.description);
        paramIndex++;
      }

      if (badgeData.category !== undefined) {
        updateFields.push(`category = $${paramIndex}`);
        values.push(badgeData.category);
        paramIndex++;
      }

      if (badgeData.difficulty !== undefined) {
        updateFields.push(`difficulty = $${paramIndex}`);
        values.push(badgeData.difficulty);
        paramIndex++;
      }

      if (imageUrl !== null) {
        updateFields.push(`"imageUrl" = $${paramIndex}`);
        values.push(imageUrl);
        paramIndex++;
      }

      if (badgeData.criteriaType !== undefined) {
        updateFields.push(`"criteriaType" = $${paramIndex}`);
        values.push(badgeData.criteriaType);
        paramIndex++;
      }

      if (badgeData.criteria !== undefined) {
        updateFields.push(`criteria = $${paramIndex}`);
        values.push(JSON.stringify(badgeData.criteria));
        paramIndex++;
      }

      if (badgeData.rewards !== undefined) {
        updateFields.push(`rewards = $${paramIndex}`);
        values.push(JSON.stringify(badgeData.rewards));
        paramIndex++;
      }

      if (badgeData.collectionId !== undefined) {
        updateFields.push(`"collectionId" = $${paramIndex}`);
        values.push(badgeData.collectionId);
        paramIndex++;
      }

      if (badgeData.isActive !== undefined) {
        updateFields.push(`"isActive" = $${paramIndex}`);
        values.push(badgeData.isActive);
        paramIndex++;
      }

      updateFields.push(`"updatedAt" = $${paramIndex}`);
      values.push(new Date());
      paramIndex++;

      // Add badge ID for WHERE clause
      values.push(badgeId);

      const updateQuery = `
        UPDATE "Badges"
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await sequelize.query(updateQuery, { type: QueryTypes.UPDATE, bind: values });

      if (result.rows.length === 0) {
        throw new Error('Badge not found');
      }

      // Update collection badge count if collection changed
      if (badgeData.collectionId !== undefined) {
        await this.updateCollectionBadgeCount(badgeData.collectionId);
      }

      this.logger.info('Badge updated successfully', { badgeId, changes: Object.keys(badgeData) });

      return result.rows[0];

    } catch (error) {
      this.logger.error('Failed to update badge', {
        error: error.message,
        badgeId,
        adminId,
        badgeData
      });
      throw error;
    }
  }

  /**
   * Delete a badge
   * @param {string} badgeId - Badge ID
   * @param {boolean} force - Force delete (ignore user badges)
   * @param {string} adminId - Admin user ID making the deletion
   * @returns {Promise<Object>} Deletion result
   */
  async deleteBadge(badgeId, force = false, adminId) {
    try {
      this.logger.info('Deleting badge', { badgeId, force, adminId });

      // Check if badge exists
      const badge = await this.getBadgeById(badgeId);
      if (!badge) {
        throw new Error('Badge not found');
      }

      // Check for existing user badges if not force deleting
      if (!force) {
        const userBadgeCount = await this.getUserBadgeCount(badgeId);
        if (userBadgeCount > 0) {
          throw new Error(`Cannot delete badge: ${userBadgeCount} users have earned this badge. Use force=true to delete anyway.`);
        }
      }

      // Start transaction for safe deletion
      const transaction = await sequelize.transaction();

      try {
        // Soft delete user badges if force=true
        if (force) {
          await sequelize.query(
            `UPDATE "UserBadges" SET "isDisplayed" = false, "updatedAt" = NOW() WHERE "badgeId" = $1`,
            { type: QueryTypes.UPDATE, bind: [badgeId], transaction }
          );
        }

        // Delete the badge
        await sequelize.query(
          `DELETE FROM "Badges" WHERE id = $1`,
          { type: QueryTypes.DELETE, bind: [badgeId], transaction }
        );

        await transaction.commit();

        // Update collection count
        if (badge.collectionId) {
          await this.updateCollectionBadgeCount(badge.collectionId);
        }

        this.logger.info('Badge deleted successfully', { badgeId, force });

        return {
          badgeId,
          deleted: true,
          force,
          usersAffected: force ? await this.getUserBadgeCount(badgeId) : 0
        };

      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      this.logger.error('Failed to delete badge', {
        error: error.message,
        badgeId,
        force,
        adminId
      });
      throw error;
    }
  }

  /**
   * Get a single badge by ID
   * @param {string} badgeId - Badge ID
   * @returns {Promise<Object>} Badge object
   */
  async getBadgeById(badgeId) {
    const queryText = `
      SELECT
        b.*,
        bc.name as collection_name,
        bc.theme as collection_theme,
        COUNT(ub."badgeId") as earned_count
      FROM "Badges" b
      LEFT JOIN "BadgeCollections" bc ON b."collectionId" = bc.id
      LEFT JOIN "UserBadges" ub ON b.id = ub."badgeId"
      WHERE b.id = $1
      GROUP BY b.id, bc.name, bc.theme
    `;

    const result = await sequelize.query(queryText, { type: QueryTypes.SELECT, bind: [badgeId] });

    if (result.rows.length === 0) {
      return null;
    }

    const badge = result.rows[0];
    return {
      ...badge,
      criteria: typeof badge.criteria === 'string' ? JSON.parse(badge.criteria) : badge.criteria,
      rewards: typeof badge.rewards === 'string' ? JSON.parse(badge.rewards) : badge.rewards
    };
  }

  /**
   * Get count of users who have earned a badge
   * @param {string} badgeId - Badge ID
   * @returns {Promise<number>} Count of users
   */
  async getUserBadgeCount(badgeId) {
    const result = await sequelize.query(
      `SELECT COUNT(*) as count FROM "UserBadges" WHERE "badgeId" = $1`,
      { type: QueryTypes.SELECT, bind: [badgeId] }
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get user's earned badges
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User's badges
   */
  async getUserBadges(userId, options = {}) {
    try {
      const queryText = `
        SELECT
          ub.*,
          b.name,
          b.description,
          b.category,
          b.difficulty,
          b."imageUrl",
          b.rewards,
          bc.name as collection_name
        FROM "UserBadges" ub
        JOIN "Badges" b ON ub."badgeId" = b.id
        LEFT JOIN "BadgeCollections" bc ON b."collectionId" = bc.id
        WHERE ub."userId" = $1 AND ub."isDisplayed" = true
        ORDER BY ub."earnedAt" DESC
      `;

      const result = await sequelize.query(queryText, { type: QueryTypes.SELECT, bind: [userId] });

      return result.rows.map(row => ({
        ...row,
        rewards: typeof row.rewards === 'string' ? JSON.parse(row.rewards) : row.rewards,
        earningContext: typeof row.earningContext === 'string' ? JSON.parse(row.earningContext) : row.earningContext
      }));

    } catch (error) {
      this.logger.error('Failed to get user badges', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Validate badge creation data
   * @param {Object} data - Badge data to validate
   * @throws {Error} If validation fails
   */
  async validateBadgeData(data) {
    if (!data.name || data.name.length < 3 || data.name.length > 100) {
      throw new Error('Badge name must be 3-100 characters');
    }

    if (!data.description || data.description.length < 10 || data.description.length > 1000) {
      throw new Error('Badge description must be 10-1000 characters');
    }

    if (!data.category || !['strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general'].includes(data.category)) {
      throw new Error('Invalid badge category');
    }

    if (!data.criteriaType || !['exercise_completion', 'streak_achievement', 'challenge_completion', 'social_engagement', 'milestone_reached', 'custom_criteria'].includes(data.criteriaType)) {
      throw new Error('Invalid criteria type');
    }

    // Validate criteria structure based on type
    await this.validateBadgeCriteria(data.criteriaType, data.criteria);
  }

  /**
   * Validate badge criteria structure
   * @param {string} type - Criteria type
   * @param {Object} criteria - Criteria data
   */
  async validateBadgeCriteria(type, criteria) {
    // Implementation would validate criteria structure based on type
    // For now, basic validation
    if (!criteria || typeof criteria !== 'object') {
      throw new Error('Invalid criteria structure');
    }
  }

  /**
   * Upload badge image to CDN
   * @param {string|Buffer} image - Image data
   * @param {string} badgeName - Badge name for filename
   * @returns {Promise<string>} CDN URL
   */
  async uploadBadgeImage(image, badgeName) {
    // Placeholder implementation - would integrate with CDN service
    // For now, return a mock URL
    const filename = `${badgeName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    return `https://cdn.example.com/badges/${filename}`;
  }

  /**
   * Get badges eligible for a specific activity type
   * @param {string} activityType - Type of activity
   * @returns {Promise<Array>} Eligible badges
   */
  async getEligibleBadges(activityType) {
    // Map activity types to badge criteria types
    const criteriaTypeMapping = {
      'exercise_completion': 'exercise_completion',
      'workout_completion': 'exercise_completion',
      'streak_update': 'streak_achievement',
      'challenge_completion': 'challenge_completion'
    };

    const criteriaType = criteriaTypeMapping[activityType];
    if (!criteriaType) return [];

    const queryText = `
      SELECT * FROM "Badges"
      WHERE "criteriaType" = $1 AND "isActive" = true
    `;

    const result = await sequelize.query(queryText, { type: QueryTypes.SELECT, bind: [criteriaType] });
    return result.rows.map(row => ({
      ...row,
      criteria: typeof row.criteria === 'string' ? JSON.parse(row.criteria) : row.criteria,
      rewards: typeof row.rewards === 'string' ? JSON.parse(row.rewards) : row.rewards
    }));
  }

  /**
   * Check if user already has a badge
   * @param {string} userId - User ID
   * @param {string} badgeId - Badge ID
   * @returns {Promise<boolean>} Whether user has badge
   */
  async userHasBadge(userId, badgeId) {
    const queryText = `
      SELECT COUNT(*) as count FROM "UserBadges"
      WHERE "userId" = $1 AND "badgeId" = $2
    `;

    const result = await sequelize.query(queryText, { type: QueryTypes.SELECT, bind: [userId, badgeId] });
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * Evaluate if badge criteria are met
   * @param {string} userId - User ID
   * @param {Object} badge - Badge object
   * @param {Object} activity - Activity data
   * @returns {Promise<boolean>} Whether criteria are met
   */
  async evaluateBadgeCriteria(userId, badge, activity) {
    // Placeholder implementation - would evaluate specific criteria
    // For now, return true for demonstration
    return Math.random() > 0.7; // 30% chance for demo
  }

  /**
   * Apply badge rewards to user
   * @param {string} userId - User ID
   * @param {Object} badge - Badge object
   */
  async applyBadgeRewards(userId, badge) {
    // Apply points reward
    if (badge.rewards.points && badge.rewards.points > 0) {
      await this.addPointsToUser(userId, badge.rewards.points, 'badge_earned', badge.id);
    }

    // Apply title reward
    if (badge.rewards.title) {
      await this.updateUserTitle(userId, badge.rewards.title);
    }

    // Apply customizations
    if (badge.rewards.customizations) {
      await this.applyProfileCustomizations(userId, badge.rewards.customizations);
    }
  }

  /**
   * Send badge earned notification
   * @param {string} userId - User ID
   * @param {Object} badge - Badge object
   */
  async sendBadgeNotification(userId, badge) {
    // Placeholder - would integrate with notification service
    this.logger.info('Badge notification sent', { userId, badgeName: badge.name });
  }

  /**
   * Update collection badge count
   * @param {string} collectionId - Collection ID
   */
  async updateCollectionBadgeCount(collectionId) {
    const queryText = `
      UPDATE "BadgeCollections"
      SET "badgeCount" = (
        SELECT COUNT(*) FROM "Badges" WHERE "collectionId" = $1 AND "isActive" = true
      ), "updatedAt" = NOW()
      WHERE id = $1
    `;

    await sequelize.query(queryText, { type: QueryTypes.UPDATE, bind: [collectionId] });
  }

  // Placeholder methods for reward application
  async addPointsToUser(userId, points, source, sourceId) {
    // Would integrate with points service
    this.logger.info('Points added to user', { userId, points, source });
  }

  async updateUserTitle(userId, title) {
    // Would update user profile
    this.logger.info('User title updated', { userId, title });
  }

  async applyProfileCustomizations(userId, customizations) {
    // Would apply profile customizations
    this.logger.info('Profile customizations applied', { userId, customizations });
  }
}

export const badgeService = new BadgeService();
export default BadgeService;