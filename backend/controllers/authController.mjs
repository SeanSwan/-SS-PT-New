// backend/controllers/authController.mjs
import logger from '../utils/logger.mjs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.mjs';
import sequelize, { Op } from '../database.mjs';
import dotenv from 'dotenv';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

dotenv.config();

/**
 * Security Constants - Consider moving these to a config file
 */
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '3h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const PASSWORD_MIN_LENGTH = 8;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds

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
    process.env.JWT_SECRET, 
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
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, 
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
    updatedAt: user.updatedAt
  };

  // Only include additional fields if they exist
  if (user.fitnessGoal) sanitized.fitnessGoal = user.fitnessGoal;
  if (user.trainingExperience) sanitized.trainingExperience = user.trainingExperience;
  if (user.specialties) sanitized.specialties = user.specialties;
  if (user.lastActive) sanitized.lastActive = user.lastActive;

  return sanitized;
};

/**
 * @desc    Check if user is rate limited
 * @param   {String} identifier - IP address or username
 * @returns {Boolean} True if rate limited, false otherwise
 */
const isRateLimited = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier) || [];
  
  // Filter out attempts older than the window
  const recentAttempts = attempts.filter(
    timestamp => now - timestamp < LOGIN_ATTEMPT_WINDOW
  );
  
  // Update the attempt list
  loginAttempts.set(identifier, recentAttempts);
  
  // Check if rate limited
  return recentAttempts.length >= LOGIN_ATTEMPT_LIMIT;
};

/**
 * @desc    Record a login attempt
 * @param   {String} identifier - IP address or username
 */
const recordLoginAttempt = (identifier) => {
  const attempts = loginAttempts.get(identifier) || [];
  attempts.push(Date.now());
  loginAttempts.set(identifier, attempts);
};

/**
 * @desc    Validate password strength
 * @param   {String} password - Password to validate
 * @returns {Object} Validation result with success and message
 */
const validatePasswordStrength = (password) => {
  // Check length
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return { 
      success: false, 
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long` 
    };
  }
  
  // Check for mix of character types (can be enhanced further)
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!(hasUppercase && hasLowercase && hasNumbers)) {
    return {
      success: false,
      message: 'Password must include uppercase letters, lowercase letters, and numbers'
    };
  }
  
  if (!hasSpecialChars) {
    return {
      success: false,
      message: 'Password should include at least one special character for better security'
    };
  }
  
  return { success: true };
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
    console.log('Registration request body:', JSON.stringify(req.body, null, 2));
    
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await transaction.rollback();
      logger.warn(`Registration attempt with invalid email format: ${email}`);
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
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email },
          { username }
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

    // Extract role and adminCode from request body
    const { role = 'user', adminCode } = req.body;
    
    // Validate admin role requires a valid admin code
    if (role === 'admin') {
      if (!adminCode) {
        await transaction.rollback();
        logger.warn('Admin registration attempt without admin code');
        return res.status(400).json({
          success: false,
          message: 'Admin access code is required for admin registration'
        });
      }
      
      if (adminCode !== process.env.ADMIN_ACCESS_CODE) {
        await transaction.rollback();
        logger.warn('Admin registration attempt with incorrect admin code');
        return res.status(400).json({
          success: false,
          message: 'Invalid admin access code'
        });
      }
      
      // Log successful admin code verification
      logger.info('Valid admin code provided for admin registration');
    }
    
    // Create new user
    const user = await User.create(
      {
        firstName,
        lastName,
        email,
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
        lastActive: new Date(),
        registrationIP: req.ip // Store IP for security monitoring (make sure your Express app has trust proxy enabled)
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

    logger.info(`New user registered successfully: ${username}`);

    // Return user data and token
    res.status(201).json({
      success: true,
      user: sanitizeUser(user),
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
    
    console.error('DETAILED REGISTRATION ERROR:', { 
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      transaction: transaction ? true : false
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
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    console.log('LOGIN REQUEST BODY:', JSON.stringify(req.body, null, 2).replace(/"password":"[^"]+"/, '"password":"***"'));
    const { username, password } = req.body;
    const ipAddress = req.ip;
    
    // Input validation
    if (!username || !password) {
      logger.warn('Login attempt with missing credentials');
      return res.status(400).json({ 
        success: false,
        message: 'Please provide username and password' 
      });
    }

    // Rate limiting by IP and username
    if (isRateLimited(ipAddress) || isRateLimited(username)) {
      logger.warn(`Rate limited login attempt for ${username} from ${ipAddress}`);
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again later.'
      });
    }

    // Log attempt for rate limiting
    recordLoginAttempt(ipAddress);
    recordLoginAttempt(username);

    // Find the user
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username },
          { email: username } // Allow login with email too
        ]
      }
    });

    if (!user) {
      logger.info(`Login attempt for non-existent user: ${username}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logger.warn(`Login attempt on locked account: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Account is locked. Please contact support.'
      });
    }

    // Check password
    const isMatch = await user.checkPassword(password);
    
    if (!isMatch) {
      // Increment failed attempts
      await user.update({
        failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
        // Lock account after 10 failed attempts
        isLocked: (user.failedLoginAttempts || 0) >= 9
      });

      logger.warn(`Failed login attempt for user: ${username}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Reset failed attempts and update login info
    await user.update({
      failedLoginAttempts: 0,
      lastLogin: new Date(),
      lastActive: new Date(),
      lastLoginIP: req.ip,
      refreshTokenHash: await bcrypt.hash(refreshToken, 10)
    });

    logger.info(`Successful login for user: ${username}, role: ${user.role}`);

    // Return user data and tokens
    res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      token: accessToken,
      refreshToken: refreshToken
    });
  } catch (error) {
    logger.error('Login error:', { error: error.message, stack: error.stack });
    // Provide more helpful error information in development
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { error: error.message, stack: error.stack, type: error.name } 
      : undefined;
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      debug: errorDetails
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
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Check token type
    if (decoded.tokenType !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
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
    
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      user: sanitizeUser(user)
    });
  } catch (error) {
    logger.error('Profile fetch error:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      const existingEmail = await User.findOne({
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
      user: sanitizeUser(user)
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
      message: 'Server error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token type
    if (decoded.tokenType !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }
    
    // Find user by ID
    const user = await User.findByPk(decoded.id, {
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

    // Return user data
    res.status(200).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    logger.error('Token validation error:', { error: error.message, stack: error.stack });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Invalid token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      user: sanitizeUser(user)
    });
  } catch (error) {
    logger.error('Get user by ID error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Server error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const user = await User.findByPk(req.user.id);
    return successResponse(res, sanitizeUser(user), 'User profile retrieved successfully');
  } catch (error) {
    logger.error('Error fetching user profile:', { error: error.message, stack: error.stack });
    return errorResponse(res, 'Failed to retrieve user profile', 500);
  }
};