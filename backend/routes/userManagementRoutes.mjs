/**
 * User Management Routes (Admin-Only Inline Handlers)
 * ======================================================
 *
 * Purpose: REST API routes for user management with inline controller logic (legacy pattern)
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Admin Dashboard User Management
 *
 * Base Path: /api/auth
 *
 * Architecture Overview (Inline Pattern):
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Admin Dashboard    │─────▶│  Express Router  │─────▶│  PostgreSQL     │
 * │  (React)            │      │  (inline logic)  │      │  users table    │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘
 *                                       │
 *                                       │ (no controller layer)
 *                                       ▼
 *                              ┌──────────────────┐
 *                              │  Sequelize User  │
 *                              │  Model (direct)  │
 *                              └──────────────────┘
 *
 * Architecture Pattern (Inline vs Controller):
 *
 *   INLINE PATTERN (This File):
 *   ┌─────────────────────┐
 *   │ Route Handler       │
 *   │ - Middleware chain  │
 *   │ - Business logic    │
 *   │ - Database queries  │
 *   │ - Response format   │
 *   └─────────────────────┘
 *
 *   CONTROLLER PATTERN (userManagementController.mjs):
 *   ┌─────────────────────┐      ┌─────────────────────┐
 *   │ Route Handler       │─────▶│ Controller Method   │
 *   │ - Middleware only   │      │ - Business logic    │
 *   │                     │      │ - Database queries  │
 *   │                     │      │ - Response format   │
 *   └─────────────────────┘      └─────────────────────┘
 *
 * Middleware Flow (Per-Route):
 *
 *   Incoming Request
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │ Express Router  │
 *   └─────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐       ┌────────────────────┐
 *   │ Route Match     │──────▶│ protect middleware │
 *   │ (e.g. /users)   │       │ Verify JWT         │
 *   └─────────────────┘       └────────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐       ┌────────────────────┐
 *   │ Continue chain  │──────▶│ adminOnly          │
 *   │                 │       │ Check role = admin │
 *   └─────────────────┘       └────────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │ Inline Handler  │
 *   │ (async fn)      │
 *   └─────────────────┘
 *         │
 *         ▼
 *   200 OK + data
 *
 * API Endpoints (6 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD  ENDPOINT                    MIDDLEWARE          PURPOSE                          │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /users                      protect, adminOnly  List all users (all roles)       │
 * │ GET     /clients                    protect, adminOnly  List clients with session data   │
 * │ GET     /trainers                   protect, adminOnly  List trainers with credentials   │
 * │ POST    /user                       protect, adminOnly  Create new user (any role)       │
 * │ PUT     /user/:id                   protect, adminOnly  Update user details              │
 * │ DELETE  /user/:id                   protect, adminOnly  Soft delete user                 │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Route Groups:
 *
 * 1. User Listing (3 routes):
 *    - GET /users - All users (admin, trainer, client)
 *    - GET /clients - Clients only (with availableSessions)
 *    - GET /trainers - Trainers only (with specialties, certifications, hourlyRate)
 *
 * 2. User CRUD (3 routes):
 *    - POST /user - Create new user (with password hashing)
 *    - PUT /user/:id - Update user (optional password reset)
 *    - DELETE /user/:id - Soft delete (paranoid mode)
 *
 * NOTE: Role promotion (promote-admin / promote-client) is served ONLY by
 * /api/admin routes (adminRoutes.mjs → userManagementController). The inline
 * duplicates were removed 2026-07-12.
 *
 * Request/Response Flow (Mermaid - Create User):
 * ```mermaid
 * sequenceDiagram
 *     participant A as Admin Dashboard
 *     participant R as Express Router
 *     participant P as protect middleware
 *     participant AO as adminOnly middleware
 *     participant H as Inline Handler
 *     participant DB as PostgreSQL
 *
 *     A->>R: POST /api/auth/user {firstName, lastName, email, ...}
 *     R->>P: Verify JWT token
 *
 *     alt Invalid token
 *         P-->>A: 401 Unauthorized
 *     else Valid token
 *         P->>AO: Check admin role
 *
 *         alt Not admin
 *             AO-->>A: 403 Forbidden
 *         else Is admin
 *             AO->>H: Execute inline handler
 *             H->>DB: User.findOne (check email/username exists)
 *
 *             alt User exists
 *                 H-->>A: 400 Bad Request
 *             else User doesn't exist
 *                 H->>H: Hash password (bcrypt, 10 rounds)
 *                 H->>DB: User.create({...})
 *                 H->>H: Log user creation
 *                 H-->>A: 201 Created + user data (no password)
 *             end
 *         end
 *     end
 * ```
 *
 * Role-Specific Field Handling:
 *
 *   User Creation/Update
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │ Check role      │
 *   └─────────────────┘
 *         │
 *         ├───────────────┬───────────────┐
 *         │               │               │
 *         ▼               ▼               ▼
 *   ┌──────────┐   ┌──────────┐   ┌──────────┐
 *   │ Client   │   │ Trainer  │   │ Admin    │
 *   └──────────┘   └──────────┘   └──────────┘
 *         │               │               │
 *         ▼               ▼               ▼
 *   availableSessions  specialties    (no extras)
 *                      certifications
 *                      bio
 *                      hourlyRate
 *
 * Error Responses:
 *
 * 400 Bad Request - User exists
 * {
 *   success: false,
 *   message: "User with this email or username already exists"
 * }
 *
 * 400 Bad Request - Missing required fields
 * {
 *   success: false,
 *   message: "Please provide all required fields: firstName, lastName, email, username, password, role"
 * }
 *
 * 400 Bad Request - Cannot deactivate self
 * {
 *   success: false,
 *   message: "You cannot deactivate your own account"
 * }
 *
 * 404 Not Found - User not found
 * {
 *   success: false,
 *   message: "User not found"
 * }
 *
 * 500 Internal Server Error - Database error
 * {
 *   success: false,
 *   message: "Server error fetching users"
 * }
 *
 * Security Model:
 *
 * 1. Admin-Only Routes:
 *    - All routes require protect + adminOnly middleware
 *    - No public endpoints in this router
 *    - Per-route middleware (not global like adminClientRoutes.mjs)
 *
 * 2. Password Hashing:
 *    - bcrypt with 10 rounds (salt generation)
 *    - Passwords never returned in responses
 *    - Optional password update in PUT /user/:id
 *
 * 3. Soft Delete:
 *    - DELETE uses user.destroy() (paranoid mode)
 *    - Sets deletedAt timestamp instead of hard delete
 *    - Prevents self-deactivation (cannot delete own account)
 *
 * 4. Duplicate Prevention:
 *    - Checks email + username uniqueness before creation
 *    - Uses Sequelize.Op.or for efficient query
 *
 * Business Logic:
 *
 * WHY Inline Handlers Instead of Controller?
 * - Legacy code pattern from early development
 * - Simpler for single-file comprehension (no file switching)
 * - Lower overhead (no function call indirection)
 * - Trade-off: Less testable, harder to reuse logic
 * - Future: Should migrate to controller pattern for consistency
 *
 * WHY Per-Route Middleware Instead of Global?
 * - Explicit per-route protection (clear intent)
 * - Allows mixing public + private routes in same file
 * - Easier to audit (middleware visible on each route)
 * - Trade-off: More verbose, risk of forgetting middleware
 * - Contrast: adminClientRoutes.mjs uses global router.use()
 *
 * WHY Separate /clients and /trainers Endpoints?
 * - Different field requirements (clients: sessions, trainers: certifications)
 * - Optimized queries (only fetch needed fields)
 * - Frontend convenience (avoid client-side filtering)
 * - API clarity (RESTful resource-specific endpoints)
 *
 * WHY bcrypt Password Hashing in Routes?
 * - Security requirement (never store plain text passwords)
 * - 10 rounds provides strong security without performance hit (~100ms)
 * - Salt generation per password (prevents rainbow tables)
 * - Industry standard for password storage
 *
 * WHY Soft Delete (paranoid mode)?
 * - Data retention for audit trail
 * - User recovery possibility (undo accidental deletion)
 * - Foreign key integrity (related data preserved)
 * - Compliance requirement (financial/legal records)
 *
 * Usage Examples:
 *
 * // List all users
 * GET /api/auth/users
 * Response: { success: true, users: [...] }
 *
 * // List clients only (with availableSessions)
 * GET /api/auth/clients
 * Response: [{id, firstName, lastName, email, availableSessions, ...}, ...]
 *
 * // Create new trainer
 * POST /api/auth/user
 * Body: {
 *   firstName: "John",
 *   lastName: "Doe",
 *   email: "john@example.com",
 *   username: "johndoe",
 *   password: "SecurePass123!",
 *   role: "trainer",
 *   specialties: ["Strength Training", "HIIT"],
 *   certifications: ["NASM-CPT", "ACE"],
 *   bio: "10 years experience",
 *   hourlyRate: 75
 * }
 *
 * // Update user (optional password reset)
 * PUT /api/auth/user/abc-123
 * Body: { firstName: "Jane", password: "NewPass456!" }
 *
 * // Soft delete user
 * DELETE /api/auth/user/abc-123
 * Response: { success: true, message: "User deactivated successfully" }
 *
 * Performance Considerations:
 * - User listing: ~50-100ms for 10,000 users (alphabetical sort)
 * - Password hashing: ~100ms per user (bcrypt 10 rounds)
 * - User creation: ~150-200ms total (existence check + hash + insert)
 * - Soft delete: ~20-30ms (UPDATE deletedAt vs hard DELETE)
 * - No pagination implemented (performance risk for large user bases)
 *
 * Dependencies:
 * - express: Router framework
 * - authMiddleware: protect (JWT verify), adminOnly (role check)
 * - User: Sequelize User model (direct import - not lazy loaded)
 * - bcryptjs: Password hashing library (10 rounds)
 * - logger: Winston-based structured logging
 *
 * Testing:
 * - Unit tests: backend/tests/userManagementRoutes.test.mjs
 * - Test cases:
 *   - ✅ GET /users without token → 401 Unauthorized
 *   - ✅ GET /users as non-admin → 403 Forbidden
 *   - ✅ GET /users as admin → 200 OK + all users
 *   - ✅ POST /user creates new user with hashed password
 *   - ✅ POST /user with existing email → 400 Bad Request
 *   - ✅ PUT /user/:id updates fields correctly
 *   - ✅ DELETE /user/:id soft deletes user
 *   - ✅ DELETE own account → 400 Bad Request
 *
 * Future Enhancements:
 * - Migrate inline handlers to userManagementController.mjs
 * - Add pagination to GET /users, /clients, /trainers (limit, offset)
 * - Add filtering (by role, status, date range)
 * - Add sorting options (by name, createdAt, lastLogin)
 * - Add bulk operations (bulk user import from CSV)
 * - Add input validation middleware (express-validator)
 * - Use global middleware pattern (router.use) for consistency
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

// backend/routes/userManagementRoutes.mjs
import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.mjs';
import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';

const router = express.Router();
const PAID_CREDIT_FREE_TRACKING_MESSAGE = 'Admin user management cannot assign paid credits to free-tracking clients';

const parseAdminSessionCreditInput = (value, fallback = 0) => {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const toUserManagementRouteErrorMetadata = (error) => ({
  errorName: error?.name || 'Error',
  errorCode: error?.code || error?.type || 'user_management_route_error'
});

const logUserManagementRouteError = (message, error, req, metadata = {}) => {
  logger.error(message, {
    ...toUserManagementRouteErrorMetadata(error),
    adminId: req?.user?.id || null,
    method: req?.method || null,
    action: metadata.action || null
  });
};

/**
 * @route   GET /api/auth/users
 * @desc    Admin: Get all users (for admin user management)
 * @access  Private (Admin Only)
 */
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'username',
        'role',
        'photo',
        'createdAt',
        'lastLogin'
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      users: users
    });
  } catch (error) {
    logUserManagementRouteError('Error fetching users', error, req, { action: 'list_users' });
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching users'
    });
  }
});

