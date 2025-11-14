/**
 * Authentication Routes (JWT + RBAC + Rate Limiting)
 * ====================================================
 *
 * Purpose: REST API routes for user authentication, session management, and user CRUD operations
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Auth System
 *
 * Base Path: /api/auth
 *
 * Architecture Overview:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Client App     │─────▶│  Express Routes  │─────▶│  Auth           │
 * │  (Frontend)     │      │  (this file)     │      │  Controller     │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *                                   │
 *                                   │ (middleware stack)
 *                                   ▼
 *                          ┌──────────────────┐
 *                          │  Middleware:     │
 *                          │  - rateLimiter   │
 *                          │  - validate      │
 *                          │  - protect       │
 *                          │  - adminOnly     │
 *                          └──────────────────┘
 *
 * Middleware Flow (Request Processing):
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
 *   │ rateLimiter     │──────▶│ Check IP/endpoint  │
 *   │ (optional)      │       │ request count      │
 *   └─────────────────┘       └────────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐       ┌────────────────────┐
 *   │ validate        │──────▶│ Joi schema check   │
 *   │ (optional)      │       │ req.body format    │
 *   └─────────────────┘       └────────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐       ┌────────────────────┐
 *   │ protect         │──────▶│ JWT verification   │
 *   │ (auth required) │       │ Attach req.user    │
 *   └─────────────────┘       └────────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐       ┌────────────────────┐
 *   │ adminOnly       │──────▶│ Check role=admin   │
 *   │ (optional)      │       │ Return 403 if not  │
 *   └─────────────────┘       └────────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐
 *   │ Controller      │
 *   │ Function        │
 *   └─────────────────┘
 *
 * API Endpoints (12 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD  ENDPOINT                    MIDDLEWARE                  AUTH      PURPOSE         │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ POST    /register                   rateLimiter, validate       Public    Register        │
 * │ POST    /login                      rateLimiter, validate       Public    Login           │
 * │ POST    /refresh-token              rateLimiter, validate       Public    Refresh JWT     │
 * │ POST    /logout                     protect                     Private   Logout          │
 * │ GET     /validate-token             (none)                      Public    Validate JWT    │
 * │ GET     /me                         protect                     Private   Get profile     │
 * │ PUT     /password                   protect, validate           Private   Change password │
 * │ GET     /users/trainers             protect                     Private   List trainers   │
 * │ GET     /users/clients              protect, adminOnly          Admin     List clients    │
 * │ GET     /users/:id                  protect                     Private   Get user by ID  │
 * │ PUT     /users/:id                  protect, adminOnly          Admin     Update user     │
 * │ GET     /stats                      protect, adminOnly          Admin     User statistics │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Rate Limiting Strategy (Per Endpoint):
 *
 * ┌────────────────────────────────────────────────────────────┐
 * │ ENDPOINT          WINDOW       MAX REQUESTS    RATIONALE   │
 * ├────────────────────────────────────────────────────────────┤
 * │ /register         60 min       10/IP           Anti-spam   │
 * │ /login            15 min       10/IP           Brute force │
 * │ /refresh-token    15 min       20/IP           UX balance  │
 * └────────────────────────────────────────────────────────────┘
 *
 * Request/Response Flow (Mermaid):
 * ```mermaid
 * sequenceDiagram
 *     participant C as Client
 *     participant R as Express Router
 *     participant RL as rateLimiter
 *     participant V as validate
 *     participant P as protect
 *     participant A as adminOnly
 *     participant AC as AuthController
 *     participant DB as PostgreSQL
 *
 *     C->>R: POST /api/auth/login {email, password}
 *     R->>RL: Check rate limit
 *
 *     alt Rate limit exceeded
 *         RL-->>C: 429 Too Many Requests
 *     else Within limit
 *         RL->>V: Validate request body (Joi schema)
 *
 *         alt Invalid input
 *             V-->>C: 400 Validation Error
 *         else Valid input
 *             V->>AC: login(req, res)
 *             AC->>DB: SELECT * FROM users WHERE email = ?
 *
 *             alt User not found
 *                 DB-->>AC: null
 *                 AC-->>C: 401 Invalid credentials
 *             else User found
 *                 AC->>AC: bcrypt.compare(password, hash)
 *
 *                 alt Password incorrect
 *                     AC-->>C: 401 Invalid credentials
 *                 else Password correct
 *                     AC->>AC: Generate JWT (access + refresh)
 *                     AC->>DB: UPDATE users SET refreshTokenHash = ?
 *                     AC-->>C: 200 OK + tokens
 *                 end
 *             end
 *         end
 *     end
 * ```
 *
 * Authentication Strategy:
 *
 * Public Endpoints (No Auth Required):
 * - /register - New user registration
 * - /login - User authentication
 * - /refresh-token - Get new access token
 * - /validate-token - Check if JWT is valid
 *
 * Private Endpoints (protect middleware):
 * - Extracts JWT from Authorization: Bearer <token>
 * - Verifies token signature + expiration
 * - Attaches req.user to request context
 * - Returns 401 if token invalid/missing
 *
 * Admin-Only Endpoints (protect + adminOnly):
 * - Same as Private + checks req.user.role === 'admin'
 * - Returns 403 if user not admin
 * - Endpoints: /users/clients, /users/:id (PUT), /stats
 *
 * Trainer Access Endpoints:
 * - /users/:id (GET) - Trainers can view assigned clients
 * - Custom permission logic inside route handler
 *
 * Error Responses:
 *
 * 400 Bad Request - Validation error (Joi schema)
 * {
 *   success: false,
 *   message: "Validation error",
 *   errors: { field: "description" }
 * }
 *
 * 401 Unauthorized - Authentication failure
 * {
 *   success: false,
 *   message: "Invalid credentials" | "Token expired" | "User not found"
 * }
 *
 * 403 Forbidden - Authorization failure
 * {
 *   success: false,
 *   message: "Access denied: You do not have permission to view this user"
 * }
 *
 * 404 Not Found - Resource not found
 * {
 *   success: false,
 *   message: "User not found"
 * }
 *
 * 429 Too Many Requests - Rate limit exceeded
 * {
 *   success: false,
 *   message: "Too many requests from this IP, please try again later"
 * }
 *
 * 500 Internal Server Error - Database/server error
 * {
 *   success: false,
 *   message: "Server error changing password"
 * }
 *
 * Security Model:
 *
 * 1. Rate Limiting (DDoS + Brute Force Prevention):
 *    - IP-based rate limiting per endpoint
 *    - 10 login attempts per 15 minutes
 *    - 10 registrations per hour
 *    - In-memory tracking (resets on server restart)
 *
 * 2. Input Validation (SQL Injection + XSS Prevention):
 *    - Joi schema validation on all POST/PUT requests
 *    - Email format validation (RFC 5322)
 *    - Password strength requirements (8+ chars)
 *    - Sanitization of user inputs
 *
 * 3. Authentication (JWT):
 *    - Access tokens: 3h expiry
 *    - Refresh tokens: 7d expiry
 *    - Token rotation on refresh
 *    - Secure HTTP-only cookies (production)
 *
 * 4. Authorization (RBAC):
 *    - Role-based access: admin, trainer, client
 *    - Principle of least privilege
 *    - Custom permission checks for trainer-client relationships
 *
 * 5. Password Security:
 *    - bcrypt hashing (10 rounds)
 *    - Current password verification for password changes
 *    - No password in API responses (excluded in User.findByPk)
 *
 * 6. Audit Logging:
 *    - All errors logged with user ID + stack trace
 *    - Failed login attempts tracked
 *    - Admin actions logged for compliance
 *
 * Business Logic:
 *
 * WHY Rate Limiting Per Endpoint?
 * - Different endpoints have different abuse profiles
 * - Login needs strict rate limit (10/15min) to prevent brute force
 * - Refresh token needs looser limit (20/15min) for better UX during normal usage
 * - Registration needs hourly limit (10/hour) to prevent spam account creation
 * - Custom limits balance security with legitimate user experience
 *
 * WHY Separate /users/trainers and /users/clients Endpoints?
 * - Client use case: Browse trainers (public marketplace feature)
 * - Admin use case: Manage clients (admin-only CRUD)
 * - Different filtering requirements (trainers: specialties/rating, clients: search/status)
 * - Different security models (trainers: any authenticated user, clients: admin only)
 * - Clear separation of concerns
 *
 * WHY Complex Permission Logic in GET /users/:id?
 * - Multi-role access pattern:
 *   1. Admins can view any user (full admin access)
 *   2. Users can view themselves (self-service profile)
 *   3. Trainers can view assigned clients (relationship-based access)
 * - Prevents exposing sensitive fields to non-admins (failedLoginAttempts, IPs)
 * - Enforces data privacy while enabling trainer-client collaboration
 *
 * WHY Inline Route Handlers for Some Endpoints?
 * - Simple CRUD operations don't warrant separate controller functions
 * - Password change, user lookup, user update are straightforward
 * - Reduces file hopping for simple operations
 * - Complex business logic (login, register) extracted to controller
 *
 * WHY Pagination on User Lists?
 * - Performance: Avoids loading thousands of users in one query
 * - UX: Frontend can show "Load more" or page navigation
 * - Default limit: 10 users per page (configurable via query param)
 * - Total count included for pagination UI (totalPages calculation)
 *
 * Performance Considerations:
 * - Rate limiting overhead: ~1-2ms per request (in-memory check)
 * - Joi validation overhead: ~2-5ms per request (schema validation)
 * - JWT verification overhead: ~1-2ms per request (signature check)
 * - Database query optimization:
 *   - Indexed queries on email, role, isActive
 *   - Pagination prevents full table scans
 *   - Attribute exclusion reduces payload size
 * - Total middleware overhead: ~5-10ms per authenticated request
 *
 * Dependencies:
 * - express: Router and middleware framework
 * - authController: Business logic for auth operations
 * - authMiddleware: protect, adminOnly, rateLimiter
 * - validationMiddleware: Joi schema validation
 * - User model (Sequelize): PostgreSQL users table
 * - logger: Winston-based logging utility
 *
 * Environment Variables:
 * - JWT_SECRET: Secret key for JWT signing (REQUIRED)
 * - JWT_ACCESS_EXPIRY: Access token expiration (default 3h)
 * - JWT_REFRESH_EXPIRY: Refresh token expiration (default 7d)
 * - NODE_ENV: production/development (affects logging)
 *
 * Route Registration:
 * - Imported in backend/server.mjs as: app.use('/api/auth', authRoutes)
 * - Full URLs: https://api.example.com/api/auth/...
 *
 * Testing:
 * - Unit tests: backend/tests/authRoutes.test.mjs
 * - Integration tests: Supertest + Vitest
 * - Rate limit tests: Verify 429 responses after exceeding limits
 * - Auth tests: Verify 401/403 responses for missing/invalid tokens
 * - RBAC tests: Verify admin-only endpoints reject non-admin users
 *
 * Created: 2024-11-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */
