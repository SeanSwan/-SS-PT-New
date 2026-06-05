/**
 * Admin Client Management Controller (CRUD + Analytics)
 * ========================================================
 *
 * Purpose: Admin-only CRUD operations and analytics for client user management
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Admin Dashboard
 *
 * Architecture Overview:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Admin Client   │─────▶│  Admin Client    │─────▶│  PostgreSQL     │
 * │  Dashboard      │      │  Controller      │      │  + API Services │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *                                   │
 *                                   │ (optional)
 *                                   ▼
 *                          ┌──────────────────┐
 *                          │  API Services    │
 *                          │  Workout Stats   │
 *                          └──────────────────┘
 *
 * Database Relationships (ER Diagram):
 *
 *   ┌─────────────────────┐
 *   │ users (CLIENT)      │
 *   │ ├─id (PK)           │
 *   │ ├─role = 'client'   │
 *   │ ├─firstName         │
 *   │ └─fitnessGoal       │
 *   └─────────────────────┘
 *          │
 *          │ (has many)
 *          ├──────────────────────────┐
 *          │                          │
 *          ▼                          ▼
 *   ┌─────────────────────┐   ┌─────────────────────┐
 *   │ client_progress     │   │ workout_sessions    │
 *   │ ├─userId (FK)       │   │ ├─userId (FK)       │
 *   │ ├─weight            │   │ ├─status            │
 *   │ └─measurements      │   │ └─completedAt       │
 *   └─────────────────────┘   └─────────────────────┘
 *          │                          │
 *          │                          │
 *          ▼                          ▼
 *   ┌─────────────────────┐   ┌─────────────────────┐
 *   │ sessions (training) │   │ orders (purchases)  │
 *   │ ├─clientId (FK)     │   │ ├─userId (FK)       │
 *   │ ├─trainerId (FK)    │   │ ├─amount            │
 *   │ └─status            │   │ └─status            │
 *   └─────────────────────┘   └─────────────────────┘
 *
 * Controller Methods (10 total):
 *
 * ┌────────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD                     PURPOSE                          HTTP METHOD       │
 * ├────────────────────────────────────────────────────────────────────────────────┤
 * │ getClients                 List all clients (paginated)     GET               │
 * │ getClientDetails           Get single client details        GET               │
 * │ createClient               Create new client                POST              │
 * │ updateClient               Update client profile            PUT               │
 * │ deleteClient               Soft delete client               DELETE            │
 * │ resetClientPassword        Reset client password            POST              │
 * │ assignTrainer              Assign trainer to client         POST              │
 * │ getClientWorkoutStats      Get workout analytics            GET               │
 * │ generateWorkoutPlan        Generate AI workout plan         POST              │
 * │ getMCPStatus               Retired bridge status           GET               │
 * └────────────────────────────────────────────────────────────────────────────────┘
 *
 * Request/Response Flow (Mermaid):
 * ```mermaid
 * sequenceDiagram
 *     participant A as Admin Dashboard
 *     participant R as Express Router
 *     participant M as protect + adminOnly
 *     participant C as AdminClientController
 *     participant DB as PostgreSQL
 *     participant API as API Services
 *
 *     A->>R: GET /api/admin/clients?page=1&limit=10
 *     R->>M: Authenticate + authorize
 *
 *     alt Not admin
 *         M-->>A: 403 Forbidden
 *     else Is admin
 *         M->>C: getClients(req, res)
 *         C->>DB: User.findAndCountAll(where: { role: 'client' })
 *         C->>DB: Include ClientProgress, Sessions, WorkoutSessions
 *         DB-->>C: Return clients with relations
 *         C->>C: Enrich with totalWorkouts, totalOrders
 *         C-->>A: 200 OK + paginated clients
 *     end
 * ```
 *
 * Query Parameters (getClients):
 *
 * ┌───────────────────────────────────────────────────────────────┐
 * │ PARAMETER      TYPE      DEFAULT    PURPOSE                   │
 * ├───────────────────────────────────────────────────────────────┤
 * │ page           number    1          Pagination page number    │
 * │ limit          number    10         Results per page          │
 * │ search         string    null       Search name/email         │
 * │ status         string    null       Filter by active/inactive │
 * │ sortBy         string    createdAt  Sort field                │
 * │ sortOrder      string    DESC       Sort direction            │
 * │ fitnessGoal    string    null       Filter by fitness goal    │
 * │ trainer        string    null       Filter by assigned trainer│
 * └───────────────────────────────────────────────────────────────┘
 *
 * Response Formats:
 *
 * 200 OK - getClients success
 * {
 *   success: true,
 *   data: {
 *     clients: [
 *       {
 *         id: "uuid",
 *         firstName: "John",
 *         lastName: "Doe",
 *         email: "john@example.com",
 *         fitnessGoal: "weight_loss",
 *         totalWorkouts: 45,
 *         totalOrders: 3,
 *         lastWorkout: { ... },
 *         nextSession: { ... }
 *       }
 *     ],
 *     pagination: { page: 1, limit: 10, total: 150, pages: 15 }
 *   }
 * }
 *
 * 200 OK - getClientDetails success
 * {
 *   success: true,
 *   data: {
 *     client: { ...full client details },
 *     mcpStats: { workout: { ... } }
 *   }
 * }
 *
 * 201 Created - createClient success
 * {
 *   success: true,
 *   message: "Client created successfully",
 *   data: { client: { ...new client } }
 * }
 *
 * Error Responses:
 *
 * 400 Bad Request - Missing required fields
 * {
 *   success: false,
 *   message: "Missing required fields"
 * }
 *
 * 404 Not Found - Client not found
 * {
 *   success: false,
 *   message: "Client not found"
 * }
 *
 * 409 Conflict - Email/username already exists
 * {
 *   success: false,
 *   message: "Email already exists"
 * }
 *
 * 500 Internal Server Error - Database/server error
 * {
 *   success: false,
 *   message: "Error fetching clients",
 *   error: "..."
 * }
 *
 * Security Model:
 * - ALL methods require admin role (enforced via adminOnly middleware in routes)
 * - Password field excluded from all queries (never returned to frontend)
 * - refreshTokenHash excluded from responses
 * - bcrypt password hashing (10 rounds) on createClient/resetPassword
 * - No raw SQL queries (Sequelize ORM parameterization prevents SQL injection)
 *
 * Business Logic:
 *
 * WHY Enrich Clients with Computed Fields (totalWorkouts, totalOrders)?
 * - Performance: Avoids N+1 queries in frontend (1 API call vs N)
 * - UX: Admin dashboard shows key metrics at a glance
 * - Database optimization: Uses COUNT(*) instead of loading all records
 * - Cached data: Could be denormalized in future for instant retrieval
 *
 * WHY Include Related Data (ClientProgress, Sessions, WorkoutSessions)?
 * - Context: Admins need full client picture (not just user profile)
 * - Workflow: "View client → See upcoming sessions" (single page load)
 * - Eager loading: Prevents N+1 query problem (Sequelize `include`)
 * - Pagination: Limits related records (5 sessions max) to prevent bloat
 *
 * WHY Soft Delete Instead of Hard Delete?
 * - Data integrity: Preserves workout history for other clients
 * - Compliance: NASM requires historical audit trail
 * - Trainer relationships: Prevents orphaned session records
 * - Revenue tracking: Orders remain linked to deleted clients
 * - Restoration: Admins can undo accidental deletions
 *
 * WHY First-Party API Analytics?
 * - Runtime simplicity: Workout stats stay inside SwanStudios API services.
 * - Cost control: Retired MCP servers are not started by default.
 * - Fault tolerance: Missing optional analytics fail closed without blocking core client records.
 * - Future-proof: Compatibility method names remain until all callers migrate.
 *
 * WHY Password Reset (Admin Override)?
 * - Support workflow: Clients forget passwords, admins help
 * - Security: Generates secure random password (bcrypt hashed)
 * - Audit trail: Logged for compliance (admin reset client password)
 * - No email required: Admin can provide password directly to client
 *
 * First-Party API Analytics:
 *
 * Workout Statistics:
 * - Source: local SwanStudios workout/session API and database records
 * - Used in: getClientDetails and admin workout statistics
 * - Failure handling: Logs warning, returns empty stats (graceful degradation)
 *
 * Performance Considerations:
 * - Pagination prevents loading 1000+ clients at once
 * - Eager loading (include) prevents N+1 query problem
 * - Separate queries for totalWorkouts/totalOrders (could be optimized with joins)
 * - Database indexes on role, isActive, createdAt (query optimization)
 * - Optional analytics timeout: add a bounded timeout if an external provider is introduced later.
 * - Total response time: ~50-200ms for getClients (10 records)
 *
 * Dependencies:
 * - User model (Sequelize): PostgreSQL users table
 * - ClientProgress model: Client fitness progress tracking
 * - Session model: Training session management
 * - WorkoutSession model: Completed workout records
 * - Order model: Purchase history
 * - bcrypt: Password hashing (10 rounds)
 * - logger: Winston-based logging utility
 * - Sequelize Op: Query operators (Op.iLike, Op.or)
 *
 * Testing:
 * - Unit tests: backend/tests/adminClientController.test.mjs
 * - Test cases:
 *   - ✅ getClients with pagination → returns 10 clients
 *   - ✅ getClients with search → filters by name/email
 *   - ✅ getClientDetails → includes related data
 *   - ✅ createClient → creates user with role=client
 *   - ✅ updateClient → updates fields correctly
 *   - ✅ deleteClient → soft delete (isActive = false)
 *   - ✅ resetPassword → generates secure password
 *   - ✅ Optional analytics failure → graceful degradation
 *
 * Future Enhancements:
 * - Add bulk operations (bulk assign trainer, bulk delete)
 * - Add export to CSV functionality
 * - Implement real-time client status updates (WebSocket)
 * - Add advanced analytics (retention rate, engagement score)
 * - Cache frequently accessed client data (Redis)
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

// backend/controllers/adminClientController.mjs
import crypto from 'crypto';
import { getAllModels } from '../models/index.mjs';
import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import bcrypt from 'bcryptjs';
import { sendGridEmail } from '../services/sendgridService.mjs';
import { getMeasurementStatus } from '../services/measurementScheduleService.mjs';
import { generateClaimToken } from '../services/claimTokenService.mjs';
import { listPaidClientActivationQueue } from '../services/adminClientActivationQueueService.mjs';
import { NON_DEDUCTING_CLIENT_SOURCES } from '../services/sessionBillingPolicy.mjs';
import { normalizePaidSessionCount } from '../services/sessionBillingPolicy.mjs';
import { sendPasswordResetEmailForUser } from '../services/auth/passwordResetEmailService.mjs';
import { normalizeClientOnboardEmailInput as normalizeAdminClientEmailInput } from '../services/clientOnboardIdentityService.mjs';

// NOTE: Do not call async getModels() here. Models are initialized at server startup via initializeModelsCache().
// We load models lazily from the cache to avoid module-load timing issues in tests/CLI tooling.
let User;
let ClientProgress;
let Session;
let WorkoutSession;
let Order;
let DailyWorkoutForm;

const ensureModels = () => {
  if (User && ClientProgress && Session && WorkoutSession && Order && DailyWorkoutForm) return;
  const models = getAllModels();
  User = models.User;
  ClientProgress = models.ClientProgress;
  Session = models.Session;
  WorkoutSession = models.WorkoutSession;
  Order = models.Order;
  DailyWorkoutForm = models.DailyWorkoutForm;
  if (!User) throw new Error('User model not available — model cache may not be initialized');
};

const INTERNAL_ERROR = 'internal_error';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sendInternalError(res, message) {
  return res.status(500).json({
    success: false,
    message,
    error: INTERNAL_ERROR,
  });
}

const parseNonNegativeSessionCount = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const CLIENT_EXPORT_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'phone',
  'clientSource',
  'availableSessions',
  'fitnessGoal',
  'isActive',
  'createdAt',
  'updatedAt',
];

const escapeCsvValue = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const serializeClientsToCsv = (rows) => [
  CLIENT_EXPORT_FIELDS.join(','),
  ...rows.map((row) => CLIENT_EXPORT_FIELDS.map((field) => escapeCsvValue(row[field])).join(',')),
].join('\n');

/**
 * AdminClientController class
 * Handles all admin-only client management operations
 */