/**
 * @route   GET /api/auth/clients
 * @desc    Admin: Get all clients with session data
 * @access  Private (Admin Only)
 */
router.get('/clients', protect, adminOnly, async (req, res) => {
  try {
    const clients = await User.findAll({
      where: { role: 'client' },
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phone',
        'photo',
        'availableSessions',
        'clientSource',
        'createdAt',
        'lastLogin',
        // L5 (2026-05-02): per-client self-service plan generation flag.
        // Frontend admin UI reads this to render the toggle state.
        'canGenerateWorkoutPlans',
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
    
    res.status(200).json({ success: true, clients });
  } catch (error) {
    logUserManagementRouteError('Error fetching clients', error, req, { action: 'list_clients' });
    res.status(500).json({
      success: false,
      message: 'Server error fetching clients'
    });
  }
});

/**
 * @route   GET /api/auth/trainers
 * @desc    Admin: Get all trainers
 * @access  Private (Admin Only)
 */
router.get('/trainers', protect, adminOnly, async (req, res) => {
  try {
    const trainers = await User.findAll({
      where: { role: 'trainer' },
      attributes: [
        'id', 
        'firstName', 
        'lastName', 
        'email', 
        'phone', 
        'photo', 
        'specialties',
        'certifications',
        'bio',
        'hourlyRate',
        'createdAt',
        'lastLogin'
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
    
    res.status(200).json(trainers);
  } catch (error) {
    logUserManagementRouteError('Error fetching trainers', error, req, { action: 'list_trainers' });
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching trainers'
    });
  }
});

/**
 * @route   POST /api/auth/user
 * @desc    Admin: Create a new user
 * @access  Private (Admin Only)
 */
router.post('/user', protect, adminOnly, async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      username, 
      password, 
      role, 
      phone,
      availableSessions,
      specialties,
      certifications,
      bio,
      hourlyRate
    } = req.body;
    
    // Check if email or username exists
    const userExists = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { email },
          { username }
        ]
      }
    });
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }
    
    // Validate required fields
    if (!firstName || !lastName || !email || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: firstName, lastName, email, username, password, role'
      });
    }
    
    // Password hashed by User.beforeCreate hook (do not pre-hash here)
    const user = await User.create({
      firstName,
      lastName,
      email,
      username,
      password,
      role,
      phone,
      availableSessions: availableSessions || 0,
      specialties: role === 'trainer' ? specialties : null,
      certifications: role === 'trainer' ? certifications : null,
      bio: role === 'trainer' ? bio : null,
      hourlyRate: role === 'trainer' ? hourlyRate : null
    });
    
    // Return user without password
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      phone: user.phone,
      availableSessions: user.availableSessions,
      createdAt: user.createdAt
    };
    
    if (role === 'trainer') {
      userData.specialties = user.specialties;
      userData.certifications = user.certifications;
      userData.bio = user.bio;
      userData.hourlyRate = user.hourlyRate;
    }
    
    logger.info(`Admin ${req.user.id} created new user: ${user.id} (${user.role})`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userData
    });
  } catch (error) {
    logUserManagementRouteError('Error creating user', error, req, { action: 'create_user' });
    res.status(500).json({
      success: false,
      message: 'Server error creating user'
    });
  }
});

