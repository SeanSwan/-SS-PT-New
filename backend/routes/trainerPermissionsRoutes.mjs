/**
 * Trainer Permissions Routes
 * =========================
 * 
 * Manages granular permissions for trainer users with admin oversight.
 * Enables fine-grained control over trainer capabilities and access levels.
 * 
 * Core Features:
 * - Grant, revoke, and manage trainer permissions
 * - Permission type validation and expiration support
 * - Bulk permission operations for efficient management
 * - Audit trail for all permission changes
 * - Permission checking middleware integration
 * 
 * Part of the NASM Workout Tracking System - Phase 2.2: API Layer
 * Designed for SwanStudios Platform - Production Ready
 */

import express from 'express';
import { protect, adminOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { 
  getTrainerPermissions, 
  getUser 
} from '../models/index.mjs';
import { PERMISSION_TYPES } from '../models/TrainerPermissions.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';

const router = express.Router();

const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseBoundedPositiveInteger = (value, max) => {
  const parsed = parseStrictPositiveInteger(value);
  return parsed ? Math.min(parsed, max) : null;
};

const parseOptionalFutureDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return { valid: true, date: null };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date <= new Date()) {
    return { valid: false, date: null };
  }

  return { valid: true, date };
};

/**
 * @route   GET /api/trainer-permissions
 * @desc    Get all trainer permissions with filtering
 * @access  Admin Only
 * @query   ?trainerId=123&permissionType=edit_workouts&isActive=true&page=1&limit=20
 */
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { 
      trainerId, 
      permissionType, 
      isActive, 
      page = 1, 
      limit = 50,
      includeExpired = false 
    } = req.query;

    // Build query conditions
    const whereConditions = {};
    
    if (trainerId) {
      const parsedTrainerId = parseStrictPositiveInteger(trainerId);
      if (!parsedTrainerId) {
        return res.status(400).json({
          success: false,
          message: 'trainerId must be a positive integer'
        });
      }
      whereConditions.trainerId = parsedTrainerId;
    }
    
    if (permissionType) {
      whereConditions.permissionType = permissionType;
    }
    
    if (isActive !== undefined) {
      whereConditions.isActive = isActive === 'true';
    }

    // Handle expired permissions
    if (!includeExpired) {
      whereConditions[Op.or] = [
        { expiresAt: null },
        { expiresAt: { [Op.gt]: new Date() } }
      ];
    }

    const parsedPage = parseStrictPositiveInteger(page);
    if (!parsedPage) {
      return res.status(400).json({
        success: false,
        message: 'page must be a positive integer'
      });
    }

    const parsedLimit = parseBoundedPositiveInteger(limit, 100);
    if (!parsedLimit) {
      return res.status(400).json({
        success: false,
        message: 'limit must be a positive integer'
      });
    }

    // Calculate pagination
    const offset = (parsedPage - 1) * parsedLimit;

    const TrainerPermissions = getTrainerPermissions();
    const User = getUser();

    const { count, rows: permissions } = await TrainerPermissions.findAndCountAll({
      where: whereConditions,
      include: [
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'] 
        },
        { 
          model: User, 
          as: 'grantedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ],
      order: [['grantedAt', 'DESC']],
      limit: parsedLimit,
      offset: offset
    });

    const totalPages = Math.ceil(count / parsedLimit);

    logger.info(`Retrieved ${permissions.length} permissions for admin`, {
      userId: req.user.id,
      filters: { trainerId, permissionType, isActive },
      pagination: { page: parsedPage, limit: parsedLimit, totalPages }
    });

    res.json({
      success: true,
      permissions,
      pagination: {
        currentPage: parsedPage,
        totalPages,
        totalCount: count,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1
      }
    });

  } catch (error) {
    logger.error('Error fetching trainer permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainer permissions',
      error: 'internal_error'
    });
  }
});

/**
 * @route   GET /api/trainer-permissions/trainer/:trainerId
 * @desc    Get all permissions for a specific trainer
 * @access  Trainer (own permissions) or Admin (any trainer)
 */