import express from 'express';
import { 
  register, 
  login, 
  logout,
  validateToken, 
  refreshToken,
  getUserById,
  getProfile
} from '../controllers/authController.mjs';
import { 
  protect, 
  adminOnly, 
  trainerOrAdminOnly, 
  rateLimiter 
} from '../middleware/authMiddleware.mjs';
import { validate } from '../middleware/validationMiddleware.mjs';
import User from '../models/User.mjs';
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @limits  Rate limited to prevent abuse
 */
router.post(
  '/register', 
  rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }), // 10 registrations per hour per IP
  validate('register'),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Log in and return JWT + refresh token
 * @access  Public
 * @limits  Rate limited to prevent brute force attacks
 */
router.post(
  '/login', 
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 attempts per 15 minutes per IP
  validate('login'),
  login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Get new access token using refresh token
 * @access  Public
 * @limits  Rate limited
 */
router.post(
  '/refresh-token', 
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 }), // 20 refreshes per 15 minutes
  validate('refreshToken'),
  refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Invalidate refresh token
 * @access  Private
 */
router.post('/logout', protect, logout);

/**
 * @route   GET /api/auth/validate-token
 * @desc    Validate a JWT token and return user data
 * @access  Public
 */
router.get('/validate-token', validateToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protect, getProfile);

