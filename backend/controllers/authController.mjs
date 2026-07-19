/**
 * Authentication Controller (JWT + RBAC + Rate Limiting)
 * =======================================================
 *
 * Purpose: Handle all user authentication, registration, and session management
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Auth System
 *
 * Architecture Overview:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Client Request │─────▶│  Auth Controller │─────▶│   PostgreSQL    │
 * │  (Login/Reg)    │      │  (this file)     │      │   users table   │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *                                   │
 *                                   │ (generates)
 *                                   ▼
 *                          ┌──────────────────┐
 *                          │  JWT Tokens      │
 *                          │  - Access Token  │
 *                          │  - Refresh Token │
 *                          └──────────────────┘
 *
 * Database Relationships:
 *   ┌─────────────────────────┐
 *   │ users (table)           │
 *   ├─────────────────────────┤
 *   │ id (UUID) PK            │
 *   │ email (UNIQUE)          │
 *   │ password (bcrypt hash)  │
 *   │ role ENUM               │
 *   │ firstName, lastName     │
 *   │ photo, fitnessGoal      │
 *   │ lastActive TIMESTAMP    │
 *   └─────────────────────────┘
 *
 * API Endpoints (10 total):
 *
 * ┌────────────────────────────────────────────────────────────────┐
 * │ ENDPOINT                    AUTH          PURPOSE              │
 * ├────────────────────────────────────────────────────────────────┤
 * │ POST   /api/auth/register   Public        Create new user      │
 * │ POST   /api/auth/login      Public        Authenticate user    │
 * │ POST   /api/auth/refresh    Public        Refresh access token │
 * │ POST   /api/auth/logout     Required      Invalidate session   │
 * │ GET    /api/auth/profile    Required      Get user profile     │
 * │ PATCH  /api/auth/profile    Required      Update profile       │
 * │ POST   /api/auth/validate   Public        Validate JWT token   │
 * │ GET    /api/auth/user/:id   Required      Get user by ID       │
 * │ POST   /api/auth/controller Public        Legacy endpoint      │
 * │ GET    /api/auth/me         Required      Get current user     │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Authentication Flow (Mermaid):
 * ```mermaid
 * sequenceDiagram
 *     participant C as Client
 *     participant A as AuthController
 *     participant R as Rate Limiter
 *     participant DB as PostgreSQL
 *     participant JWT as JWT Library
 *
 *     C->>A: POST /api/auth/login {email, password}
 *     A->>R: Check rate limit (IP/email)
 *
 *     alt Rate limit exceeded
 *         R-->>C: 429 Too Many Requests
 *     else Within limit
 *         A->>DB: SELECT * FROM users WHERE email = ?
 *
 *         alt User not found
 *             DB-->>C: 401 Invalid credentials
 *         else User found
 *             A->>A: bcrypt.compare(password, hash)
 *
 *             alt Password invalid
 *                 A->>R: Increment failed attempts
 *                 A-->>C: 401 Invalid credentials
 *             else Password valid
 *                 A->>JWT: generateAccessToken(id, role)
 *                 A->>JWT: generateRefreshToken(id)
 *                 A->>DB: UPDATE users SET lastActive = NOW()
 *                 A-->>C: 200 {user, accessToken, refreshToken}
 *             end
 *         end
 *     end
 * ```
 *
 * JWT Token Structure:
 *
 * Access Token (3 hour expiry):
 * {
 *   id: "uuid-string",
 *   role: "admin|trainer|client",
 *   tokenType: "access",
 *   tokenId: "uuid-for-revocation",
 *   iat: 1699564800,
 *   exp: 1699575600
 * }
 *
 * Refresh Token (7 day expiry):
 * {
 *   id: "uuid-string",
 *   tokenType: "refresh",
 *   tokenId: "uuid-for-revocation",
 *   iat: 1699564800,
 *   exp: 1700169600
 * }
 *
 * Security Features:
 *
 * 1. Password Security:
 *    - bcrypt hashing with 10 rounds
 *    - Minimum 8 characters required
 *    - Password never stored in plaintext
 *    - Password never returned in API responses
 *
 * 2. Rate Limiting:
 *    - 5 login attempts per 15 minutes (per IP/email)
 *    - In-memory tracking (should migrate to Redis for production)
 *    - Automatic cleanup of expired attempts
 *    - Returns 429 when limit exceeded
 *
 * 3. JWT Security:
 *    - Separate access and refresh tokens
 *    - Unique tokenId for revocation support
 *    - Signed with JWT_SECRET
 *    - Token type validation
 *
 * 4. Input Validation:
 *    - Email format validation
 *    - Username uniqueness checks
 *    - Password strength requirements
 *    - SQL injection prevention via parameterized queries
 *
 * 5. Response Sanitization:
 *    - Password field stripped from all responses
 *    - PII fields only returned to authorized users
 *    - Consistent error messages (prevent user enumeration)
 *
 * Business Logic:
 *
 * WHY Separate Access and Refresh Tokens?
 * - Security: Short-lived access tokens limit damage if stolen
 * - UX: Refresh tokens enable seamless re-authentication without login
 * - Revocation: Can invalidate refresh tokens without affecting active sessions
 * - Industry standard: OAuth 2.0 pattern
 *
 * WHY Rate Limiting?
 * - Brute force protection: Prevents password guessing attacks
 * - DDoS mitigation: Limits impact of automated attacks
 * - Compliance: OWASP recommendation for authentication endpoints
 * - Resource protection: Prevents database overload from failed logins
 *
 * WHY bcrypt Over Plain Hashing?
 * - Intentionally slow: Makes brute force attacks impractical
 * - Salted: Every password has unique hash (prevents rainbow tables)
 * - Adaptive: Can increase rounds as hardware improves
 * - Industry standard: Recommended by OWASP
 *
 * WHY Lazy Loading User Model?
 * - Prevents initialization race condition during server startup
 * - Models loaded via getUser() when needed
 * - Ensures Sequelize associations are fully initialized
 * - Critical for P0 stability fix
 *
 * Error Handling:
 *
 * 400 Bad Request:
 * - Missing required fields
 * - Invalid email format
 * - Password too short
 * - Validation errors
 *
 * 401 Unauthorized:
 * - Invalid credentials
 * - Token expired
 * - Token invalid
 * - User not found
 *
 * 409 Conflict:
 * - Email already exists
 * - Username already exists
 *
 * 429 Too Many Requests:
 * - Rate limit exceeded
 *
 * 500 Internal Server Error:
 * - Database connection error
 * - JWT signing error
 * - Unexpected errors
 *
 * Environment Variables:
 * - JWT_SECRET: Secret key for access token signing (REQUIRED)
 * - JWT_REFRESH_SECRET: Secret key for refresh token (defaults to JWT_SECRET)
 * - JWT_EXPIRES_IN: Access token expiry (default: 3h)
 * - REFRESH_TOKEN_EXPIRES_IN: Refresh token expiry (default: 7d)
 *
 * Dependencies:
 * - jsonwebtoken: JWT token generation/verification
 * - bcryptjs: Password hashing
 * - Sequelize: ORM for database operations
 * - uuid: Unique token IDs for revocation
 *
 * Performance Considerations:
 * - bcrypt hashing: ~100ms per password (intentional delay)
 * - Database queries: ~5-10ms (indexed email lookup)
 * - JWT signing: ~1-2ms
 * - Total login time: ~110-115ms
 * - Rate limiter: In-memory Map (O(1) lookup, migrate to Redis for scale)
 *
 * Testing:
 * - Unit tests: backend/tests/authController.test.mjs
 * - Integration tests: API endpoint tests
 * - Security tests: Rate limiting, password hashing, JWT validation
 *
 * Created: 2024 (Original)
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

// backend/controllers/authController.mjs
import logger from '../utils/logger.mjs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// 🚀 ENHANCED: Coordinated model imports for consistent associations
import { getUser } from '../models/index.mjs';
import sequelize from '../database.mjs';
import { Op, col, fn, where as sqlWhere } from 'sequelize';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { getClientIp } from '../services/geoIpService.mjs';
import { createNotification, createAdminNotification } from './notificationController.mjs';
import { captureLeadFromSignup } from '../services/leadCaptureService.mjs';
import {
  getPasswordResetSecret,
  hashPasswordResetToken,
  sendPasswordResetEmailForUser,
} from '../services/auth/passwordResetEmailService.mjs';
import { validatePasswordStrength } from '../services/auth/passwordPolicyService.mjs';
import {
  CLIENT_SOURCES,
  parseClientSource,
} from '../services/sessionBillingPolicy.mjs';
import { getWaiverAccessStatus } from '../middleware/waiverGate.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading User model to prevent initialization race condition
// User model will be retrieved via getUser() inside each function when needed

dotenv.config();

/**
 * Security Constants - Consider moving these to a config file
 */
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const INSECURE_JWT_PLACEHOLDERS = new Set([
  'your-secret-key',
  'your-secret-key-change-in-production',
  'your-production-jwt-secret-key-here-change-this'
]);
// Production rate limiting — 10 attempts per 15 minutes
const LOGIN_ATTEMPT_LIMIT = parseInt(process.env.LOGIN_ATTEMPT_LIMIT, 10) || 10;
const LOGIN_ATTEMPT_WINDOW = parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MS, 10) || 15 * 60 * 1000;
const PUBLIC_REGISTRATION_CLIENT_SOURCES = CLIENT_SOURCES;
const PUBLIC_NON_CLIENT_SOURCE = 'external';
// Sean's ruling 2026-07-12: 'admin' is REMOVED from public self-registration
// entirely. Admin accounts are provisioned via CLI/seed only
// (backend/scripts/create-admin-user.mjs, adminSeeder.mjs) — no anonymous
// path to the crown-jewel role exists anymore, access-code-gated or not.
// (ADMIN_ACCESS_CODE remains in use by userManagementController's
// authenticated promotion path; it no longer guards public registration.)
const PUBLIC_SELF_REGISTRATION_ROLES = new Set(['user', 'client']);