router.get('/trainer/:trainerId', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { trainerId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const parsedTrainerId = parseStrictPositiveInteger(trainerId);

    if (!parsedTrainerId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID must be a positive integer'
      });
    }

    // Trainers can only view their own permissions, admins can view any.
    // String()-coerce: req.user.id is a string (authMiddleware.mjs:631).
    if (requestingUserRole === 'trainer' && String(parsedTrainerId) !== String(requestingUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Trainers can only view their own permissions'
      });
    }

    const TrainerPermissions = getTrainerPermissions();
    const User = getUser();

    const permissions = await TrainerPermissions.findAll({
      where: {
        trainerId: parsedTrainerId,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      include: [
        { 
          model: User, 
          as: 'grantedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ],
      order: [['grantedAt', 'DESC']]
    });

    // Organize permissions by type for easier frontend consumption
    const permissionsByType = {};
    const availablePermissions = Object.values(PERMISSION_TYPES);

    availablePermissions.forEach(permType => {
      const permission = permissions.find(p => p.permissionType === permType);
      permissionsByType[permType] = {
        hasPermission: !!permission,
        permission: permission || null,
        isExpiringSoon: permission ? permission.isExpiringSoon() : false,
        daysUntilExpiration: permission ? permission.getDaysUntilExpiration() : null
      };
    });

    logger.info(`Trainer ${trainerId} retrieved permissions`, {
      requestingUserId,
      trainerId: parsedTrainerId,
      activePermissions: permissions.length
    });

    res.json({
      success: true,
      permissions,
      permissionsByType,
      totalActivePermissions: permissions.length,
      availablePermissionTypes: availablePermissions
    });

  } catch (error) {
    logger.error('Error fetching trainer permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainer permissions',
      error: 'internal_error'
    });
  }
});

/**
 * @route   POST /api/trainer-permissions/grant
 * @desc    Grant a permission to a trainer
 * @access  Admin Only
 * @body    { trainerId, permissionType, expiresAt?, reason? }
 */