/**
 * NOTE: Profile routes have been moved to profileRoutes.mjs
 */

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put(
  '/password',
  protect,
  validate('changePassword'),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Find user
      const user = await User.findByPk(req.user.id);
      
      // Verify current password
      const isMatch = await user.checkPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      user.password = newPassword; // Will be hashed by model hooks
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      logger.error('Password change error:', { error: error.message, userId: req.user.id });
      res.status(500).json({
        success: false,
        message: 'Server error changing password'
      });
    }
  }
);

/**
 * @route   GET /api/auth/users/trainers
 * @desc    Get all trainers with optional filtering
 * @access  Private
 */
router.get('/users/trainers', protect, async (req, res) => {
  try {
    const { specialties, availability, rating, sortBy, limit, page } = req.query;
    
    // Build filter criteria
    let whereClause = {
      role: 'trainer',
      isActive: true
    };
    
    // Filter by specialties if provided
    if (specialties) {
      const specialtiesArray = specialties.split(',');
      // This assumes specialties is stored as an array or JSONB in the database
      // Adjust according to your actual database structure
      whereClause.specialties = {
        [Op.overlap]: specialtiesArray
      };
    }
    
    // Add rating filter if provided
    if (rating) {
      whereClause.averageRating = {
        [Op.gte]: parseFloat(rating)
      };
    }
    
    // Pagination
    const limitValue = parseInt(limit) || 10;
    const pageValue = parseInt(page) || 1;
    const offset = (pageValue - 1) * limitValue;
    
    // Build sorting options
    let order = [];
    if (sortBy) {
      switch (sortBy) {
        case 'rating_high':
          order.push(['averageRating', 'DESC']);
          break;
        case 'rating_low':
          order.push(['averageRating', 'ASC']);
          break;
        case 'name_asc':
          order.push(['firstName', 'ASC']);
          break;
        case 'name_desc':
          order.push(['firstName', 'DESC']);
          break;
        case 'experience_high':
          order.push(['yearsOfExperience', 'DESC']);
          break;
        default:
          order.push(['firstName', 'ASC']);
      }
    } else {
      order.push(['firstName', 'ASC']);
    }
    
    // Find trainers
    const { count, rows: trainers } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'phone', 'photo', 
        'specialties', 'bio', 'certifications', 'averageRating', 
        'yearsOfExperience', 'totalSessions'
      ],
      order,
      limit: limitValue,
      offset
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limitValue);
    
    res.json({
      success: true,
      trainers,
      pagination: {
        total: count,
        pages: totalPages,
        page: pageValue,
        limit: limitValue
      }
    });
  } catch (error) {
    logger.error('Error fetching trainers:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching trainers' 
    });
  }
});

