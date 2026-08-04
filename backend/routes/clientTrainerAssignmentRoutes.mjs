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
  getModel,
  getUser
} from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';
import { calculateCompletionPercentage, normalizeJsonObject } from '../utils/onboardingHelpers.mjs';

import { buildClientOnboardingProgressSnapshot } from '../services/clientOnboardingCoverageLedgerService.mjs';
const router = express.Router();
const VALID_ASSIGNMENT_STATUSES = new Set(['active', 'inactive', 'pending']);
const MAX_PAGE_LIMIT = 300;

const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePaginationInteger = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null;
};

const parseBooleanQuery = (value) => value === true || value === 'true';

const sendInternalError = (res, message) => res.status(500).json({
  success: false,
  message,
  error: 'internal_error'
});

const buildOnboardingProgressMap = (questionnaires) => {
  const progressMap = {};

  for (const questionnaire of questionnaires) {
    if (!questionnaire?.userId || progressMap[questionnaire.userId]) continue;

    const responses = normalizeJsonObject(questionnaire.responsesJson) ?? {};
    const derivedCompletion = calculateCompletionPercentage(responses);
    const questionnaireSnapshot = {
      status: questionnaire.status ?? null,
      nutritionPrefs: questionnaire.nutritionPrefs ?? null,
      responsesJson: responses,
    };
    progressMap[questionnaire.userId] = {
      status: questionnaire.status ?? null,
      responses,
      questionnaire: questionnaireSnapshot,
      onboardingCompletionPercentage: derivedCompletion,
      onboardingComplete: questionnaire.status === 'completed' || derivedCompletion === 100
    };
  }

  return progressMap;
};

const attachOnboardingReadiness = (assignments, progressMap) => assignments.map((assignment) => {
  const assignmentData = typeof assignment?.toJSON === 'function' ? assignment.toJSON() : assignment;
  const clientData = assignmentData?.client;
  if (!clientData) return assignmentData;

  const onboardingProgress = progressMap[clientData.id] ?? null;

  const onboardingSnapshot = buildClientOnboardingProgressSnapshot({
    client: clientData,
    questionnaire: onboardingProgress?.questionnaire,
    responses: onboardingProgress?.responses,
  });
  const onboardingPct = onboardingProgress?.onboardingCompletionPercentage ?? onboardingSnapshot.completionPercentage;
  return {
    ...assignmentData,
    client: {
      ...clientData,
      onboardingStatus: onboardingProgress?.status ?? null,
      onboardingComplete: onboardingProgress?.onboardingComplete === true,
      onboardingCompletionPercentage: onboardingPct,
      onboardingPct,
      onboardingFieldLedger: onboardingSnapshot.onboardingFieldLedger,
      onboardingMissingFields: onboardingSnapshot.onboardingMissingFields
    }
  };
});

const getClientOnboardingQuestionnaireModel = () => {
  try {
    return typeof getModel === 'function' ? getModel('ClientOnboardingQuestionnaire') : null;
  } catch (error) {
    logger.warn(`Client onboarding questionnaire model unavailable: ${error.message}`);
    return null;
  }
};

/**
 * @route   GET /api/assignments/my-trainer
 * @desc    The calling CLIENT's active trainer — id, name, photo only.
 *          Added 2026-08-03 (client-dash launch panel): both reviewers ranked
 *          "the trainer/human is invisible on the client home" as the #1
 *          absence, and no client-readable assignment endpoint existed
 *          (/client/:clientId is adminOnly). Self-scoped: the target client is
 *          ALWAYS req.user.id — no request-controlled id, no IDOR surface.
 *          Deliberately excludes trainer email/phone (rule 8 minimal exposure).
 * @access  Any authenticated user (self-scoped; non-clients just get null)
 */