const resolvePublicRegistrationClientSource = ({ role, clientSource }) => {
  if (role !== 'client') {
    return PUBLIC_NON_CLIENT_SOURCE;
  }

  const normalizedSource = parseClientSource(clientSource);
  return PUBLIC_REGISTRATION_CLIENT_SOURCES.has(normalizedSource) ? normalizedSource : null;
};

const createJwtSecretConfigurationError = (secretName) => {
  const error = new Error(`${secretName} is not configured`);
  error.name = 'JwtSecretConfigurationError';
  return error;
};

const resolveJwtSecret = (secretName, secret) => {
  if (!secret || INSECURE_JWT_PLACEHOLDERS.has(secret)) {
    throw createJwtSecretConfigurationError(secretName);
  }

  return secret;
};

const getJwtSecret = () => resolveJwtSecret('JWT_SECRET', process.env.JWT_SECRET);

const getRefreshJwtSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET || getJwtSecret();
  return resolveJwtSecret('JWT_REFRESH_SECRET', secret);
};

/**
 * Login attempts tracking for rate limiting
 * In production, this should be moved to Redis or similar
 */
const loginAttempts = new Map();

/**
 * @desc    Generate access JWT Token
 * @param   {String} id - User ID to include in token
 * @param   {String} role - User role for role-based access control
 * @returns {String} Signed JWT token
 */