class AdminClientController {
  /**
   * Get all clients with advanced filtering and pagination
   */
  async getClients(req, res) {
    try {
      ensureModels();
      const {
        page = 1,
        limit = 10,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        fitnessGoal,
        trainer,
        clientSource
      } = req.query;

      const safePage = Math.max(1, parseInt(page) || 1);
      const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 10));
      const offset = (safePage - 1) * safeLimit;
      const whereClause = { role: 'client' };
      
      // Build search conditions
      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      if (status) {
        whereClause.isActive = status === 'active';
      }
      
      if (fitnessGoal) {
        whereClause.fitnessGoal = { [Op.iLike]: `%${fitnessGoal}%` };
      }

      if (clientSource) {
        whereClause.clientSource = clientSource;
      }

      // Include related data
      // Only include WorkoutSession if the association exists (defensive check)
      const hasWorkoutAssociation = User.associations?.workoutSessions;

      const includeOptions = [
        {
          model: ClientProgress,
          as: 'clientProgress',
          required: false
        },
        {
          model: Session,
          as: 'clientSessions',
          required: false,
          attributes: ['id', 'sessionDate', 'duration', 'status', 'location', 'trainerId'],
          where: { status: { [Op.in]: ['scheduled', 'confirmed'] } },
          separate: true,
          limit: 5,
          order: [['sessionDate', 'ASC']]
        }
      ];