router.get('/my-trainer', protect, async (req, res) => {
  try {
    const clientId = parsePositiveInteger(req.user.id);
    if (!clientId) {
      return res.json({ success: true, trainer: null });
    }

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    const assignment = await ClientTrainerAssignment.findOne({
      where: { clientId, status: 'active' },
      include: [
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'photo'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const trainer = assignment?.trainer
      ? {
          id: assignment.trainer.id,
          firstName: assignment.trainer.firstName,
          lastName: assignment.trainer.lastName,
          photo: assignment.trainer.photo || null
        }
      : null;

    res.json({ success: true, trainer });
  } catch (error) {
    logger.error('Error fetching own trainer assignment:', error);
    sendInternalError(res, 'Failed to fetch trainer');
  }
});

/**
 * @route   GET /api/assignments/test
 * @desc    Test endpoint — returns table schema for debugging
 * @access  Admin Only
 */
router.get('/test', protect, adminOnly, async (req, res) => {
  try {
    // Check actual column names in the DB
    const [columns] = await sequelize.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'client_trainer_assignments'
       ORDER BY ordinal_position`
    );

    // Check FK constraints
    const [fks] = await sequelize.query(
      `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
       FROM information_schema.table_constraints AS tc
       JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
       WHERE tc.table_name = 'client_trainer_assignments' AND tc.constraint_type = 'FOREIGN KEY'`
    );

    res.json({
      success: true,
      columns,
      foreignKeys: fks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching assignment schema diagnostics:', error);
    sendInternalError(res, 'Failed to fetch assignment diagnostics');
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

    const parsedPage = parsePaginationInteger(page, 1);
    const parsedLimit = parsePaginationInteger(limit, 50, MAX_PAGE_LIMIT);
    const parsedTrainerId = trainerId ? parsePositiveInteger(trainerId) : null;
    const parsedClientId = clientId ? parsePositiveInteger(clientId) : null;

    if (!parsedPage || !parsedLimit) {
      return res.status(400).json({
        success: false,
        message: `Page and limit must be positive integers; limit cannot exceed ${MAX_PAGE_LIMIT}`
      });
    }

    if (status && !VALID_ASSIGNMENT_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${Array.from(VALID_ASSIGNMENT_STATUSES).join(', ')}`
      });
    }

    if (trainerId && !parsedTrainerId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID must be a positive integer'
      });
    }

    if (clientId && !parsedClientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID must be a positive integer'
      });
    }

    // Build query conditions
    const whereConditions = {};
    
    if (status) {
      whereConditions.status = status;
    } else if (!parseBooleanQuery(includeInactive)) {
      whereConditions.status = 'active';
    }
    
    if (trainerId) {
      whereConditions.trainerId = parsedTrainerId;
    }
    
    if (clientId) {
      whereConditions.clientId = parsedClientId;
    }

    // Calculate pagination
    const offset = (parsedPage - 1) * parsedLimit;

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    // Try with full associations first, fallback to basic query if associations fail
    let count = 0;
    let assignments = [];

    try {
      const result = await ClientTrainerAssignment.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions', 'clientSource'],
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
            required: false
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parsedLimit,
        offset: offset
      });
      count = result.count;
      assignments = result.rows;
    } catch (includeError) {
      // If include fails, try without assignedByUser association
      logger.warn('Full association query failed, trying without assignedByUser:', includeError.message);
      const result = await ClientTrainerAssignment.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions', 'clientSource'],
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
        limit: parsedLimit,
        offset: offset
      });
      count = result.count;
      assignments = result.rows;
    }

    const totalPages = Math.ceil(count / parsedLimit);

    logger.info(`Retrieved ${assignments.length} assignments for admin`, {
      userId: req.user.id,
      filters: { status, trainerId, clientId },
      pagination: { page: parsedPage, limit: parsedLimit, totalPages }
    });

    res.json({
      success: true,
      assignments,
      pagination: {
        currentPage: parsedPage,
        totalPages,
        totalCount: count,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1
      }
    });

  } catch (error) {
    logger.error('Error fetching assignments:', error);
    sendInternalError(res, 'Failed to fetch assignments');
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
    const parsedTrainerId = parsePositiveInteger(trainerId);
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    if (!parsedTrainerId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID must be a positive integer'
      });
    }

    // Trainers can only view their own assignments, admins can view any.
    // String() both sides after strict route-param parsing so string and
    // numeric auth IDs both pass for the trainer's own account.
    if (requestingUserRole === 'trainer' && String(parsedTrainerId) !== String(requestingUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Trainers can only view their own assigned clients'
      });
    }

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();
    const ClientOnboardingQuestionnaire = getClientOnboardingQuestionnaireModel();

    const assignments = await ClientTrainerAssignment.findAll({
      where: {
        trainerId: parsedTrainerId,
        status: 'active'
      },
      // lastModifiedBy removed from model — no exclude needed,
      include: [
        {
          model: User,
          as: 'client',
          attributes: [
            'id',
            'firstName',
            'lastName',
            'email',
            'availableSessions',
            'clientSource',
            'accountStatus',
            'forcePasswordChange',
            'phone',
            'fitnessGoal',
            'trainingExperience',
            'photo',
            'healthConcerns',
            'emergencyContact',
            'isOnboardingComplete'
          ],
          required: false
        },
        {
          model: User,
          as: 'assignedByUser',
          attributes: ['id', 'firstName', 'lastName'],
          required: false // Make optional in case assignedBy column is missing or null
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const clientIds = assignments
      .map((assignment) => assignment?.client?.id)
      .filter((clientId) => Number.isSafeInteger(Number(clientId)) && Number(clientId) > 0);
    let onboardingProgressMap = {};

    if (ClientOnboardingQuestionnaire?.findAll && clientIds.length > 0) {
      try {
        const questionnaires = await ClientOnboardingQuestionnaire.findAll({
          attributes: ['userId', 'status', 'responsesJson', 'nutritionPrefs', 'completedAt', 'createdAt', 'updatedAt'],
          where: {
            userId: { [Op.in]: clientIds },
            status: { [Op.ne]: 'archived' }
          },
          order: [
            ['userId', 'ASC'],
            ['updatedAt', 'DESC'],
            ['createdAt', 'DESC']
          ],
          raw: true
        });
        onboardingProgressMap = buildOnboardingProgressMap(questionnaires);
      } catch (metricError) {
        logger.warn(`Trainer assignment onboarding progress unavailable: ${metricError.message}`);
      }
    }

    const enrichedAssignments = attachOnboardingReadiness(assignments, onboardingProgressMap);

    logger.info(`Trainer ${parsedTrainerId} retrieved ${assignments.length} assigned clients`, {
      requestingUserId,
      trainerId: parsedTrainerId
    });

    res.json({
      success: true,
      assignments: enrichedAssignments,
      totalClients: enrichedAssignments.length
    });

  } catch (error) {
    logger.error('Error fetching trainer assignments:', error);
    sendInternalError(res, 'Failed to fetch trainer assignments');
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
    const parsedClientId = parsePositiveInteger(clientId);

    if (!parsedClientId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID must be a positive integer'
      });
    }

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        clientId: parsedClientId,
        status: 'active'
      },
      // lastModifiedBy removed from model — no exclude needed,
      include: [
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
          required: false // Make optional in case assignedBy column is missing or null
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    logger.info(`Retrieved assignment for client ${parsedClientId}`, {
      userId: req.user.id,
      hasAssignment: !!assignment
    });

    res.json({
      success: true,
      assignment: assignment || null
    });

  } catch (error) {
    logger.error('Error fetching client assignment:', error);
    sendInternalError(res, 'Failed to fetch client assignment');
  }
});