const generateAccessToken = (id, role) => {
  return jwt.sign(
    {
      id,
      role,
      tokenType: 'access',
      tokenId: uuidv4() // Unique identifier for token revocation
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * @desc    Generate refresh JWT Token with longer expiry
 * @param   {String} id - User ID to include in token
 * @returns {String} Signed JWT refresh token
 */
const generateRefreshToken = (id) => {
  return jwt.sign(
    {
      id,
      tokenType: 'refresh',
      tokenId: uuidv4() // Unique identifier for token revocation
    },
    getRefreshJwtSecret(),
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
};

/**
 * @desc    Sanitize user object before sending as response
 * @param   {Object} user - User database object
 * @returns {Object} Sanitized user object
 */
const sanitizeUser = (user) => {
  const sanitized = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    role: user.role,
    photo: user.photo,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isOnboardingComplete: user.isOnboardingComplete === true
  };

  // Only include additional fields if they exist
  if (user.fitnessGoal) sanitized.fitnessGoal = user.fitnessGoal;
  if (user.trainingExperience) sanitized.trainingExperience = user.trainingExperience;
  if (user.specialties) sanitized.specialties = user.specialties;
  if (user.lastActive) sanitized.lastActive = user.lastActive;
  // Include session count so frontend can route gallery funnel correctly
  if (user.availableSessions !== undefined) sanitized.availableSessions = user.availableSessions;
  // Include client source so frontend can adapt UI (move_fitness vs swanstudios)
  if (user.clientSource) sanitized.clientSource = user.clientSource;
  if (user.sessionBillingMode) sanitized.sessionBillingMode = user.sessionBillingMode;

  return sanitized;
};

async function withWaiverAccessStatus(user) {
  const sanitized = sanitizeUser(user);

  try {
    const status = await getWaiverAccessStatus(user);
    return {
      ...sanitized,
      waiverRequired: status.required,
      hasLinkedWaiver: status.hasLinkedWaiver,
      waiverStatus: status.waiverStatus,
      waiverRecordId: status.waiverRecordId || null,
      waiverSignedAt: status.waiverSignedAt || null,
    };
  } catch (error) {
    logger.warn('Unable to enrich auth user with waiver status', {
      error: error.message,
      userId: user?.id,
      role: user?.role,
    });

    const requiresWaiver = ['client', 'user'].includes(user?.role);
    return {
      ...sanitized,
      waiverRequired: requiresWaiver,
      hasLinkedWaiver: !requiresWaiver,
      waiverStatus: requiresWaiver ? 'unverified' : 'not_required',
      waiverRecordId: null,
      waiverSignedAt: null,
    };
  }
}

/**
 * 🚀 ENHANCED: Simplified rate limiting with better efficiency
 * @param   {String} identifier - IP address or username
 * @returns {Boolean} True if rate limited, false otherwise
 */
const checkAndRecordAttempt = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || [];

  // Filter recent attempts and add current attempt in one operation
  const recentAttempts = attempts
    .filter(timestamp => now - timestamp < LOGIN_ATTEMPT_WINDOW)
    .concat(now);

  loginAttempts.set(identifier, recentAttempts);

  // Return if rate limited (excluding the current attempt)
  return recentAttempts.length > LOGIN_ATTEMPT_LIMIT;
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    logger.info('Processing new user registration');
    logger.info('Registration request received', {
      hasRequiredFields: Boolean(req.body?.firstName && req.body?.lastName && req.body?.email && req.body?.username),
    });

    const {
      firstName,
      lastName,
      email,
      username,
      password,
      // Optional fields
      phone,
      dateOfBirth,
      gender,
      weight,
      height,
      fitnessGoal,
      trainingExperience,
      healthConcerns,
      emergencyContact
    } = req.body;

    // Input validation
    if (!firstName || !lastName || !email || !username || !password) {
      await transaction.rollback();
      logger.warn('Registration attempt with missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      await transaction.rollback();
      logger.warn('Registration attempt with invalid email format');
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.success) {
      await transaction.rollback();
      logger.warn('Registration attempt with weak password');
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if user already exists
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          sqlWhere(
            fn('LOWER', col('email')),
            normalizedEmail
          ),
          sqlWhere(
            fn('LOWER', col('username')),
            normalizedUsername
          )
        ]
      },
      transaction
    });

    if (existingUser) {
      await transaction.rollback();
      logger.info(`Registration attempt with existing ${existingUser.email === email ? 'email' : 'username'}`);
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    const { clientSource } = req.body;
    const requestedRole = typeof req.body.role === 'string' ? req.body.role.trim() : 'user';
    const role = requestedRole || 'user';

    if (role === 'trainer') {
      await transaction.rollback();
      logger.warn('Public trainer self-registration attempt blocked');
      return res.status(400).json({
        success: false,
        message: 'Trainer accounts are created by SwanStudios staff.'
      });
    }

    if (role === 'admin') {
      await transaction.rollback();
      // Loud + attributable: an anonymous attempt at the crown-jewel role.
      logger.error('[Auth] SECURITY: public admin self-registration attempt blocked (admin accounts are provisioned via CLI/seed only)', {
        ip: getClientIp(req),
      });
      return res.status(400).json({
        success: false,
        message: 'Admin accounts are created by SwanStudios staff.'
      });
    }

    if (!PUBLIC_SELF_REGISTRATION_ROLES.has(role)) {
      await transaction.rollback();
      logger.warn('Public registration attempt with invalid role');
      return res.status(400).json({
        success: false,
        message: 'Please select a valid account type'
      });
    }

    const resolvedClientSource = resolvePublicRegistrationClientSource({ role, clientSource });
    if (!resolvedClientSource) {
      await transaction.rollback();
      logger.warn('Client registration attempt with missing or invalid client source');
      return res.status(400).json({
        success: false,
        message: 'Client source is required for client accounts'
      });
    }

    // Create new user
    const registrationIp = getClientIp(req);
    const user = await User.create(
      {
        firstName,
        lastName,
        email: normalizedEmail,
        username,
        password, // will be hashed via User model hooks
        phone,
        dateOfBirth,
        gender,
        weight,
        height,
        fitnessGoal,
        trainingExperience,
        healthConcerns,
        emergencyContact,
        role: role, // Use the provided role or default to 'user'
        clientSource: resolvedClientSource,
        lastActive: new Date(),
        lastLoginIP: registrationIp,
        registrationIP: registrationIp // Store IP for security monitoring
      },
      { transaction }
    );

    // Ensure ID is treated properly
    const userId = user.id.toString();
    logger.info(`User authenticated, generating tokens: userID type=${typeof userId} id=${userId}`);

    // Generate tokens
    const accessToken = generateAccessToken(userId, user.role);
    const refreshToken = generateRefreshToken(userId);

    // Update user with refresh token hash
    await user.update(
      {
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
        lastLogin: new Date()
      },
      { transaction }
    );

    // Commit transaction
    await transaction.commit();

    logger.info('New user registered successfully', { userId: user.id, role: user.role });

    // --- Best-effort: auto-follow admin so new users see content ---
    try {
      const User = getUser();
      const Friendship = sequelize.models.Friendship;
      if (Friendship) {
        const adminUser = await User.findOne({ where: { role: 'admin' } });
        if (adminUser && adminUser.id !== user.id) {
          await Friendship.findOrCreate({
            where: {
              requesterId: adminUser.id,
              recipientId: user.id,
            },
            defaults: {
              requesterId: adminUser.id,
              recipientId: user.id,
              status: 'accepted',
            },
          });
          logger.info(`Auto-follow: new user ${user.id} now follows admin ${adminUser.id}`);
        }
      }
    } catch (autoFollowErr) {
      logger.warn(`Auto-follow failed for new user ${user.id}: ${autoFollowErr.message}`);
    }

    // Notification trigger: Welcome notification for new user + admin alert
    try {
      await createAdminNotification({
        title: 'New User Signup',
        message: `${firstName} ${lastName} (${email}) registered`,
        type: 'admin'
      });
      await createNotification({
        userId: user.id,
        title: 'Welcome to SwanStudios!',
        message: 'Complete your onboarding to get started',
        type: 'system',
        link: '/dashboard/client/onboarding'
      });
    } catch (notifErr) {
      logger.warn(`Registration notification failed for user ${user.id}: ${notifErr.message}`);
    }

    // --- Best-effort: capture a CRM lead from this signup (skips Move Fitness + staff roles) ---
    // Closes the funnel hole — new accounts now enter the lead pipeline for follow-up to PAID.
    try {
      await captureLeadFromSignup({
        user,
        clientSource: resolvedClientSource,
        role,
        attribution: {
          utmSource: req.body?.utmSource,
          utmMedium: req.body?.utmMedium,
          utmCampaign: req.body?.utmCampaign,
          referrer: req.body?.referrer,
        },
      });
    } catch (leadErr) {
      logger.warn(`Lead capture from signup failed for user ${user.id}: ${leadErr.message}`);
    }

    // Return user data and token
    res.status(201).json({
      success: true,
      user: await withWaiverAccessStatus(user),
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Registration error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });

    // Handle specific database errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    // Enhanced debug logging
    logger.info(`Login attempt initiated with request body:`, {
      body: JSON.stringify({
        username: req.body.username ? req.body.username.substring(0, 3) + '***' : 'undefined',
        hasPassword: !!req.body.password
      })
    });

    const { username, password } = req.body;
    const normalizedIdentity = typeof username === 'string' ? username.trim().toLowerCase() : '';

    // Input validation
    if (!username || !password) {
      logger.warn('Login attempt with missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Per-identity throttling complements the route's broader IP flood ceiling
    // without locking every customer on a shared gym or household connection.
    if (checkAndRecordAttempt(normalizedIdentity)) {
      logger.warn('Rate limited login attempt');
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again later.'
      });
    }

    // Find the user with enhanced error handling
    let user;

    try {
      const User = getUser(); // 🎯 ENHANCED: Lazy load User model
      user = await User.findOne({
        where: {
          [Op.or]: [
            sqlWhere(
              fn('LOWER', col('username')),
              normalizedIdentity
            ),
            sqlWhere(
              fn('LOWER', col('email')),
              normalizedIdentity
            )
          ]
        }
      });
    } catch (queryError) {
      logger.error('Database query error in findOne:', {
        error: queryError.message,
        name: queryError.name,
        code: queryError.code,
      });

      return res.status(500).json({
        success: false,
        message: 'Database query error'
      });
    }

    if (!user) {
      logger.info('Login attempt for non-existent user');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logger.warn('Login attempt on locked account', { userId: user.id });
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Please contact support.'
      });
    }

    // Check if account is active (block deactivated users before token issuance)
    if (user.isActive === false) {
      logger.warn('Login attempt on inactive account', { userId: user.id });
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Check password with error handling
    let isMatch;

    try {
      isMatch = await user.checkPassword(password);
    } catch (passwordError) {
      logger.error('Password verification error:', {
        error: passwordError.message,
        userId: user.id
      });

      return res.status(500).json({
        success: false,
        message: 'Password verification error'
      });
    }

    if (!isMatch) {
      // Increment failed attempts
      await user.update({
        failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
        // Lock account after 10 failed attempts
        isLocked: (user.failedLoginAttempts || 0) >= 9
      });

      logger.warn('Failed login attempt for user', { userId: user.id });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // A successful credential check must not accumulate toward a future
    // customer lockout. Failed attempts remain bounded by the identity bucket.
    loginAttempts.delete(normalizedIdentity);

    // Force password change check (admin-created accounts)
    if (user.forcePasswordChange) {
      logger.info('Force password change required for user', { userId: user.id });
      const tempToken = jwt.sign(
        { id: user.id, tokenType: 'force-password-change', tokenId: uuidv4() },
        getJwtSecret(),
        { expiresIn: '15m' }
      );
      return res.status(200).json({
        success: true,
        forcePasswordChange: true,
        tempToken,
        message: 'Password change required before first use'
      });
    }

    // Generate tokens with error handling
    let accessToken, refreshToken;

    try {
      accessToken = generateAccessToken(user.id, user.role);
      refreshToken = generateRefreshToken(user.id);
    } catch (tokenError) {
      logger.error('Token generation error:', tokenError);
      if (tokenError.name === 'JwtSecretConfigurationError') {
        return res.status(500).json({
          success: false,
          message: 'Authentication is not configured'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Token generation error'
      });
    }

    // Reset failed attempts and update login info
    try {
      await user.update({
        failedLoginAttempts: 0,
        lastLogin: new Date(),
        lastActive: new Date(),
        lastLoginIP: getClientIp(req),
        refreshTokenHash: await bcrypt.hash(refreshToken, 10)
      });
    } catch (updateError) {
      logger.error('Error updating user login info:', updateError);
      // Don't fail login if update fails, just log it
    }

    logger.info('Successful login', { userId: user.id, role: user.role });

    // Auto-initialize gamification record for admin/trainer users
    // so they can use client features (workout logging, XP, progress)
    if (['admin', 'trainer'].includes(user.role)) {
      try {
        const { default: Gamification } = await import('../models/Gamification.mjs');
        await Gamification.findOrCreate({
          where: { userId: user.id },
          defaults: {
            level: 1,
            experience: 0,
            totalXP: 0,
            currentTier: 'bronze',
            streakCount: 0,
            longestStreak: 0,
          }
        });
      } catch (gamErr) {
        // Non-fatal — don't block login if gamification init fails
        logger.error('Gamification auto-init error (non-fatal):', gamErr.message);
      }
    }

    // Return user data and tokens
    return res.status(200).json({
      success: true,
      user: await withWaiverAccessStatus(user),
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    // Detailed error logging
    logger.error('Login error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code || 'no_code'
    });

    // Database-specific errors
    if (error.name === 'SequelizeConnectionError') {
      return res.status(500).json({
        success: false,
        message: 'Database connection error'
      });
    }

    if (error.name === 'JwtSecretConfigurationError') {
      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured'
      });
    }

    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({
        success: false,
        message: 'Database query error'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      getRefreshJwtSecret(),
      { algorithms: ['HS256'] }
    );

    // Check token type
    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isActive === false) {
      logger.warn('Refresh attempt on inactive account', { userId: user.id });
      await user.update({ refreshTokenHash: null }).catch((revokeError) => {
        logger.warn('Unable to revoke inactive account refresh token', {
          userId: user.id,
          error: revokeError.message,
        });
      });
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    if (user.isLocked) {
      logger.warn('Refresh attempt on locked account', { userId: user.id });
      await user.update({ refreshTokenHash: null }).catch((revokeError) => {
        logger.warn('Unable to revoke locked account refresh token', {
          userId: user.id,
          error: revokeError.message,
        });
      });
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Please contact support.'
      });
    }
    // Verify refresh token hash
    if (!user.refreshTokenHash) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked'
      });
    }

    const isValidRefreshToken = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValidRefreshToken) {
      // Potential token reuse attack
      logger.warn(`Potential refresh token reuse for user ${user.id}`);

      // Revoke all refresh tokens for this user
      await user.update({ refreshTokenHash: null });

      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    // Update refresh token hash
    await user.update({
      refreshTokenHash: await bcrypt.hash(newRefreshToken, 10),
      lastActive: new Date()
    });

    res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error('Token refresh error:', { error: error.message, stack: error.stack });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    if (error.name === 'JwtSecretConfigurationError') {
      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
};

/**
 * @desc    Logout user (revoke refresh token)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    // The user is attached to req by the protect middleware
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Revoke refresh token
    await user.update({ refreshTokenHash: null });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private (requires token)
 */
export const getProfile = async (req, res) => {
  try {
    // The user is already attached to req by the protect middleware
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshTokenHash', 'failedLoginAttempts'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update last active timestamp
    await user.update({ lastActive: new Date() });

    res.status(200).json({
      success: true,
      user: await withWaiverAccessStatus(user)
    });
  } catch (error) {
    logger.error('Profile fetch error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(req.user.id, { transaction });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fields that can be updated
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
      currentPassword,
      newPassword
    } = req.body;

    // Check if email is being changed
    if (email && email !== user.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Check if email is already taken
      const ExistingUser = getUser(); // 🎯 ENHANCED: Lazy load User model for email check
      const existingEmail = await ExistingUser.findOne({
        where: { email },
        transaction
      });

      if (existingEmail) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    // Handle password change
    if (newPassword) {
      // Require current password
      if (!currentPassword) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password'
        });
      }

      // Verify current password
      const isMatch = await user.checkPassword(currentPassword);
      if (!isMatch) {
        await transaction.rollback();
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.success) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }

      // Set new password (will be hashed by model hooks)
      user.password = newPassword;
      user.refreshTokenHash = null;
    }

    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (gender) user.gender = gender;
    if (weight) user.weight = weight;
    if (height) user.height = height;
    if (fitnessGoal) user.fitnessGoal = fitnessGoal;
    if (trainingExperience) user.trainingExperience = trainingExperience;
    if (healthConcerns) user.healthConcerns = healthConcerns;
    if (emergencyContact) user.emergencyContact = emergencyContact;

    // Save changes
    await user.save({ transaction });
    await transaction.commit();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: await withWaiverAccessStatus(user)
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Profile update error:', { error: error.message, stack: error.stack });

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