      // Only add WorkoutSession include if association is defined
      if (hasWorkoutAssociation) {
        includeOptions.push({
          model: WorkoutSession,
          as: 'workoutSessions',
          // Keep this list aligned with actual workout_sessions columns in production/dev.
          attributes: [
            'id',
            'userId',
            'title',
            'date',
            'duration',
            'status',
            'sessionType',
            'startedAt',
            'completedAt',
            'trainerId',
            'avgRPE',
            'createdAt'
          ],
          required: false,
          where: { status: 'completed' },
          separate: true,
          limit: 5,
          order: [['completedAt', 'DESC']]
        });
      }

      let count, clients;
      try {
        const result = await User.findAndCountAll({
          where: whereClause,
          include: includeOptions,
          limit: safeLimit,
          offset,
          order: [[sortBy, sortOrder.toUpperCase()]],
          attributes: { exclude: ['password', 'refreshTokenHash'] }
        });
        count = result.count;
        clients = result.rows;
      } catch (includeErr) {
        // Defensive: if includes fail (e.g., association not set up), fall back to basic query
        logger.warn(`Client query with includes failed (${includeErr.message}), falling back to basic query`);
        const result = await User.findAndCountAll({
          where: whereClause,
          limit: safeLimit,
          offset,
          order: [[sortBy, sortOrder.toUpperCase()]],
          attributes: { exclude: ['password', 'refreshTokenHash'] }
        });
        count = result.count;
        clients = result.rows;
      }

      // Batch-fetch workout and order counts for ALL clients in 2 queries
      // (replaces N+1 pattern that ran 2 COUNT queries per client)
      const clientIds = clients.map(c => c.id);

      const workoutCountMap = {};
      if (WorkoutSession?.findAll && clientIds.length > 0) {
        try {
          const workoutCounts = await WorkoutSession.findAll({
            attributes: [
              'userId',
              [sequelize.fn('COUNT', sequelize.col('id')), 'total']
            ],
            where: { userId: { [Op.in]: clientIds }, status: 'completed' },
            group: ['userId'],
            raw: true
          });
          for (const row of workoutCounts) {
            workoutCountMap[row.userId] = parseInt(row.total) || 0;
          }
        } catch (metricError) {
          logger.warn(`WorkoutSession batch count unavailable: ${metricError.message}`);
        }
      }

      const orderCountMap = {};
      if (Order?.findAll && clientIds.length > 0) {
        try {
          const orderCounts = await Order.findAll({
            attributes: [
              'userId',
              [sequelize.fn('COUNT', sequelize.col('id')), 'total']
            ],
            where: { userId: { [Op.in]: clientIds } },
            group: ['userId'],
            raw: true
          });
          for (const row of orderCounts) {
            orderCountMap[row.userId] = parseInt(row.total) || 0;
          }
        } catch (metricError) {
          logger.warn(`Order batch count unavailable: ${metricError.message}`);
        }
      }