/**
 * @route   POST /api/assignments
 * @desc    Create new client-trainer assignment
 * @access  Admin Only
 * @body    { clientId, trainerId, notes? }
 */
/**
 * Validate compensation input for create/update (mode b: employed trainers).
 * Returns { error } on bad input, else { mode, rate } where undefined means
 * "not provided" (leave unchanged / use default).
 */
export function parseCompensationInput({ compensationMode, flatSessionRate }, existing = {}) {
  const VALID_MODES = ['revenue_share', 'per_session_flat'];
  let mode;
  if (compensationMode !== undefined) {
    if (!VALID_MODES.includes(compensationMode)) {
      return { error: `Invalid compensationMode. Must be one of: ${VALID_MODES.join(', ')}` };
    }
    mode = compensationMode;
  }

  let rate;
  if (flatSessionRate !== undefined && flatSessionRate !== null && flatSessionRate !== '') {
    // Only accept a number or a numeric string — Number(true)===1 and
    // Number([50])===50 would otherwise slip through.
    const isNumericInput = typeof flatSessionRate === 'number'
      || (typeof flatSessionRate === 'string' && flatSessionRate.trim() !== '');
    const parsed = isNumericInput ? Number(flatSessionRate) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 10000) {
      return { error: 'flatSessionRate must be a positive dollar amount (max 10000)' };
    }
    rate = Math.round(parsed * 100) / 100;
  }

  const effectiveMode = mode ?? existing.compensationMode ?? 'revenue_share';
  const effectiveRate = rate ?? (existing.flatSessionRate != null ? Number(existing.flatSessionRate) : null);
  if (effectiveMode === 'per_session_flat' && (!Number.isFinite(effectiveRate) || effectiveRate <= 0)) {
    return { error: 'flatSessionRate is required (positive) when compensationMode is per_session_flat' };
  }

  return { mode, rate };
}

