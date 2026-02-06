/**
 * Client-Trainer Assignment Routes (Admin Client-Trainer Management API)
 * =======================================================================
 *
 * Purpose: Admin-only REST API for managing client-trainer assignments with inline handlers,
 * comprehensive audit trail, status tracking, and drag-and-drop UI support
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Client-Trainer Assignment System
 *
 * Base Path: /api/assignments
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Admin Dashboard    │─────▶│  Assignment      │─────▶│  PostgreSQL     │
 * │  (Drag-and-Drop UI) │      │  Routes (Inline) │      │  (2 tables)     │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘
 *                                       │
 *                                       │ (business logic in routes)
 *                                       ▼
 *                              ┌──────────────────┐
 *                              │  adminOnly       │
 *                              │  trainerOrAdmin  │
 *                              └──────────────────┘
 *
 * Database Schema (2 tables):
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ client_trainer_assignments                                  │
 *   │ ├─id (PK, INTEGER)                                          │
 *   │ ├─clientId (FK → users.id) - Client being assigned          │
 *   │ ├─trainerId (FK → users.id) - Trainer assigned              │
 *   │ ├─assignedBy (FK → users.id) - Admin who created assignment │
 *   │ ├─assignedAt (TIMESTAMP, default: NOW())                    │
 *   │ ├─status (ENUM: active, inactive, pending)                  │
 *   │ ├─notes (TEXT, nullable) - Admin notes                      │
 *   │ ├─createdAt, updatedAt                                      │
 *   │ └─────────────────────────────────────────────────────────  │
 *   └─────────────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ users (linked via clientId, trainerId, assignedBy)          │
 *   │ - Client: role = 'client' OR 'user'                         │
 *   │ - Trainer: role = 'trainer'                                 │
 *   │ - Admin: role = 'admin' (assignedBy)                        │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Entity Relationships:
 *
 *   client_trainer_assignments ─────▶ users (clientId) [client]
 *   client_trainer_assignments ─────▶ users (trainerId) [trainer]
 *   client_trainer_assignments ─────▶ users (assignedBy) [admin]
 *
 * API Endpoints (9 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD  ENDPOINT                         MIDDLEWARE     PURPOSE              │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /test                            protect+admin  Test endpoint        │
 * │ GET     /                                protect+admin  Get all assignments  │
 * │ GET     /trainer/:trainerId              protect+T/A    Get trainer clients  │
 * │ GET     /client/:clientId                protect+admin  Get client trainer   │
 * │ POST    /                                protect+admin  Create assignment    │
 * │ PUT     /:id                             protect+admin  Update assignment    │
 * │ DELETE  /:id                             protect+admin  Deactivate assignment│
 * │ GET     /unassigned/clients              protect+admin  Get unassigned       │
 * │ GET     /stats                           protect+admin  Get statistics       │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Middleware Strategy:
 *
 *   Per-Route Middleware (NOT global router.use):
 *   - protect: JWT authentication (all routes)
 *   - adminOnly: Admin-only access (most routes)
 *   - trainerOrAdminOnly: Trainer can view own assignments, admin can view all
 *
 *   Authorization Pattern:
 *   - Assignment management: adminOnly (create, update, delete, stats)
 *   - Trainer view: trainerOrAdminOnly (GET /trainer/:trainerId)
 *   - Additional ownership check: Trainers can only view OWN assignments (trainerId === req.user.id)
 *
 * Assignment Lifecycle:
 *
 *   1. Admin creates assignment (POST /)
 *      - Deactivates existing client assignments (only 1 active trainer per client)
 *      - Creates new assignment with status = 'active'
 *      - Records assignedBy (admin user ID) for audit trail
 *
 *   2. Admin updates assignment (PUT /:id)
 *      - Change status (active → inactive, inactive → active)
 *      - Update notes (admin annotations)
 *      - Audit trail preserved (createdAt, updatedAt)
 *
 *   3. Admin deletes assignment (DELETE /:id)
 *      - Soft delete (status → 'inactive') instead of hard delete
 *      - Preserves audit trail (who assigned, when, duration)
 *
 * Mermaid Sequence Diagram (Assignment Creation):
 *
 * ```mermaid
 * sequenceDiagram
 *   participant Admin
 *   participant Routes
 *   participant Middleware
 *   participant Database
 *
 *   Admin->>Routes: POST /api/assignments { clientId, trainerId }
 *   Routes->>Middleware: protect + adminOnly
 *   alt Not Admin
 *     Middleware-->>Admin: 403 Forbidden
 *   end
 *   Routes->>Database: Verify client exists (role = 'client' OR 'user')
 *   Routes->>Database: Verify trainer exists (role = 'trainer')
 *   alt Invalid User
 *     Routes-->>Admin: 404 Not Found
 *   end
 *   Routes->>Database: Check existing active assignment
 *   alt Already Assigned
 *     Routes-->>Admin: 409 Conflict
 *   end
 *   Routes->>Database: UPDATE status='inactive' WHERE clientId=X
 *   Routes->>Database: INSERT new assignment (status='active')
 *   Routes->>Database: SELECT with client/trainer/assignedBy associations
 *   Database-->>Routes: Complete assignment object
 *   Routes-->>Admin: 201 Created { assignment }
 * ```
 *
 * Query Parameters (GET /):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ PARAMETER                    TYPE           PURPOSE                          │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ status                       ENUM           Filter by status (active/inactive)│
 * │ trainerId                    INTEGER        Filter by trainer ID             │
 * │ clientId                     INTEGER        Filter by client ID              │
 * │ page                         INTEGER        Pagination (default: 1)          │
 * │ limit                        INTEGER        Results per page (default: 50)   │
 * │ includeInactive              BOOLEAN        Include inactive (default: false)│
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Statistics Endpoint (GET /stats):
 *
 *   Returns:
 *   - totalAssignments (all-time)
 *   - activeAssignments (current)
 *   - inactiveAssignments (historical)
 *   - totalTrainers (total trainer users)
 *   - totalClients (total client/user users)
 *   - unassignedClients (clients without active trainer)
 *   - assignmentRate (% of clients with active trainer)
 *   - trainerWorkload (array: {trainerId, trainerName, activeClients})
 *   - averageClientsPerTrainer (mean client count)
 *
 * Business Logic:
 *
 * WHY Inline Route Handlers (Not Controller Delegation)?
 * - Simple CRUD operations (no complex business logic)
 * - Direct database access (Sequelize ORM queries in routes)
 * - Legacy pattern (predates controller architecture refactor)
 * - Future refactor: Extract to clientTrainerAssignmentController.mjs
 *
 * WHY Only 1 Active Assignment Per Client?
 * - Clear accountability (each client has 1 primary trainer)
 * - Prevents conflicting workout plans (multiple trainers)
 * - Simplifies billing (trainer commission structure)
 * - Audit trail preserved (historical assignments via status='inactive')
 *
 * WHY Soft Delete (status='inactive') Instead of Hard Delete?
 * - Audit trail (compliance, dispute resolution)
 * - Historical reporting (trainer performance, client retention)
 * - Undo capability (reactivate past assignments)
 * - Referential integrity (preserve foreign key relationships)
 *
 * WHY Trainer Can View Own Assignments (trainerOrAdminOnly)?
 * - Trainer needs client list (dashboard, session scheduling)
 * - Privacy protection (trainers cannot view other trainers' clients)
 * - Additional ownership check (trainerId === req.user.id)
 * - Admin can view all (monitoring, rebalancing workload)
 *
 * WHY Prevent Self-Assignment (clientId === trainerId)?
 * - Role conflict (user cannot be both client and trainer)
 * - Database constraint (users have single role)
 * - Logic error prevention (invalid assignment state)
 *
 * WHY Support Both 'client' AND 'user' Roles?
 * - Legacy role naming (old users had role='user', new users have role='client')
 * - Migration compatibility (gradual role renaming)
 * - Future unification (standardize on role='client')
 *
 * Security Model:
 * - All routes require JWT authentication (protect middleware)
 * - Assignment management restricted to admin role (adminOnly)
 * - Trainer view restricted to own assignments (trainerId === req.user.id OR role === 'admin')
 * - Role validation enforced (client role check, trainer role check)
 * - Prevent self-assignment (clientId !== trainerId)
 *
 * Error Handling:
 * - 400: Bad Request (missing fields, invalid status, self-assignment)
 * - 403: Forbidden (trainer viewing other trainer's assignments)
 * - 404: Not Found (assignment not found, invalid user roles)
 * - 409: Conflict (client already assigned to this trainer)
 * - 500: Server error (database failures, Sequelize errors)
 *
 * Dependencies:
 * - authMiddleware.mjs (protect, adminOnly, trainerOrAdminOnly)
 * - models/index.mjs (getClientTrainerAssignment, getUser)
 * - logger.mjs (Winston logger)
 * - sequelize (Op for SQL queries)
 * - express (router)
 *
 * Performance Considerations:
 * - Pagination supported (default limit=50, configurable)
 * - Parallel queries (Promise.all for user role validation, stats)
 * - Exclude lastModifiedBy (field not in database yet, prevents Sequelize errors)
 * - Eager loading (include client/trainer/assignedByUser associations)
 *
 * Testing Strategy:
 * - Integration tests for each route
 * - Test admin-only restrictions (403 for non-admin)
 * - Test trainer ownership restrictions (403 for other trainer's assignments)
 * - Test soft delete behavior (status='inactive')
 * - Test 1-active-assignment-per-client constraint
 * - Test role validation (client, trainer roles)
 * - Test pagination (page, limit, totalPages)
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
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

    // Try with full associations first, fallback to basic query if associations fail
    let count = 0;
    let assignments = [];

    try {
      const result = await ClientTrainerAssignment.findAndCountAll({
        where: whereConditions,
        attributes: {
          exclude: ['lastModifiedBy'] // Exclude field that doesn't exist in database yet
        },
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions'],
            required: false
          },
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
            required: false
          },
          {
            model: User,
            as: 'assignedByUser',
            attributes: ['id', 'firstName', 'lastName'],
            required: false // Make optional in case assignedBy column is missing
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });
      count = result.count;
      assignments = result.rows;
    } catch (includeError) {
      // If include fails, try without assignedByUser association
      logger.warn('Full association query failed, trying without assignedByUser:', includeError.message);
      const result = await ClientTrainerAssignment.findAndCountAll({
        where: whereConditions,
        attributes: {
          exclude: ['lastModifiedBy', 'assignedBy'] // Exclude potentially missing fields
        },
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions'],
            required: false
          },
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });
      count = result.count;
      assignments = result.rows;
    }

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
      order: [['createdAt', 'DESC']]
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
      order: [['createdAt', 'DESC']]
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