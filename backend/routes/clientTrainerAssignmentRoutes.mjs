/**
 * Client-Trainer Assignment Routes
 * ===============================
 * 
 * Manages the formal relationships between clients and trainers.
 * Admin-controlled assignment system with comprehensive audit trail.
 * 
 * Core Features:
 * - Create, read, update, delete client-trainer assignments
 * - Admin-only assignment management with proper authorization
 * - Drag-and-drop assignment interface support
 * - Assignment status tracking and audit trail
 * - Bulk operations for efficient management
 * 
 * Part of the NASM Workout Tracking System - Phase 2.2: API Layer
 * Designed for SwanStudios Platform - Production Ready
 */

import express from 'express';
import { protect, adminOnly, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import { 
  getClientTrainerAssignment, 
  getUser 
} from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @route   GET /api/assignments/test
 * @desc    Test endpoint to verify client-trainer assignment routes are working
 * @access  Admin Only
 */
router.get('/test', protect, adminOnly, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Client-trainer assignment routes are working correctly',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'GET /api/client-trainer-assignments',
        'GET /api/assignments',
        'POST /api/client-trainer-assignments',
        'PUT /api/client-trainer-assignments/:id'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Route test failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/assignments
 * @desc    Get all client-trainer assignments with filtering
 * @access  Admin Only
 * @query   ?status=active&trainerId=123&clientId=456&page=1&limit=20
 */
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { 
      status, 
      trainerId, 
      clientId, 
      page = 1, 
      limit = 50,
      includeInactive = false 
    } = req.query;

    // Build query conditions
    const whereConditions = {};
    
    if (status) {
      whereConditions.status = status;
    } else if (!includeInactive) {
      whereConditions.status = 'active';
    }
    
    if (trainerId) {
      whereConditions.trainerId = parseInt(trainerId);
    }
    
    if (clientId) {
      whereConditions.clientId = parseInt(clientId);
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    const { count, rows: assignments } = await ClientTrainerAssignment.findAndCountAll({
      where: whereConditions,
      attributes: {
        exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
      },
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions'] 
        },
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'] 
        },
        { 
          model: User, 
          as: 'assignedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    logger.info(`Retrieved ${assignments.length} assignments for admin`, {
      userId: req.user.id,
      filters: { status, trainerId, clientId },
      pagination: { page, limit, totalPages }
    });

    res.json({
      success: true,
      assignments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: count,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    logger.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/assignments/trainer/:trainerId
 * @desc    Get all clients assigned to a specific trainer
 * @access  Trainer (own assignments) or Admin (any trainer)
 */
router.get('/trainer/:trainerId', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { trainerId } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Trainers can only view their own assignments, admins can view any
    if (requestingUserRole === 'trainer' && parseInt(trainerId) !== requestingUserId) {
      return res.status(403).json({
        success: false,
        message: 'Trainers can only view their own assigned clients'
      });
    }

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    const assignments = await ClientTrainerAssignment.findAll({
      where: {
        trainerId: parseInt(trainerId),
        status: 'active'
      },
      attributes: {
        exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
      },
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions', 'phone'] 
        },
        { 
          model: User, 
          as: 'assignedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ],
      order: [['assignedAt', 'DESC']]
    });

    logger.info(`Trainer ${trainerId} retrieved ${assignments.length} assigned clients`, {
      requestingUserId,
      trainerId
    });

    res.json({
      success: true,
      assignments,
      totalClients: assignments.length
    });

  } catch (error) {
    logger.error('Error fetching trainer assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainer assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/assignments/client/:clientId
 * @desc    Get the current trainer assignment for a specific client
 * @access  Admin Only (for privacy)
 */
router.get('/client/:clientId', protect, adminOnly, async (req, res) => {
  try {
    const { clientId } = req.params;

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        clientId: parseInt(clientId),
        status: 'active'
      },
      attributes: {
        exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
      },
      include: [
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'] 
        },
        { 
          model: User, 
          as: 'assignedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ],
      order: [['assignedAt', 'DESC']]
    });

    logger.info(`Retrieved assignment for client ${clientId}`, {
      userId: req.user.id,
      hasAssignment: !!assignment
    });

    res.json({
      success: true,
      assignment: assignment || null
    });

  } catch (error) {
    logger.error('Error fetching client assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch client assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/assignments
 * @desc    Create new client-trainer assignment
 * @access  Admin Only
 * @body    { clientId, trainerId, notes? }
 */
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { clientId, trainerId, notes } = req.body;
    const assignedBy = req.user.id;

    // Validate required fields
    if (!clientId || !trainerId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and Trainer ID are required'
      });
    }

    // Prevent self-assignment
    if (parseInt(clientId) === parseInt(trainerId)) {
      return res.status(400).json({
        success: false,
        message: 'Client and trainer cannot be the same user'
      });
    }

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    // Verify users exist and have correct roles
    const [client, trainer] = await Promise.all([
      User.findOne({ 
        where: { 
          id: parseInt(clientId), 
          role: ['client', 'user'] // Support both client and user roles
        } 
      }),
      User.findOne({ 
        where: { 
          id: parseInt(trainerId), 
          role: 'trainer' 
        } 
      })
    ]);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found or invalid role'
      });
    }

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found or invalid role'
      });
    }

    // Check if assignment already exists
    const existingAssignment = await ClientTrainerAssignment.findOne({
      where: {
        clientId: parseInt(clientId),
        trainerId: parseInt(trainerId),
        status: 'active'
      },
      attributes: {
        exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
      }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: 'Client is already assigned to this trainer'
      });
    }

    // Deactivate any existing active assignments for this client
    await ClientTrainerAssignment.update(
      { status: 'inactive' },
      {
        where: {
          clientId: parseInt(clientId),
          status: 'active'
        }
      }
    );

    // Create new assignment
    const assignment = await ClientTrainerAssignment.create({
      clientId: parseInt(clientId),
      trainerId: parseInt(trainerId),
      assignedBy,
      notes: notes || null,
      status: 'active'
    });

    // Fetch the complete assignment with related data
    const completeAssignment = await ClientTrainerAssignment.findByPk(assignment.id, {
      attributes: {
        exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
      },
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'assignedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ]
    });

    logger.info(`Admin ${assignedBy} assigned client ${clientId} to trainer ${trainerId}`, {
      assignmentId: assignment.id,
      clientName: `${client.firstName} ${client.lastName}`,
      trainerName: `${trainer.firstName} ${trainer.lastName}`
    });

    res.status(201).json({
      success: true,
      assignment: completeAssignment,
      message: 'Client successfully assigned to trainer'
    });

  } catch (error) {
    logger.error('Error creating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   PUT /api/assignments/:id
 * @desc    Update assignment status or notes
 * @access  Admin Only
 * @body    { status?, notes? }
 */
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updatedBy = req.user.id;

    const ClientTrainerAssignment = getClientTrainerAssignment();

    const assignment = await ClientTrainerAssignment.findByPk(id, {
      attributes: {
        exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
      }
    });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Validate status if provided
    const validStatuses = ['active', 'inactive', 'pending'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Update assignment
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await assignment.update(updateData);

    // Fetch updated assignment with related data
    const User = getUser();
    const updatedAssignment = await ClientTrainerAssignment.findByPk(id, {
      attributes: {
        exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
      },
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'assignedByUser', 
          attributes: ['id', 'firstName', 'lastName'] 
        }
      ]
    });

    logger.info(`Admin ${updatedBy} updated assignment ${id}`, {
      changes: updateData,
      assignmentId: id
    });

    res.json({
      success: true,
      assignment: updatedAssignment,
      message: 'Assignment updated successfully'
    });

  } catch (error) {
    logger.error('Error updating assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   DELETE /api/assignments/:id
 * @desc    Delete (deactivate) an assignment
 * @access  Admin Only
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user.id;

    const ClientTrainerAssignment = getClientTrainerAssignment();

    const assignment = await ClientTrainerAssignment.findByPk(id, {
      attributes: {
        exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
      }
    });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Set status to inactive instead of hard delete for audit trail
    await assignment.update({ status: 'inactive' });

    logger.info(`Admin ${deletedBy} deactivated assignment ${id}`, {
      assignmentId: id,
      originalStatus: assignment.status
    });

    res.json({
      success: true,
      message: 'Assignment deactivated successfully'
    });

  } catch (error) {
    logger.error('Error deleting assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/assignments/unassigned/clients
 * @desc    Get all clients who don't have an active trainer assignment
 * @access  Admin Only
 */
router.get('/unassigned/clients', protect, adminOnly, async (req, res) => {
  try {
    const User = getUser();
    const ClientTrainerAssignment = getClientTrainerAssignment();

    // Get all client/user IDs that have active assignments
    const assignedClientIds = await ClientTrainerAssignment.findAll({
      where: { status: 'active' },
      attributes: ['clientId'], // Only select clientId, exclude lastModifiedBy
      raw: true
    }).then(assignments => assignments.map(a => a.clientId));

    // Get all clients/users who are NOT in the assigned list
    const unassignedClients = await User.findAll({
      where: {
        role: { [Op.in]: ['client', 'user'] },
        id: { [Op.notIn]: assignedClientIds.length > 0 ? assignedClientIds : [-1] } // -1 if no assignments exist
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    logger.info(`Retrieved ${unassignedClients.length} unassigned clients`, {
      userId: req.user.id,
      totalUnassigned: unassignedClients.length
    });

    res.json({
      success: true,
      clients: unassignedClients,
      totalUnassigned: unassignedClients.length
    });

  } catch (error) {
    logger.error('Error fetching unassigned clients:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unassigned clients',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/assignments/stats
 * @desc    Get assignment statistics for admin dashboard
 * @access  Admin Only
 */
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    const [
      totalAssignments,
      activeAssignments,
      totalTrainers,
      totalClients,
      assignmentsByTrainer
    ] = await Promise.all([
      ClientTrainerAssignment.count(),
      ClientTrainerAssignment.count({ where: { status: 'active' } }),
      User.count({ where: { role: 'trainer' } }),
      User.count({ where: { role: { [Op.in]: ['client', 'user'] } } }),
      ClientTrainerAssignment.findAll({
        where: { status: 'active' },
        attributes: ['trainerId'], // Only select trainerId, exclude lastModifiedBy
        include: [
          { 
            model: User, 
            as: 'trainer', 
            attributes: ['id', 'firstName', 'lastName'] 
          }
        ]
      })
    ]);

    // Calculate trainer workload distribution
    const trainerWorkload = {};
    assignmentsByTrainer.forEach(assignment => {
      const trainerId = assignment.trainerId;
      const trainerName = `${assignment.trainer.firstName} ${assignment.trainer.lastName}`;
      
      if (!trainerWorkload[trainerId]) {
        trainerWorkload[trainerId] = {
          trainerId,
          trainerName,
          activeClients: 0
        };
      }
      trainerWorkload[trainerId].activeClients++;
    });

    const workloadStats = Object.values(trainerWorkload).sort((a, b) => b.activeClients - a.activeClients);

    const stats = {
      totalAssignments,
      activeAssignments,
      inactiveAssignments: totalAssignments - activeAssignments,
      totalTrainers,
      totalClients,
      unassignedClients: totalClients - activeAssignments,
      assignmentRate: totalClients > 0 ? ((activeAssignments / totalClients) * 100).toFixed(1) : 0,
      trainerWorkload: workloadStats,
      averageClientsPerTrainer: totalTrainers > 0 ? (activeAssignments / totalTrainers).toFixed(1) : 0
    };

    logger.info('Retrieved assignment statistics', {
      userId: req.user.id,
      stats: { ...stats, trainerWorkload: workloadStats.length }
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error fetching assignment statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;