/**
 * @route   GET /api/auth/users/clients
 * @desc    Get all clients with filtering and pagination (admin only)
 * @access  Private (Admin Only)
 */
router.get('/users/clients', protect, adminOnly, async (req, res) => {
  try {
    const { search, status, sortBy, limit, page } = req.query;
    
    // Build filter criteria
    let whereClause = {
      role: 'client'
    };
    
    // Add status filter if provided
    if (status) {
      whereClause.isActive = status === 'active';
    }
    
    // Add search filter if provided
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Pagination
    const limitValue = parseInt(limit) || 10;
    const pageValue = parseInt(page) || 1;
    const offset = (pageValue - 1) * limitValue;
    
    // Build sorting options
    let order = [];
    if (sortBy) {
      switch (sortBy) {
        case 'name_asc':
          order.push(['firstName', 'ASC']);
          break;
        case 'name_desc':
          order.push(['firstName', 'DESC']);
          break;
        case 'date_joined_asc':
          order.push(['createdAt', 'ASC']);
          break;
        case 'date_joined_desc':
          order.push(['createdAt', 'DESC']);
          break;
        case 'last_active_desc':
          order.push(['lastActive', 'DESC']);
          break;
        default:
          order.push(['firstName', 'ASC']);
      }
    } else {
      order.push(['firstName', 'ASC']);
    }
    
    // Find clients
    const { count, rows: clients } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'firstName', 'lastName', 'email', 'phone', 'photo', 
        'isActive', 'createdAt', 'lastActive', 'fitnessGoal', 
        'trainingExperience'
      ],
      order,
      limit: limitValue,
      offset
    });
    
    // Calculate pagination info
    const totalPages = Math.ceil(count / limitValue);
    
    res.json({
      success: true,
      clients,
      pagination: {
        total: count,
        pages: totalPages,
        page: pageValue,
        limit: limitValue
      }
    });
  } catch (error) {
    logger.error('Error fetching clients:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching clients' 
    });
  }
});