/**
 * Resolve the compensation a NEW assignment should be created with:
 * explicit admin input wins; otherwise inherit the trainer's default.
 * A flat default without a valid rate falls back to revenue_share so a
 * misconfigured default can never block drag-drop assignment.
 */
export function resolveInheritedCompensation(compensation, trainer) {
  if (compensation?.mode !== undefined) {
    return { mode: compensation.mode, rate: compensation.rate ?? null };
  }
  const defaultRate = trainer?.defaultFlatSessionRate != null
    ? Number(trainer.defaultFlatSessionRate)
    : null;
  if (
    trainer?.defaultCompensationMode === 'per_session_flat'
    && Number.isFinite(compensation?.rate ?? defaultRate)
    && (compensation?.rate ?? defaultRate) > 0
  ) {
    return {
      mode: 'per_session_flat',
      rate: Math.round((compensation?.rate ?? defaultRate) * 100) / 100,
      inherited: true,
    };
  }
  return { mode: 'revenue_share', rate: compensation?.rate ?? null };
}

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { clientId, trainerId, notes, compensationMode, flatSessionRate } = req.body;
    const assignedBy = parsePositiveInteger(req.user.id);
    const parsedClientId = parsePositiveInteger(clientId);
    const parsedTrainerId = parsePositiveInteger(trainerId);

    // Validate required fields
    if (!parsedClientId || !parsedTrainerId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and Trainer ID must be positive integers'
      });
    }

    if (!assignedBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Prevent self-assignment
    if (parsedClientId === parsedTrainerId) {
      return res.status(400).json({
        success: false,
        message: 'Client and trainer cannot be the same user'
      });
    }

    const compensation = parseCompensationInput({ compensationMode, flatSessionRate });
    if (compensation.error) {
      return res.status(400).json({ success: false, message: compensation.error });
    }

    const ClientTrainerAssignment = getClientTrainerAssignment();
    const User = getUser();

    logger.info('[ASSIGN-DEBUG] Step 1: Looking up client=%d trainer=%d', parsedClientId, parsedTrainerId);

    // Verify users exist and have correct roles
    let client, trainer;
    try {
      [client, trainer] = await Promise.all([
        User.findOne({
          where: {
            id: parsedClientId,
            role: { [Op.in]: ['client', 'user'] }
          }
        }),
        User.findOne({
          where: {
            id: parsedTrainerId,
            role: { [Op.in]: ['trainer', 'admin'] }
          }
        })
      ]);
      logger.info('[ASSIGN-DEBUG] Step 1 done: client=%s trainer=%s',
        client ? `${client.firstName} (role=${client.role})` : 'NOT FOUND',
        trainer ? `${trainer.firstName} (role=${trainer.role})` : 'NOT FOUND');
    } catch (lookupErr) {
      logger.error('[ASSIGN-DEBUG] Step 1 FAILED:', lookupErr.message);
      return sendInternalError(res, 'Failed to create assignment');
    }

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

    logger.info('[ASSIGN-DEBUG] Step 2: Checking existing assignment');

    // Check if assignment already exists
    let existingAssignment;
    try {
      existingAssignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parsedClientId,
          trainerId: parsedTrainerId,
          status: 'active'
        }
      });
      logger.info('[ASSIGN-DEBUG] Step 2 done: existing=%s', existingAssignment ? 'YES' : 'NO');
    } catch (findErr) {
      logger.error('[ASSIGN-DEBUG] Step 2 FAILED:', findErr.message);
      return sendInternalError(res, 'Failed to create assignment');
    }

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: 'Client is already assigned to this trainer'
      });
    }

    logger.info('[ASSIGN-DEBUG] Step 3: Deactivating old assignments');

    // Deactivate any existing active assignments for this client
    try {
      await ClientTrainerAssignment.update(
        { status: 'inactive' },
        {
          where: {
            clientId: parsedClientId,
            status: 'active'
          }
        }
      );
      logger.info('[ASSIGN-DEBUG] Step 3 done');
    } catch (deactivateErr) {
      logger.error('[ASSIGN-DEBUG] Step 3 FAILED:', deactivateErr.message);
      return sendInternalError(res, 'Failed to create assignment');
    }

    logger.info('[ASSIGN-DEBUG] Step 4: Creating new assignment');

    // Create new assignment — raw SQL only (ORM may fail due to FK table name mismatch)
    let assignment;
    try {
      const [rows] = await sequelize.query(
        `INSERT INTO client_trainer_assignments ("clientId", "trainerId", "assignedBy", notes, status, compensation_mode, flat_session_rate, "createdAt", "updatedAt")
         VALUES (:clientId, :trainerId, :assignedBy, :notes, 'active', :compensationMode, :flatSessionRate, NOW(), NOW())
         RETURNING *`,
        {
          replacements: (() => {
            // Inherit the trainer's default when the admin didn't specify.
            const resolved = resolveInheritedCompensation(compensation, trainer);
            if (resolved.inherited) {
              logger.info('[ASSIGN] Inherited trainer default compensation', {
                trainerId: parsedTrainerId,
                mode: resolved.mode,
                rate: resolved.rate,
              });
            }
            return {
              clientId: parsedClientId,
              trainerId: parsedTrainerId,
              assignedBy,
              notes: notes || null,
              compensationMode: resolved.mode,
              flatSessionRate: resolved.rate
            };
          })()
        }
      );
      if (!rows || rows.length === 0) {
        throw new Error('Raw SQL insert returned no rows');
      }
      assignment = rows[0];
      logger.info('[ASSIGN-DEBUG] Step 4 done: assignment id=%d', assignment.id);
    } catch (createErr) {
      logger.error('[ASSIGN-DEBUG] Step 4 FAILED:', createErr.message);
      return sendInternalError(res, 'Failed to create assignment');
    }

    const assignmentId = assignment.id;

    // Fetch the complete assignment with related data
    let completeAssignment = assignment;
    try {
      const fetched = await ClientTrainerAssignment.findByPk(assignmentId, {
        include: [
          {
            model: User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          },
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false
          },
          {
            model: User,
            as: 'assignedByUser',
            attributes: ['id', 'firstName', 'lastName'],
            required: false
          }
        ]
      });
      if (fetched) completeAssignment = fetched;
      logger.info('[ASSIGN-DEBUG] Step 5: Re-fetch done');
    } catch (fetchErr) {
      logger.warn('[ASSIGN-DEBUG] Step 5: Re-fetch failed (non-fatal):', fetchErr.message);
    }

    logger.info(`Admin ${assignedBy} assigned client ${parsedClientId} to trainer ${parsedTrainerId}`, {
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
    sendInternalError(res, 'Failed to create assignment');
  }
});