      // Enrich client data with computed fields
      const enrichedClients = clients.map((client) => {
        // Strip masterPromptJson from list response (large blob, fetch on detail view only)
        const { masterPromptJson, ...clientData } = client.toJSON();

        // Measurement schedule status (green/yellow/red)
        const scheduleStatus = getMeasurementStatus(clientData);

        return {
          ...clientData,
          onboardingComplete: masterPromptJson != null,
          totalWorkouts: workoutCountMap[client.id] || 0,
          totalOrders: orderCountMap[client.id] || 0,
          lastWorkout: clientData.workoutSessions?.[0] || null,
          nextSession: clientData.clientSessions?.[0] || null,
          measurementSchedule: scheduleStatus,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          clients: enrichedClients,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching clients:', error.message);
      logger.error('Stack:', error.stack);
      return sendInternalError(res, 'Error fetching clients');
    }
  }

  /**
   * Get paid clients who still need waiver, onboarding, allocation, or first scheduling.
   */
  async getClientActivationQueue(req, res) {
    try {
      const data = await listPaidClientActivationQueue({
        limit: req.query.limit,
        nextStep: req.query.nextStep,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error('Error fetching client activation queue:', error.message);
      return sendInternalError(res, 'Error fetching client activation queue');
    }
  }

  /**
   * Export client records for admin operations.
   */
  async exportClients(req, res) {
    try {
      ensureModels();
      const { format = 'csv', status, clientSource } = req.query;
      const exportFormat = format === 'json' ? 'json' : 'csv';
      const whereClause = { role: 'client' };

      if (status === 'active') {
        whereClause.isActive = true;
      } else if (status === 'inactive') {
        whereClause.isActive = false;
      }

      if (clientSource) {
        whereClause.clientSource = clientSource;
      }

      const clients = await User.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        attributes: CLIENT_EXPORT_FIELDS,
      });

      const rows = clients.map((client) => {
        const data = typeof client.toJSON === 'function' ? client.toJSON() : client;
        return CLIENT_EXPORT_FIELDS.reduce((row, field) => ({
          ...row,
          [field]: data[field] ?? '',
        }), {});
      });

      const dateStamp = new Date().toISOString().slice(0, 10);
      if (exportFormat === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="swanstudios-clients-${dateStamp}.json"`);
        return res.status(200).json({
          success: true,
          count: rows.length,
          clients: rows,
        });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="swanstudios-clients-${dateStamp}.csv"`);
      return res.status(200).send(serializeClientsToCsv(rows));
    } catch (error) {
      logger.error('Error exporting clients:', error.message);
      return sendInternalError(res, 'Error exporting clients');
    }
  }

  /**
   * Get detailed client information
   */
  async getClientDetails(req, res) {
    try {
      ensureModels();
      const { clientId } = req.params;

      // Build include options with defensive WorkoutSession check
      const hasWorkoutAssociation = User.associations?.workoutSessions;
      const detailIncludes = [
        {
          model: ClientProgress,
          as: 'clientProgress'
        },
        {
          model: Session,
          as: 'clientSessions',
          include: [
            {
              model: User,
              as: 'trainer',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        },
        {
          model: Order,
          as: 'orders',
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ];

      // Only add WorkoutSession if association exists
      if (hasWorkoutAssociation) {
        detailIncludes.push({
          model: WorkoutSession,
          as: 'workoutSessions',
          limit: 10,
          order: [['completedAt', 'DESC']]
        });
      }

      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        include: detailIncludes,
        attributes: { exclude: ['password', 'refreshTokenHash'] }
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Retired bridge decommissioned; stats are fetched from local DB only.
      const mcpStats = {};

      return res.status(200).json({
        success: true,
        data: {
          client: client.toJSON(),
          mcpStats
        }
      });
    } catch (error) {
      logger.error('Error fetching client details:', error);
      return sendInternalError(res, 'Error fetching client details');
    }
  }

  /**
   * Create a new client
   */
  async createClient(req, res) {
    const transaction = await sequelize.transaction();

    try {
      ensureModels();
      const {
        firstName,
        lastName,
        email,
        username,
        password,
        phone,
        dateOfBirth,
        gender,
        weight,
        height,
        fitnessGoal,
        trainingExperience,
        healthConcerns,
        emergencyContact,
        availableSessions = 0,
        trainerId,
        clientSource = 'swanstudios',
        forcePasswordChange = true // Default true for admin-created accounts
      } = req.body;

      // Validate clientSource against allowed values
      const validSources = ['swanstudios', 'move_fitness', 'external'];
      if (clientSource && !validSources.includes(clientSource)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid clientSource. Must be one of: ${validSources.join(', ')}`
        });
      }

      const requestedAvailableSessions = parseNonNegativeSessionCount(availableSessions);
      if (requestedAvailableSessions === null) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'availableSessions must be a non-negative whole number'
        });
      }

      const normalizedAvailableSessions = NON_DEDUCTING_CLIENT_SOURCES.has(clientSource)
        ? 0
        : requestedAvailableSessions;

      // Validate password if admin-supplied
      if (password && password.length < 8) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      const normalizedEmail = normalizeAdminClientEmailInput(email);
      if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Determine password: use admin-supplied or generate a secure one
      // base64url + special char suffix ensures validators requiring special chars pass
      const passwordSource = password ? 'admin-supplied' : 'generated';
      const effectivePassword = password || (crypto.randomBytes(12).toString('base64url') + '!A1');

      // Check if email/username already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email: { [Op.iLike]: normalizedEmail } }, { username }]
        }
      });

      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Email or username already exists'
        });
      }

      // Create the client (password hashed by User.beforeCreate hook)
      const newClient = await User.create({
        firstName,
        lastName,
        email: normalizedEmail,
        username,
        password: effectivePassword,
        phone,
        dateOfBirth,
        gender,
        weight,
        height,
        fitnessGoal,
        trainingExperience,
        healthConcerns,
        emergencyContact,
        availableSessions: normalizedAvailableSessions,
        clientSource,
        forcePasswordChange,
        role: 'client',
        isActive: true
      }, { transaction });

      // Create client progress record (skip if table doesn't exist)
      try {
        const [tableCheck] = await sequelize.query(
          `SELECT to_regclass('client_progress') AS exists`,
          { transaction }
        );
        if (tableCheck?.[0]?.exists) {
          await ClientProgress.create({ userId: newClient.id }, { transaction });
        }
      } catch (progressError) {
        logger.warn(`ClientProgress record skipped for user ${newClient.id}: ${progressError.message}`);
      }

      // If trainer specified, create initial sessions
      if (trainerId && normalizedAvailableSessions > 0) {
        const sessions = [];
        for (let i = 0; i < normalizedAvailableSessions; i++) {
          // sessionDate is NOT NULL — set to a future placeholder date offset by session index
          const placeholderDate = new Date();
          placeholderDate.setDate(placeholderDate.getDate() + i + 1);
          sessions.push({
            trainerId,
            userId: newClient.id,
            sessionDate: placeholderDate,
            status: 'available',
            sessionType: 'personal_training'
          });
        }
        await Session.bulkCreate(sessions, { transaction });
      }

      await transaction.commit();

      // Send welcome email with temp password (non-blocking, only for generated passwords)
      let emailSent = false;
      if (passwordSource === 'generated') {
        try {
          const safeFirst = String(firstName || '').replace(/[<>&"']/g, '');
          const safeEmail = String(normalizedEmail).replace(/[<>&"']/g, '');
          const result = await sendGridEmail({
            to: normalizedEmail,
            subject: 'Welcome to SwanStudios — Your Account is Ready',
            text: `Hi ${firstName},\n\nYour SwanStudios account has been created.\nEmail: ${normalizedEmail}\nTemporary Password: ${effectivePassword}\n\nPlease log in and change your password.\n\n— SwanStudios Team`,
            html: `<p>Hi ${safeFirst},</p><p>Your SwanStudios account has been created.</p><p><strong>Email:</strong> ${safeEmail}<br/><strong>Temporary Password:</strong> ${effectivePassword}</p><p>Please log in and change your password at your earliest convenience.</p><p>&mdash; SwanStudios Team</p>`,
          });
          emailSent = result?.success === true;
        } catch (emailError) {
          logger.warn(`Welcome email failed for ${normalizedEmail}: ${emailError.message}`);
        }
      }

      logger.info(`Admin ${req.user?.id ?? 'unknown'} created client ${newClient.id} (${normalizedEmail}), passwordSource=${passwordSource}, emailSent=${emailSent}`);

      return res.status(201).json({
        success: true,
        message: 'Client created successfully',
        data: {
          client: {
            id: newClient.id,
            firstName: newClient.firstName,
            lastName: newClient.lastName,
            email: newClient.email,
            forcePasswordChange
          },
          temporaryPassword: effectivePassword,
          passwordSource,
          emailSent
        }
      });
    } catch (error) {
      await transaction.rollback();
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ success: false, message: 'Email or username already exists' });
      }
      logger.error('Error creating client:', error);
      return sendInternalError(res, 'Error creating client');
    }
  }

  /**
   * Update client information
   */
  async updateClient(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      ensureModels();
      const { clientId } = req.params;
      const updates = req.body;

      const validSources = ['swanstudios', 'move_fitness', 'external'];
      if (updates.clientSource !== undefined && !validSources.includes(updates.clientSource)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid clientSource. Must be one of: ${validSources.join(', ')}`
        });
      }
      if (updates.isLocked !== undefined && typeof updates.isLocked !== 'boolean') {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'isLocked must be a boolean'
        });
      }

      // Strict whitelist — isActive excluded to force changes through soft-delete endpoint.
      // L5 (2026-05-02): canGenerateWorkoutPlans added so admins can flip the
      // per-client opt-in for self-service workout plan generation. Coerced
      // to a strict boolean below so non-boolean payloads can't sneak truthy
      // strings past the gate (the route additionally requires the
      // ENABLE_CLIENT_PLAN_SELFGEN env flag for clients to actually reach
      // the workout builder route).
      const allowedFields = [
        'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender',
        'weight', 'height', 'fitnessGoal', 'trainingExperience',
        'healthConcerns', 'emergencyContact', 'clientSource', 'accountStatus',
        'canGenerateWorkoutPlans', 'isLocked',
      ];
      const safeUpdates = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          if (field === 'canGenerateWorkoutPlans') {
            safeUpdates[field] = updates[field] === true || updates[field] === 'true';
          } else {
            safeUpdates[field] = updates[field];
          }
        }
      }

      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        transaction
      });

      if (!client) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Update client data (whitelisted fields only)
      await client.update(safeUpdates, { transaction });

      // Retired bridge decommissioned; profile is already saved via client.update() above.

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Client updated successfully',
        data: {
          client: await client.reload()
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating client:', error);
      return sendInternalError(res, 'Error updating client');
    }
  }

  /**
   * Restore a soft-deactivated client without mutating retained records.
   */
  async restoreClient(req, res) {
    const transaction = await sequelize.transaction();

    try {
      ensureModels();
      const { clientId } = req.params;

      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        transaction
      });

      if (!client) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      await client.update({
        isActive: true,
        accountDeactivatedAt: null,
        accountRetentionUntil: null
      }, { transaction });

      await transaction.commit();

      logger.info(`Reactivated client ${clientId} without mutating retained records`);

      return res.status(200).json({
        success: true,
        message: 'Client reactivated successfully. Login access is restored and retained records remain connected.',
        data: {
          clientId,
          isActive: true
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error restoring client:', error);
      return sendInternalError(res, 'Error restoring client');
    }
  }

  /**
   * Delete (deactivate) a client
   */
  async deleteClient(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      ensureModels();
      const { clientId } = req.params;
      const { softDelete = true } = req.body || {};

      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        transaction
      });

      if (!client) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const accountDeactivatedAt = new Date();
      const retainedUntil = new Date(accountDeactivatedAt);
      retainedUntil.setMonth(retainedUntil.getMonth() + 6);
      const preservedAvailableSessions = normalizePaidSessionCount(client.availableSessions);
      let cancelledCount = [0];

      if (softDelete) {

        // Cancel any future scheduled sessions for this client
        cancelledCount = await Session.update(
          {
            status: 'cancelled',
            notes: 'Auto-cancelled: client account deactivated; retained for 6 months'
          },
          {
            where: {
              userId: clientId,
              status: { [Op.in]: ['available', 'scheduled', 'confirmed'] },
              sessionDate: { [Op.gt]: new Date() }
            },
            transaction
          }
        );

        // Soft delete disables login, while retaining history and paid credits for the 6-month retention window.
        await client.update({
          isActive: false,
          accountDeactivatedAt,
          accountRetentionUntil: retainedUntil
        }, { transaction });

        logger.info(
          `Deactivated client ${clientId}, cancelled ${cancelledCount[0]} future sessions, preserved ${preservedAvailableSessions} available sessions until ${retainedUntil.toISOString()}`
        );
      } else {
        // Hard delete removed for compliance (financial & liability retention)
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'Hard deletion is disabled for compliance. Use soft delete (isActive=false) instead.'
        });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Client deactivated successfully. Profile, workout history, payments, and remaining credits are retained for 6 months.',
        data: {
          clientId,
          accountDeactivatedAt: accountDeactivatedAt.toISOString(),
          accountRetentionUntil: retainedUntil.toISOString(),
          retainedUntil: retainedUntil.toISOString(),
          cancelledFutureSessions: cancelledCount?.[0] || 0,
          preservedAvailableSessions,
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting client:', error);
      return sendInternalError(res, 'Error deleting client');
    }
  }

  /**
   * Send a client password reset email.
   */
  async resetClientPassword(req, res) {
    try {
      ensureModels();
      const { clientId } = req.params;

      const client = await User.findOne({
        where: { id: clientId, role: 'client' }
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      const reset = await sendPasswordResetEmailForUser(client);

      return res.status(200).json({
        success: true,
        message: 'Password reset email sent.',
        data: {
          credentialAction: 'reset_email_sent',
          clientId,
          resetEmailSent: reset.emailSent === true,
          expiresInMinutes: reset.expiresInMinutes,
        }
      });
    } catch (error) {
      logger.error('Error resetting password:', error);
      return sendInternalError(res, 'Error resetting password');
    }
  }

  /**
   * Assign trainer to client
   */
  async assignTrainer(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      ensureModels();
      const { clientId } = req.params;
      const { trainerId, sessionCount = 1 } = req.body;

      // Verify client exists
      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        transaction
      });

      if (!client) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      if (NON_DEDUCTING_CLIENT_SOURCES.has(client.clientSource)) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Trainer session assignment is disabled for free-tracking clients'
        });
      }

      // Verify trainer exists
      const trainer = await User.findOne({
        where: { id: trainerId, role: ['trainer', 'admin'] },
        transaction
      });

      if (!trainer) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Trainer not found'
        });
      }

      // Create sessions for client with trainer
      const sessions = [];
      for (let i = 0; i < sessionCount; i++) {
        const placeholderDate = new Date();
        placeholderDate.setDate(placeholderDate.getDate() + i + 1);
        sessions.push({
          trainerId,
          userId: clientId,
          sessionDate: placeholderDate,
          status: 'available',
          sessionType: 'personal_training'
        });
      }
      
      await Session.bulkCreate(sessions, { transaction });

      // Update client's available sessions count
      await client.increment('availableSessions', { 
        by: sessionCount,
        transaction 
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: `Assigned ${sessionCount} sessions with trainer successfully`,
        data: {
          client: {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`
          },
          trainer: {
            id: trainer.id,
            name: `${trainer.firstName} ${trainer.lastName}`
          },
          sessionsCreated: sessionCount
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error assigning trainer:', error);
      return sendInternalError(res, 'Error assigning trainer');
    }
  }

  /**
   * Get client workout statistics (local DB; retired bridge decommissioned)
   */
  async getClientWorkoutStats(req, res) {
    try {
      ensureModels();
      const { clientId } = req.params;
      const { startDate, endDate } = req.query;

      // Validate and sanitize date inputs (prevent object injection + invalid date crashes)
      const isValidDate = (d) => d && !isNaN(Date.parse(String(d)));
      const safeStartDate = isValidDate(startDate) ? new Date(String(startDate)).toISOString() : null;
      const safeEndDate = isValidDate(endDate) ? new Date(String(endDate)).toISOString() : null;

      const dateFilter = {};
      if (safeStartDate && safeEndDate) {
        dateFilter.date = { [Op.between]: [safeStartDate, safeEndDate] };
      } else if (safeStartDate) {
        dateFilter.date = { [Op.gte]: safeStartDate };
      } else if (safeEndDate) {
        dateFilter.date = { [Op.lte]: safeEndDate };
      }

      const [totalWorkouts, recentWorkouts] = await Promise.all([
        WorkoutSession.count({ where: { userId: clientId, status: 'completed', ...dateFilter } }),
        WorkoutSession.findAll({
          where: { userId: clientId, status: 'completed', ...dateFilter },
          order: [['date', 'DESC']],
          limit: 20,
          attributes: ['id', 'title', 'date', 'duration', 'intensity', 'totalSets', 'totalReps', 'notes'],
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          totalWorkouts,
          totalForms: totalWorkouts,
          recentWorkouts: recentWorkouts.map(w => ({
            id: w.id,
            title: w.title || 'Workout',
            date: w.date,
            duration: w.duration || 0,
            exercises: w.totalSets || 0,
            intensity: w.intensity || 0,
            notes: w.notes || null,
          })),
          dateRange: { startDate: safeStartDate, endDate: safeEndDate }
        }
      });
    } catch (error) {
      logger.error('Error fetching workout stats:', error);
      return sendInternalError(res, 'Error fetching workout statistics');
    }
  }

  /**
   * Generate workout plan for client using NASM workout builder service.
   * Supports single workout or multi-week periodized plan.
   */
  async generateWorkoutPlan(req, res) {
    try {
      ensureModels();
      const { clientId } = req.params;
      const trainerId = req.user?.id;
      const {
        durationWeeks,
        sessionsPerWeek = 3,
        primaryGoal = 'general_fitness',
        category = 'full_body',
        exerciseCount = 6,
        equipmentProfileId = null,
      } = req.body;

      // Validate client exists
      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        attributes: ['id', 'firstName', 'lastName'],
      });

      if (!client) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      // Lazy-import to avoid circular deps
      const { generateWorkout, generatePlan } = await import('../services/workoutBuilderService.mjs');

      if (durationWeeks && durationWeeks > 1) {
        // Multi-week periodized plan
        const plan = await generatePlan({
          clientId: Number(clientId),
          trainerId: Number(trainerId),
          durationWeeks,
          sessionsPerWeek,
          primaryGoal,
          equipmentProfileId,
        });

        return res.status(200).json({
          success: true,
          message: `Generated ${durationWeeks}-week periodized plan`,
          plan,
        });
      } else {
        // Single workout session
        const workout = await generateWorkout({
          clientId: Number(clientId),
          trainerId: Number(trainerId),
          category,
          exerciseCount,
          equipmentProfileId,
        });

        return res.status(200).json({
          success: true,
          message: 'Workout generated successfully',
          workout,
        });
      }
    } catch (error) {
      console.error('Error generating workout plan:', error);
      return sendInternalError(res, 'Error generating workout plan');
    }
  }

  /**
   * P0: Get client billing overview for admin dashboard
   * Returns session credits, pending orders, and upcoming sessions
   */
  async getBillingOverview(req, res) {
    try {
      ensureModels();
      const { clientId } = req.params;

      // Get client with session credits
      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions', 'clientSource']
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }
      const isNonDeductingClient = NON_DEDUCTING_CLIENT_SOURCES.has(client.clientSource);
      const sessionsRemaining = normalizePaidSessionCount(client.availableSessions);

      // Get last completed order (most recent purchase)
      // Use completedAt for ordering since it exists on base orders table
      const lastPurchase = await Order.findOne({
        where: {
          userId: clientId,
          status: 'completed'
        },
        order: [['completedAt', 'DESC']],
        attributes: ['id', 'orderNumber', 'totalAmount', 'completedAt', 'paymentAppliedAt', 'paymentReference', 'notes']
      });

      // Get pending orders (awaiting payment)
      const pendingOrders = await Order.findAll({
        where: {
          userId: clientId,
          status: { [Op.in]: ['pending_payment', 'pending'] }
        },
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'orderNumber', 'totalAmount', 'status', 'createdAt', 'notes']
      });

      // Get next upcoming scheduled session (sessions table uses userId, not clientId)
      const nextSession = await Session.findOne({
        where: {
          userId: clientId,
          status: { [Op.in]: ['scheduled', 'confirmed'] },
          sessionDate: { [Op.gte]: new Date() }
        },
        order: [['sessionDate', 'ASC']],
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        attributes: ['id', 'sessionDate', 'duration', 'status', 'notes']
      });

      // Get recent session history (last 5 completed)
      const recentSessions = await Session.findAll({
        where: {
          userId: clientId,
          status: 'completed'
        },
        order: [['sessionDate', 'DESC']],
        limit: 5,
        include: [
          {
            model: User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName']
          }
        ],
        // Don't select completedAt if it doesn't exist - use sessionDate instead
        attributes: ['id', 'sessionDate', 'duration', 'status']
      });

      return res.status(200).json({
        success: true,
        data: {
          client: {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
            clientSource: client.clientSource
          },
          sessionsRemaining: isNonDeductingClient ? 0 : sessionsRemaining,
          lastPurchase: lastPurchase ? {
            id: lastPurchase.id,
            packageName: lastPurchase.orderNumber || 'Session Package',  // Use orderNumber as fallback
            sessions: null,  // Would need order items lookup
            amount: lastPurchase.totalAmount,
            grantedAt: lastPurchase.completedAt,  // Use completedAt as grantedAt
            paymentAppliedAt: lastPurchase.paymentAppliedAt,
            paymentReference: lastPurchase.paymentReference
          } : null,
          pendingOrders: pendingOrders.map(order => ({
            id: order.id,
            packageName: order.orderNumber || 'Pending Order',  // Use orderNumber as fallback
            sessions: null,  // Would need order items lookup
            amount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt
          })),
          nextSession: nextSession ? {
            id: nextSession.id,
            date: nextSession.sessionDate,
            duration: nextSession.duration,
            status: nextSession.status,
            notes: nextSession.notes,
            trainer: nextSession.trainer ? {
              id: nextSession.trainer.id,
              name: `${nextSession.trainer.firstName} ${nextSession.trainer.lastName}`
            } : null
          } : null,
          recentSessions: recentSessions.map(session => ({
            id: session.id,
            date: session.sessionDate,
            duration: session.duration,
            completedAt: session.sessionDate, // Use sessionDate as completedAt fallback
            trainer: session.trainer ? {
              id: session.trainer.id,
              name: `${session.trainer.firstName} ${session.trainer.lastName}`
            } : null
          }))
        }
      });
    } catch (error) {
      logger.error('Error fetching billing overview:', error);
      return sendInternalError(res, 'Error fetching billing overview');
    }
  }

  /**
   * Get retired bridge health status
   */
  async getMCPStatus(req, res) {
    const mcpServers = [
      { name: 'Workout API', replacement: '/api/workout' },
      { name: 'Gamification API', replacement: '/api/v1/gamification' },
      { name: 'Form Analysis API', replacement: '/api/form-analysis' },
      { name: 'Social API', replacement: '/api/social' },
      { name: 'Food Scanner API', replacement: '/api/food-scanner' },
      { name: 'Video Processing API', replacement: '/api/v2/videos' }
    ];

    const statuses = mcpServers.map(server => ({
      ...server,
      status: 'decommissioned',
      lastChecked: new Date()
    }));

    return res.status(200).json({
      success: true,
      data: {
        servers: statuses,
        summary: {
          online: 0,
          offline: 0,
          error: 0,
          decommissioned: statuses.length
        }
      }
    });
  }

  /**
   * Create an external client (Move Fitness, etc.)
   * These clients get 0 sessions, no SwanStudios scheduling, but full tool access
   */
  async createExternalClient(req, res) {
    const transaction = await sequelize.transaction();

    try {
      ensureModels();
      const {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth,
        gender,
        weight,
        height,
        fitnessGoal,
        trainingExperience,
        healthConcerns,
        emergencyContact,
        clientSource = 'move_fitness',
        password,
      } = req.body;

      // Validate clientSource against allowed values
      const validSources = ['swanstudios', 'move_fitness', 'external'];
      if (clientSource && !validSources.includes(clientSource)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid clientSource. Must be one of: ${validSources.join(', ')}`
        });
      }

      // Validate password if admin-supplied
      if (password && password.length < 8) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      const normalizedEmail = normalizeAdminClientEmailInput(email);
      if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Generate username from email prefix with high-entropy suffix to prevent collisions
      const baseUsername = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
      const username = `${baseUsername}_${crypto.randomBytes(4).toString('hex')}`;
      const effectivePassword = password || (crypto.randomBytes(12).toString('base64url') + '!A1');
      const passwordSource = password ? 'admin-supplied' : 'generated';

      // Check if email already exists
      const existingUser = await User.findOne({ where: { email: { [Op.iLike]: normalizedEmail } } });
      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'A client with this email already exists'
        });
      }

      // Generate SWAN-XXXXXXXX claim token for account claiming (Crystalline Link Protocol)
      const { plainToken, hash: claimTokenHash, expires: claimTokenExpires } = generateClaimToken();

      const newClient = await User.create({
        firstName,
        lastName,
        email: normalizedEmail,
        username,
        password: effectivePassword,
        phone,
        dateOfBirth,
        gender,
        weight,
        height,
        fitnessGoal,
        trainingExperience,
        healthConcerns,
        emergencyContact,
        clientSource,
        availableSessions: 0, // External clients get 0 sessions
        accountStatus: 'stub', // External clients start as STUB until they claim their account
        forcePasswordChange: true,
        claimTokenHash,
        claimTokenExpires,
        role: 'client',
        isActive: true
      }, { transaction });

      // Create client progress record (skip if table doesn't exist)
      try {
        const [tableCheck] = await sequelize.query(
          `SELECT to_regclass('client_progress') AS exists`,
          { transaction }
        );
        if (tableCheck?.[0]?.exists) {
          await ClientProgress.create({ userId: newClient.id }, { transaction });
        }
      } catch (progressError) {
        logger.warn(`ClientProgress record skipped for external client ${newClient.id}: ${progressError.message}`);
      }

      await transaction.commit();

      // Send welcome email (non-blocking)
      if (passwordSource === 'generated') {
        try {
          const sourceLabel = clientSource === 'move_fitness' ? 'Move Fitness' : 'External';
          await sendGridEmail({
            to: normalizedEmail,
            subject: `Welcome to SwanStudios Tools — ${sourceLabel} Client`,
            text: `Hi ${firstName},\n\nYour SwanStudios account has been created as a ${sourceLabel} client.\nEmail: ${normalizedEmail}\nTemporary Password: ${effectivePassword}\n\nYou have access to: Workout Log, Food Logger, Body Map, and Social features.\n\nPlease log in and change your password.\n\n— SwanStudios Team`,
            html: `<p>Hi ${firstName},</p><p>Your SwanStudios account has been created as a <strong>${sourceLabel}</strong> client.</p><p><strong>Email:</strong> ${normalizedEmail}<br/><strong>Temporary Password:</strong> ${effectivePassword}</p><p>You have access to: Workout Log, Food Logger, Body Map, and Social features.</p><p>Please log in and change your password.</p><p>&mdash; SwanStudios Team</p>`,
          });
        } catch (emailError) {
          logger.warn(`Welcome email failed for external client ${normalizedEmail}: ${emailError.message}`);
        }
      }

      const { password: _, refreshTokenHash: __, ...clientData } = newClient.toJSON();

      logger.info(`External client created: ${normalizedEmail} (source: ${clientSource}) by admin ${req.user?.id}`);

      const claimUrl = `${process.env.FRONTEND_URL || 'https://sswanstudios.com'}/claim/${plainToken}`;

      return res.status(201).json({
        success: true,
        message: `External client created (${clientSource})`,
        data: {
          client: clientData,
          temporaryPassword: passwordSource === 'generated' ? effectivePassword : undefined,
          claimToken: plainToken,
          claimUrl,
          claimExpiresAt: claimTokenExpires.toISOString(),
        }
      });

    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating external client:', error.message);
      return sendInternalError(res, 'Error creating external client');
    }
  }
}

export default new AdminClientController();