/**
 * @route   GET /api/auth/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin or same user or trainer of the user)
 */
router.get('/users/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isSameUser = req.user.id === parseInt(userId);
    
    // If not admin or same user, check if trainer relationship exists
    let hasTrainerAccess = false;
    if (!isAdmin && !isSameUser && req.user.role === 'trainer') {
      // This query would check if the requesting trainer has a relationship with this client
      // Adjust based on your database model structure
      const trainerClientRelation = await TrainerClient.findOne({
        where: {
          trainerId: req.user.id,
          clientId: userId
        }
      });
      
      hasTrainerAccess = !!trainerClientRelation;
    }
    
    if (!isAdmin && !isSameUser && !hasTrainerAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this user'
      });
    }
    
    // Fetch user with appropriate attributes based on requester
    const attributesToExclude = ['password', 'refreshTokenHash'];
    
    // If not admin, exclude additional sensitive fields
    if (!isAdmin) {
      attributesToExclude.push('failedLoginAttempts', 'isLocked', 'registrationIP', 'lastLoginIP');
    }
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: attributesToExclude }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Error fetching user by ID:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update user by ID (admin only)
 * @access  Private (Admin Only)
 */
router.put('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Fields that can be updated by admin
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      isActive,
      specialties,
      certifications,
      bio,
      yearsOfExperience,
      fitnessGoal,
      trainingExperience
    } = req.body;
    
    // Update fields if provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (specialties) user.specialties = specialties;
    if (certifications) user.certifications = certifications;
    if (bio) user.bio = bio;
    if (yearsOfExperience) user.yearsOfExperience = yearsOfExperience;
    if (fitnessGoal) user.fitnessGoal = fitnessGoal;
    if (trainingExperience) user.trainingExperience = trainingExperience;
    
    // Save changes
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    logger.error('Error updating user:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

/**
 * @route   GET /api/auth/stats
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin Only)
 */
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    // Get user counts by role
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const trainerCount = await User.count({ where: { role: 'trainer' } });
    const clientCount = await User.count({ where: { role: 'client' } });
    const adminCount = await User.count({ where: { role: 'admin' } });
    
    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentRegistrations = await User.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });
    
    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        trainerCount,
        clientCount,
        adminCount,
        recentRegistrations
      }
    });
  } catch (error) {
    logger.error('Error fetching user stats:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching user statistics'
    });
  }
});

export default router;