/**
 * @route   PUT /api/assignments/trainer/:trainerId/compensation-default
 * @desc    Set a trainer's DEFAULT compensation (inherited by new assignments)
 * @access  Admin Only
 * @body    { compensationMode?, flatSessionRate? }
 */
router.put('/trainer/:trainerId/compensation-default', protect, adminOnly, async (req, res) => {
  try {
    const parsedTrainerId = parsePositiveInteger(req.params.trainerId);
    if (!parsedTrainerId) {
      return res.status(400).json({ success: false, message: 'Trainer ID must be a positive integer' });
    }

    const User = getUser();
    const trainer = await User.findOne({
      where: { id: parsedTrainerId, role: { [Op.in]: ['trainer', 'admin'] } }
    });
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found' });
    }

    const { compensationMode, flatSessionRate } = req.body;
    // Validate against the trainer's EXISTING defaults so re-enabling flat
    // mode with a stored rate doesn't require re-typing the rate.
    const compensation = parseCompensationInput(
      { compensationMode, flatSessionRate },
      { compensationMode: trainer.defaultCompensationMode, flatSessionRate: trainer.defaultFlatSessionRate }
    );
    if (compensation.error) {
      return res.status(400).json({ success: false, message: compensation.error });
    }
    if (compensation.mode === undefined && compensation.rate === undefined) {
      return res.status(400).json({ success: false, message: 'Provide compensationMode and/or flatSessionRate' });
    }

    const updateData = {};
    if (compensation.mode !== undefined) updateData.defaultCompensationMode = compensation.mode;
    if (compensation.rate !== undefined) updateData.defaultFlatSessionRate = compensation.rate;
    // Flat-mode-needs-a-rate is enforced by parseCompensationInput above
    // (existing-aware), so updateData is safe to apply as-is.

    await trainer.update(updateData);

    logger.info(`Admin ${req.user.id} set default compensation for trainer ${parsedTrainerId}`, updateData);

    res.json({
      success: true,
      trainerId: parsedTrainerId,
      defaultCompensationMode: trainer.defaultCompensationMode,
      defaultFlatSessionRate: trainer.defaultFlatSessionRate != null ? Number(trainer.defaultFlatSessionRate) : null,
      message: 'Trainer default compensation updated'
    });
  } catch (error) {
    logger.error('Error updating trainer default compensation:', error);
    sendInternalError(res, 'Failed to update trainer default compensation');
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
    const parsedAssignmentId = parsePositiveInteger(id);
    const { status, notes, compensationMode, flatSessionRate } = req.body;
    const updatedBy = req.user.id;

    if (!parsedAssignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Assignment ID must be a positive integer'
      });
    }

    const ClientTrainerAssignment = getClientTrainerAssignment();

    const assignment = await ClientTrainerAssignment.findByPk(parsedAssignmentId, {
      // lastModifiedBy removed from model — no exclude needed
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

    const compensation = parseCompensationInput({ compensationMode, flatSessionRate }, assignment);
    if (compensation.error) {
      return res.status(400).json({ success: false, message: compensation.error });
    }

    // Update assignment
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (compensation.mode !== undefined) updateData.compensationMode = compensation.mode;
    if (compensation.rate !== undefined) updateData.flatSessionRate = compensation.rate;
    // Switching back to revenue_share keeps the stored rate for history; the
    // accrual service only reads it in per_session_flat mode.

    await assignment.update(updateData);

    // Fetch updated assignment with related data
    const User = getUser();
    const updatedAssignment = await ClientTrainerAssignment.findByPk(parsedAssignmentId, {
      // lastModifiedBy removed from model — no exclude needed,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: User,
          as: 'assignedByUser',
          attributes: ['id', 'firstName', 'lastName'],
          required: false // Make optional in case assignedBy column is missing or null
        }
      ]
    });

    logger.info(`Admin ${updatedBy} updated assignment ${parsedAssignmentId}`, {
      changes: updateData,
      assignmentId: parsedAssignmentId
    });

    res.json({
      success: true,
      assignment: updatedAssignment,
      message: 'Assignment updated successfully'
    });

  } catch (error) {
    logger.error('Error updating assignment:', error);
    sendInternalError(res, 'Failed to update assignment');
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
    const parsedAssignmentId = parsePositiveInteger(id);
    const deletedBy = req.user.id;

    if (!parsedAssignmentId) {
      return res.status(400).json({
        success: false,
        message: 'Assignment ID must be a positive integer'
      });
    }

    const ClientTrainerAssignment = getClientTrainerAssignment();

    const assignment = await ClientTrainerAssignment.findByPk(parsedAssignmentId, {
      // lastModifiedBy removed from model — no exclude needed
    });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Set status to inactive instead of hard delete for audit trail
    await assignment.update({ status: 'inactive' });

    logger.info(`Admin ${deletedBy} deactivated assignment ${parsedAssignmentId}`, {
      assignmentId: parsedAssignmentId,
      originalStatus: assignment.status
    });

    res.json({
      success: true,
      message: 'Assignment deactivated successfully'
    });

  } catch (error) {
    logger.error('Error deleting assignment:', error);
    sendInternalError(res, 'Failed to delete assignment');
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
      attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions', 'clientSource', 'createdAt'],
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
    sendInternalError(res, 'Failed to fetch unassigned clients');
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
    sendInternalError(res, 'Failed to fetch assignment statistics');
  }
});

export default router;