router.post('/grant', protect, adminOnly, async (req, res) => {
  try {
    const { trainerId, permissionType, expiresAt, reason, notes } = req.body;
    const grantedBy = req.user.id;

    // Validate required fields
    if (!trainerId || !permissionType) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID and permission type are required'
      });
    }

    const parsedTrainerId = parseStrictPositiveInteger(trainerId);
    if (!parsedTrainerId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID must be a positive integer'
      });
    }

    // Validate permission type
    const validPermissionTypes = Object.values(PERMISSION_TYPES);
    if (!validPermissionTypes.includes(permissionType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid permission type. Must be one of: ${validPermissionTypes.join(', ')}`
      });
    }

    // Validate expiration date if provided
    const parsedExpiration = parseOptionalFutureDate(expiresAt);
    if (!parsedExpiration.valid) {
      return res.status(400).json({
        success: false,
        message: 'Expiration date must be a valid future date'
      });
    }

    const TrainerPermissions = getTrainerPermissions();
    const User = getUser();

    // Verify trainer exists and has correct role
    const trainer = await User.findOne({ 
      where: { 
        id: parsedTrainerId,
        role: 'trainer' 
      } 
    });

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found or invalid role'
      });
    }

    // Check if permission already exists and is active
    const existingPermission = await TrainerPermissions.findOne({
      where: {
        trainerId: parsedTrainerId,
        permissionType,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    if (existingPermission) {
      return res.status(409).json({
        success: false,
        message: 'Permission already granted and active for this trainer'
      });
    }

    // Create new permission. The table's audit column is `notes` (there is no `reason` column);
    // the API keeps accepting `reason` and maps it there.
    const permission = await TrainerPermissions.create({
      trainerId: parsedTrainerId,
      permissionType,
      grantedBy,
      expiresAt: parsedExpiration.date,
      notes: reason || notes || null,
      isActive: true
    });

    // Fetch the complete permission with related data
    const completePermission = await TrainerPermissions.findByPk(permission.id, {
      include: [
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'grantedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ]
    });

    logger.info(`Admin ${grantedBy} granted ${permissionType} permission to trainer ${trainerId}`, {
      permissionId: permission.id,
      trainerName: `${trainer.firstName} ${trainer.lastName}`,
      expiresAt: expiresAt || 'never'
    });

    res.status(201).json({
      success: true,
      permission: completePermission,
      message: 'Permission granted successfully'
    });

  } catch (error) {
    logger.error('Error granting permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grant permission',
      error: 'internal_error'
    });
  }
});

/**
 * @route   PUT /api/trainer-permissions/:id/revoke
 * @desc    Revoke (deactivate) a trainer permission
 * @access  Admin Only
 * @body    { reason? }
 */
router.put('/:id/revoke', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    const revokedBy = req.user.id;
    const parsedPermissionId = parseStrictPositiveInteger(id);

    if (!parsedPermissionId) {
      return res.status(400).json({
        success: false,
        message: 'Permission ID must be a positive integer'
      });
    }

    const TrainerPermissions = getTrainerPermissions();

    const permission = await TrainerPermissions.findByPk(parsedPermissionId);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    if (!permission.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Permission is already revoked'
      });
    }

    // Revoke permission. Real audit columns are revokedAt + notes; the table has no revoked-by
    // column, so the revoking admin is preserved inside the notes text.
    const revokeNote = reason || notes || permission.notes;
    await permission.update({
      isActive: false,
      revokedAt: new Date(),
      notes: revokeNote
        ? `${revokeNote} (revoked by admin ${revokedBy})`
        : `Revoked by admin ${revokedBy}`
    });

    // Fetch updated permission with related data
    const User = getUser();
    const updatedPermission = await TrainerPermissions.findByPk(parsedPermissionId, {
      include: [
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'grantedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ]
    });

    logger.info(`Admin ${revokedBy} revoked permission ${parsedPermissionId}`, {
      permissionId: parsedPermissionId,
      permissionType: permission.permissionType,
      trainerId: permission.trainerId
    });

    res.json({
      success: true,
      permission: updatedPermission,
      message: 'Permission revoked successfully'
    });

  } catch (error) {
    logger.error('Error revoking permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke permission',
      error: 'internal_error'
    });
  }
});

/**
 * @route   PUT /api/trainer-permissions/:id/extend
 * @desc    Extend the expiration date of a permission
 * @access  Admin Only
 * @body    { expiresAt, reason? }
 */
router.put('/:id/extend', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresAt, reason, notes } = req.body;
    const extendedBy = req.user.id;
    const parsedPermissionId = parseStrictPositiveInteger(id);

    if (!parsedPermissionId) {
      return res.status(400).json({
        success: false,
        message: 'Permission ID must be a positive integer'
      });
    }

    if (!expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'New expiration date is required'
      });
    }

    const parsedExpiration = parseOptionalFutureDate(expiresAt);
    if (!parsedExpiration.valid) {
      return res.status(400).json({
        success: false,
        message: 'Expiration date must be a valid future date'
      });
    }

    const TrainerPermissions = getTrainerPermissions();

    const permission = await TrainerPermissions.findByPk(parsedPermissionId);
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: 'Permission not found'
      });
    }

    if (!permission.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot extend revoked permission'
      });
    }

    // Update expiration date (`notes` is the real audit column; no `reason` column exists)
    await permission.update({
      expiresAt: parsedExpiration.date,
      notes: reason || notes || permission.notes
    });

    // Fetch updated permission with related data
    const User = getUser();
    const updatedPermission = await TrainerPermissions.findByPk(parsedPermissionId, {
      include: [
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'grantedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ]
    });

    logger.info(`Admin ${extendedBy} extended permission ${parsedPermissionId} until ${expiresAt}`, {
      permissionId: parsedPermissionId,
      permissionType: permission.permissionType,
      trainerId: permission.trainerId,
      newExpiration: expiresAt
    });

    res.json({
      success: true,
      permission: updatedPermission,
      message: 'Permission expiration extended successfully'
    });

  } catch (error) {
    logger.error('Error extending permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend permission',
      error: 'internal_error'
    });
  }
});

/**
 * @route   POST /api/trainer-permissions/check
 * @desc    Check if a trainer has a specific permission
 * @access  Trainer (own permissions) or Admin (any trainer)
 * @body    { trainerId, permissionType }
 */
router.post('/check', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { trainerId, permissionType } = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    if (!trainerId || !permissionType) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID and permission type are required'
      });
    }

    const parsedTrainerId = parseStrictPositiveInteger(trainerId);
    if (!parsedTrainerId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID must be a positive integer'
      });
    }

    // Trainers can only check their own permissions, admins can check any.
    // String()-coerce: req.user.id is a string (authMiddleware.mjs:631).
    if (requestingUserRole === 'trainer' && String(parsedTrainerId) !== String(requestingUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Trainers can only check their own permissions'
      });
    }

    const TrainerPermissions = getTrainerPermissions();

    const permission = await TrainerPermissions.findOne({
      where: {
        trainerId: parsedTrainerId,
        permissionType,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    const hasPermission = !!permission;
    const isExpiringSoon = permission ? permission.isExpiringSoon() : false;
    const daysUntilExpiration = permission ? permission.getDaysUntilExpiration() : null;

    logger.info(`Permission check for trainer ${trainerId}: ${permissionType}`, {
      requestingUserId,
      hasPermission,
      isExpiringSoon
    });

    res.json({
      success: true,
      hasPermission,
      permission: permission || null,
      isExpiringSoon,
      daysUntilExpiration
    });

  } catch (error) {
    logger.error('Error checking permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check permission',
      error: 'internal_error'
    });
  }
});

/**
 * @route   GET /api/trainer-permissions/types
 * @desc    Get all available permission types with descriptions
 * @access  Admin or Trainer
 */
router.get('/types', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const permissionTypes = [
      {
        key: PERMISSION_TYPES.EDIT_WORKOUTS,
        label: 'Edit Client Workouts',
        description: 'Allow trainer to log and modify client workout sessions',
        critical: true
      },
      {
        key: PERMISSION_TYPES.VIEW_PROGRESS,
        label: 'View Client Progress',
        description: 'Access to client progress charts and analytics',
        critical: false
      },
      {
        key: PERMISSION_TYPES.MANAGE_CLIENTS,
        label: 'Manage Assigned Clients',
        description: 'Edit client information and session notes',
        critical: false
      },
      {
        key: PERMISSION_TYPES.ACCESS_NUTRITION,
        label: 'Access Nutrition Data',
        description: 'View and edit client nutrition logs',
        critical: false
      },
      {
        key: PERMISSION_TYPES.MODIFY_SCHEDULES,
        label: 'Modify Schedules',
        description: 'Book and reschedule client sessions',
        critical: true
      },
      {
        key: PERMISSION_TYPES.VIEW_ANALYTICS,
        label: 'View Analytics',
        description: 'Access trainer performance analytics',
        critical: false
      }
    ];

    res.json({
      success: true,
      permissionTypes,
      totalTypes: permissionTypes.length
    });

  } catch (error) {
    logger.error('Error fetching permission types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permission types',
      error: 'internal_error'
    });
  }
});

/**
 * @route   GET /api/trainer-permissions/stats
 * @desc    Get permission statistics for admin dashboard
 * @access  Admin Only
 */
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const TrainerPermissions = getTrainerPermissions();
    const User = getUser();

    const [
      totalPermissions,
      activePermissions,
      expiredPermissions,
      expiringPermissions,
      totalTrainers,
      permissionsByType
    ] = await Promise.all([
      TrainerPermissions.count(),
      TrainerPermissions.count({ 
        where: { 
          isActive: true,
          [Op.or]: [
            { expiresAt: null },
            { expiresAt: { [Op.gt]: new Date() } }
          ]
        } 
      }),
      TrainerPermissions.count({ 
        where: { 
          isActive: true,
          expiresAt: { [Op.lte]: new Date() }
        } 
      }),
      TrainerPermissions.count({ 
        where: { 
          isActive: true,
          expiresAt: { 
            [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
          }
        } 
      }),
      User.count({ where: { role: 'trainer' } }),
      TrainerPermissions.findAll({
        where: { isActive: true },
        attributes: ['permissionType']
      })
    ]);

    // Calculate permission type distribution
    const typeDistribution = {};
    Object.values(PERMISSION_TYPES).forEach(type => {
      typeDistribution[type] = permissionsByType.filter(p => p.permissionType === type).length;
    });

    const stats = {
      totalPermissions,
      activePermissions,
      revokedPermissions: totalPermissions - activePermissions,
      expiredPermissions,
      expiringPermissions,
      totalTrainers,
      averagePermissionsPerTrainer: totalTrainers > 0 ? (activePermissions / totalTrainers).toFixed(1) : 0,
      permissionTypeDistribution: typeDistribution
    };

    logger.info('Retrieved permission statistics', {
      userId: req.user.id,
      stats: { ...stats, permissionTypeDistribution: Object.keys(typeDistribution).length }
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error fetching permission statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permission statistics',
      error: 'internal_error'
    });
  }
});

export default router;