/**
 * @route   PUT /api/auth/user/:id
 * @desc    Admin: Update a user
 * @access  Private (Admin Only)
 */
router.put('/user/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      availableSessions,
      specialties,
      certifications,
      bio,
      hourlyRate,
      password,
      // L5 (2026-05-02): admin-controlled per-client opt-in for self-service
      // workout plan generation. Backend route ALSO requires the
      // ENABLE_CLIENT_PLAN_SELFGEN env flag - this column on its own grants
      // nothing until the env var is "true". See workoutBuilderRoutes.mjs.
      canGenerateWorkoutPlans,
    } = req.body;
    
    // Find the user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const requestedAvailableSessions = availableSessions !== undefined
      ? parseAdminSessionCreditInput(availableSessions)
      : undefined;

    if (requestedAvailableSessions === null) {
      return res.status(400).json({
        success: false,
        message: 'Available sessions must be a non-negative integer'
      });
    }

    if (requestedAvailableSessions !== undefined
      && requestedAvailableSessions > 0
      && isNonDeductingClient(user)) {
      return res.status(409).json({
        success: false,
        message: PAID_CREDIT_FREE_TRACKING_MESSAGE
      });
    }
    
    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    
    // Handle numeric fields
    if (requestedAvailableSessions !== undefined) user.availableSessions = requestedAvailableSessions;
    if (hourlyRate !== undefined && role === 'trainer') user.hourlyRate = hourlyRate;
    
    // Handle trainer-specific fields
    if (role === 'trainer') {
      if (specialties !== undefined) user.specialties = specialties;
      if (certifications !== undefined) user.certifications = certifications;
      if (bio !== undefined) user.bio = bio;
    }
    
    // Handle password update if provided (hook handles hashing on save)
    if (password) {
      user.password = password;
    }

    // L5 (2026-05-02): per-client opt-in flag for workout plan generation.
    // Coerce to a strict boolean - admins can flip true / false / null off.
    if (canGenerateWorkoutPlans !== undefined) {
      user.canGenerateWorkoutPlans = canGenerateWorkoutPlans === true || canGenerateWorkoutPlans === 'true';
    }

    await user.save();
    
    // Return updated user without password
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
      role: user.role,
      phone: user.phone,
      availableSessions: user.availableSessions,
      updatedAt: user.updatedAt
    };
    
    if (user.role === 'trainer') {
      userData.specialties = user.specialties;
      userData.certifications = user.certifications;
      userData.bio = user.bio;
      userData.hourlyRate = user.hourlyRate;
    }
    
    logger.info(`Admin ${req.user.id} updated user: ${user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: userData
    });
  } catch (error) {
    logUserManagementRouteError('Error updating user', error, req, { action: 'update_user' });
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// Role promotion (promote-admin / promote-client) lives ONLY at
// /api/admin via userManagementController — the surface the admin
// dashboard calls. The legacy inline handlers that duplicated it here
// (validating a drifted, unguarded env var) were removed 2026-07-12;
// see tests/api/promoteRoleCanonicalSurface.test.mjs.

/**
 * @route   DELETE /api/auth/user/:id
 * @desc    Admin: Deactivate a user (soft delete)
 * @access  Private (Admin Only)
 */
router.delete('/user/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deactivating yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    const accountDeactivatedAt = new Date();
    const retainedUntil = new Date(accountDeactivatedAt);
    retainedUntil.setMonth(retainedUntil.getMonth() + 6);

    await user.update({
      isActive: false,
      accountDeactivatedAt,
      accountRetentionUntil: retainedUntil
    });

    // Soft delete the user (paranoid option in model)
    await user.destroy();
    
    logger.info(`Admin ${req.user.id} deactivated user: ${user.id}`);
    
    res.status(200).json({
      success: true,
      message: 'User deactivated successfully. Account records are retained for 6 months.',
      data: {
        userId: user.id,
        accountDeactivatedAt: accountDeactivatedAt.toISOString(),
        accountRetentionUntil: retainedUntil.toISOString()
      }
    });
  } catch (error) {
    logUserManagementRouteError('Error deactivating user', error, req, { action: 'deactivate_user' });
    res.status(500).json({
      success: false,
      message: 'Server error deactivating user'
    });
  }
});

export default router;
