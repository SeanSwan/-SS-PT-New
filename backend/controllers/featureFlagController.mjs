/**
 * ============================================================================
 * FILE: featureFlagController.mjs
 * PURPOSE: Admin endpoints for managing per-user feature flags
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 */

import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy Model Loading
// ─────────────────────────────────────────────────────────────
let UserFeatureFlag = null;
let User = null;

const getModels = async () => {
  if (!UserFeatureFlag) {
    const mod = await import('../models/UserFeatureFlag.mjs');
    UserFeatureFlag = mod.default;
  }
  if (!User) {
    const mod = await import('../models/User.mjs');
    User = mod.default;
  }
  return { UserFeatureFlag, User };
};

// ─────────────────────────────────────────────────────────────
// SECTION: Get all feature flags for a specific feature key
// Returns list of users with their toggle status
// ─────────────────────────────────────────────────────────────
export const getFeatureFlags = async (req, res) => {
  try {
    const { featureKey } = req.params;
    const { UserFeatureFlag, User } = await getModels();

    // Get all users (non-admin) with their flag status
    const users = await User.findAll({
      where: { isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'photo'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']],
    });

    // Get existing flags for this feature
    const flags = await UserFeatureFlag.findAll({
      where: { featureKey },
    });

    const flagMap = new Map(flags.map(f => [f.userId, f]));

    const result = users.map(user => {
      const flag = flagMap.get(user.id);
      return {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        photo: user.photo,
        enabled: user.role === 'admin' ? true : (flag?.enabled || false),
        isAdmin: user.role === 'admin',
        grantedAt: flag?.grantedAt || null,
        grantedBy: flag?.grantedBy || null,
      };
    });

    return res.json({ success: true, data: result, featureKey });
  } catch (error) {
    logger.error('[FeatureFlags] Error fetching flags:', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch feature flags' });
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Toggle a feature flag for a specific user
// ─────────────────────────────────────────────────────────────
export const toggleFeatureFlag = async (req, res) => {
  try {
    const { featureKey, userId } = req.params;
    const { enabled, notes } = req.body;
    const adminId = req.user.id;
    const { UserFeatureFlag, User } = await getModels();

    // Verify user exists
    const targetUser = await User.findByPk(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Admin always has access — don't toggle
    if (targetUser.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Admin always has access to all features' });
    }

    // Upsert the flag
    const [flag, created] = await UserFeatureFlag.findOrCreate({
      where: { userId: Number(userId), featureKey },
      defaults: {
        enabled: enabled !== false,
        grantedBy: adminId,
        grantedAt: enabled !== false ? new Date() : null,
        revokedAt: enabled === false ? new Date() : null,
        notes: notes || null,
      },
    });

    if (!created) {
      await flag.update({
        enabled: enabled !== false,
        grantedBy: adminId,
        grantedAt: enabled !== false ? new Date() : flag.grantedAt,
        revokedAt: enabled === false ? new Date() : null,
        notes: notes || flag.notes,
      });
    }

    logger.info('[FeatureFlags] Toggled feature flag', {
      featureKey,
      userId,
      enabled: flag.enabled,
      adminId,
    });

    return res.json({
      success: true,
      data: {
        userId: Number(userId),
        featureKey,
        enabled: flag.enabled,
        grantedAt: flag.grantedAt,
        grantedBy: flag.grantedBy,
      },
    });
  } catch (error) {
    logger.error('[FeatureFlags] Error toggling flag:', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to toggle feature flag' });
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Get feature flags for the current user (self)
// Used by frontend to know which features are available
// ─────────────────────────────────────────────────────────────
export const getMyFeatureFlags = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { UserFeatureFlag } = await getModels();

    // Admin gets everything
    if (userRole === 'admin') {
      return res.json({
        success: true,
        data: {
          'content-studio': true,
          'workout-planner-pro': true,
          'store-prices': true,
        },
        isAdmin: true,
      });
    }

    // Check table exists before querying (non-fatal)
    try {
      const [check] = await sequelize.query(
        `SELECT to_regclass('user_feature_flags') AS exists`
      );
      if (!check?.[0]?.exists) {
        return res.json({ success: true, data: {}, isAdmin: false });
      }
    } catch {
      return res.json({ success: true, data: {}, isAdmin: false });
    }

    const flags = await UserFeatureFlag.findAll({
      where: { userId, enabled: true },
      attributes: ['featureKey', 'enabled'],
    });

    const flagMap = {};
    flags.forEach(f => { flagMap[f.featureKey] = f.enabled; });

    return res.json({ success: true, data: flagMap, isAdmin: false });
  } catch (error) {
    logger.error('[FeatureFlags] Error fetching my flags:', { error: error.message });
    return res.json({ success: true, data: {}, isAdmin: false });
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Bulk toggle for multiple users at once
// ─────────────────────────────────────────────────────────────
export const bulkToggleFeatureFlags = async (req, res) => {
  try {
    const { featureKey } = req.params;
    const { userIds, enabled, notes } = req.body;
    const adminId = req.user.id;
    const { UserFeatureFlag } = await getModels();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
    }

    const results = [];
    for (const userId of userIds) {
      const [flag] = await UserFeatureFlag.findOrCreate({
        where: { userId: Number(userId), featureKey },
        defaults: {
          enabled: enabled !== false,
          grantedBy: adminId,
          grantedAt: enabled !== false ? new Date() : null,
          notes: notes || null,
        },
      });

      if (flag.enabled !== (enabled !== false)) {
        await flag.update({
          enabled: enabled !== false,
          grantedBy: adminId,
          grantedAt: enabled !== false ? new Date() : flag.grantedAt,
          revokedAt: enabled === false ? new Date() : null,
          notes: notes || flag.notes,
        });
      }
      results.push({ userId: Number(userId), enabled: flag.enabled });
    }

    return res.json({ success: true, data: results, featureKey });
  } catch (error) {
    logger.error('[FeatureFlags] Error bulk toggling:', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to bulk toggle feature flags' });
  }
};