/**
 * @desc    Validate token and return user info
 * @route   GET /api/auth/validate-token
 * @access  Public
 */
export const validateToken = async (req, res) => {
  try {
    let token;

    // Get token from headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });

    // Check token type
    if (decoded.tokenType !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user by ID
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'refreshTokenHash', 'failedLoginAttempts'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'User not found'
      });
    }

    if (user.isActive === false) {
      logger.warn('Token validation attempt on inactive account', { userId: user.id });
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    if (user.isLocked) {
      logger.warn('Token validation attempt on locked account', { userId: user.id });
      return res.status(401).json({
        success: false,
        valid: false,
        message: 'Account is locked. Please contact support.'
      });
    }

    // Update last active timestamp
    await user.update({ lastActive: new Date() });

    // Return user data
    res.status(200).json({
      success: true,
      valid: true,
      user: await withWaiverAccessStatus(user)
    });
  } catch (error) {
    logger.error('Token validation error:', { error: error.message, stack: error.stack });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    if (error.name === 'JwtSecretConfigurationError') {
      return res.status(500).json({
        success: false,
        message: 'Authentication is not configured'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * @desc    Get user by ID (for admin dashboard)
 * @route   GET /api/auth/users/:id
 * @access  Private (Admin only)
 */
export const getUserById = async (req, res) => {
  try {
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'refreshTokenHash'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: await withWaiverAccessStatus(user)
    });
  } catch (error) {
    logger.error('Get user by ID error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
};

// Export the original controller function for backward compatibility
export const authController = async (req, res) => {
  try {
    logger.info('Processing request', { path: req.path, method: req.method });
    // Controller logic
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error in authController', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const User = getUser(); // 🎯 ENHANCED: Lazy load User model
    const user = await User.findByPk(req.user.id);
    return successResponse(res, sanitizeUser(user), 'User profile retrieved successfully');
  } catch (error) {
    logger.error('Error fetching user profile:', { error: error.message, stack: error.stack });
    return errorResponse(res, 'Failed to retrieve user profile', 500);
  }
};

/**
 * @desc    Force password change for admin-created accounts
 * @route   POST /api/auth/force-change-password
 * @access  Requires tempToken from force-password-change login response
 */
export const changePasswordForced = async (req, res) => {
  try {
    const { tempToken, newPassword } = req.body;

    if (!tempToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'tempToken and newPassword are required'
      });
    }

    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.success) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Verify the temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, getJwtSecret(), { algorithms: ['HS256'] });
    } catch (tokenErr) {
      if (tokenErr.name === 'JwtSecretConfigurationError') {
        return res.status(500).json({
          success: false,
          message: 'Authentication is not configured'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired temporary token. Please login again.'
      });
    }

    if (decoded.tokenType !== 'force-password-change') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    const User = getUser();
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isActive === false) {
      logger.warn('Force password change attempt on inactive account', { userId: user.id });
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Update password and clear the force flag
    user.password = newPassword; // Hashed by beforeUpdate hook
    user.forcePasswordChange = false;
    user.failedLoginAttempts = 0;
    await user.save();

    // Generate normal tokens so user is logged in after password change
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshTokenValue = generateRefreshToken(user.id);

    await user.update({
      lastLogin: new Date(),
      lastActive: new Date(),
      refreshTokenHash: await bcrypt.hash(refreshTokenValue, 10)
    });

    logger.info(`Force password change completed for user ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      user: await withWaiverAccessStatus(user),
      token: accessToken,
      refreshToken: refreshTokenValue
    });
  } catch (error) {
    logger.error('Force password change error:', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Server error during password change'
    });
  }
};

/**
 * @desc    Request password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Respond IMMEDIATELY — truly constant timing (no DB work before response)
  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });

  // Background work AFTER response is sent (fire-and-forget)
  setImmediate(async () => {
    try {
      logger.info('[forgotPassword] request_received');

      let resetSecret;
      try {
        resetSecret = getPasswordResetSecret();
      } catch (secretError) {
        logger.error('[forgotPassword] reset secret not configured - aborting');
        return;
      }
      logger.info('[forgotPassword] RESET_SECRET=ok');

      const User = getUser();
      logger.info(`[forgotPassword] getUser=${User ? 'ok' : 'null'}`);
      const user = await User.findOne({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.col('email')),
          email.toLowerCase()
        )
      });
      if (!user) {
        logger.info('[forgotPassword] user_lookup=not_found');
        return;
      }
      logger.info(`[forgotPassword] user_lookup=found id=${user.id}`);
      if (user.isActive === false) {
        logger.info(`[forgotPassword] user_lookup=inactive id=${user.id}`);
        return;
      }

      await sendPasswordResetEmailForUser(user, { resetSecret });
      logger.info(`[forgotPassword] email_send=success id=${user.id}`);
    } catch (err) {
      logger.error(`[forgotPassword] background_error: ${String(err?.message || err)}`, { stack: err?.stack });
    }
  });
};

/**
 * @desc    Reset password using token from email
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  let transaction = null;
  try {
    const { token, newPassword } = req.body;
    const resetToken = typeof token === 'string' ? token.trim() : '';

    if (!resetToken || typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    try {
      getPasswordResetSecret();
    } catch (secretError) {
      return res.status(500).json({
        success: false,
        message: 'Password reset is not configured'
      });
    }

    // Compute HMAC hash of provided token for O(1) indexed lookup
    const hashedToken = hashPasswordResetToken(resetToken);

    // Reject weak passwords before locking the one-time credential.
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.success) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    const User = getUser();
    transaction = await sequelize.transaction();
    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: new Date() },
        isActive: true
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!user) {
      await transaction.rollback();
      transaction = null;
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password (model beforeUpdate hook hashes it)
    // Clear reset/claim state, complete credential handoff, and revoke active sessions.
    await user.update({
      password: newPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      refreshTokenHash: null,
      forcePasswordChange: false,
      accountStatus: 'active',
      claimTokenHash: null,
      claimTokenExpires: null
    }, { transaction });

    await transaction.commit();
    transaction = null;

    logger.info(`Password reset successful for user ID ${user.id}`);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    });
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        logger.error('Reset password rollback error:', { error: rollbackError.message });
      }
    }
  } catch (error) {
    logger.error('Reset password error:', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Server error during password reset'
    });
  }
};
