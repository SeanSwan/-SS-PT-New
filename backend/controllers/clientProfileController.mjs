/**
 * Client Profile Controller
 * =========================
 * Focused controller for client-safe profile updates.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/PHASE-8-DASHBOARD-API-GAPS-BLUEPRINT.md
 *
 * Architecture Overview:
 * [Client UI] -> [clientDashboardRoutes] -> [clientProfileController] -> [User model]
 *
 * Database ERD:
 * USERS (id, firstName, lastName, email, phone, photo, preferences)
 *
 * Mermaid Sequence:
 * sequenceDiagram
 *   participant Client
 *   participant Routes
 *   participant Controller
 *   participant DB
 *   Client->>Routes: PATCH /api/client/profile
 *   Routes->>Controller: updateClientProfile
 *   Controller->>DB: UPDATE users (whitelist fields)
 *   DB-->>Controller: user
 *   Controller-->>Routes: { success, user }
 *   Routes-->>Client: 200 OK
 *
 * Security Model:
 * - clientOnly middleware enforced in routes
 * - Field whitelist blocks sensitive updates
 *
 * Error Handling:
 * - 400 no valid fields or invalid types
 * - 404 user not found
 * - 500 server errors
 */

import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

const ALLOWED_FIELDS = Object.freeze([
  'firstName',
  'lastName',
  'phone',
  'email',
  'photo',
  'preferences',
  'emergencyContact'
]);

// Error codes for structured error handling
const ERROR_CODES = Object.freeze({
  INVALID_ROLE: 'CLIENT_PROFILE_UPDATE_DENIED',
  FIELD_VALIDATION_FAILED: 'INVALID_PROFILE_DATA',
  USER_NOT_FOUND: 'PROFILE_UPDATE_TARGET_MISSING',
  NO_VALID_FIELDS: 'NO_VALID_PROFILE_FIELDS',
  DATABASE_ERROR: 'PROFILE_UPDATE_DATABASE_ERROR'
});

// Sanitize string inputs to prevent oversized data and trim whitespace
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().substring(0, 255); // Max 255 chars, trim whitespace
};

const isPlainObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const validateFieldTypes = (updates) => {
  const stringFields = ['firstName', 'lastName', 'phone', 'email', 'photo', 'emergencyContact'];
  const nullableStringFields = new Set(['phone', 'photo', 'emergencyContact']);
  for (const field of stringFields) {
    if (!Object.prototype.hasOwnProperty.call(updates, field)) {
      continue;
    }

    if (updates[field] === null) {
      if (nullableStringFields.has(field)) {
        continue;
      }
      return `Field ${field} cannot be null`;
    }

    if (typeof updates[field] !== 'string') {
      return `Field ${field} must be a string`;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'preferences') && !isPlainObject(updates.preferences)) {
    return 'Field preferences must be an object';
  }

  return null;
};

export const updateClientProfile = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'client') {
      logger.warn(`[${ERROR_CODES.INVALID_ROLE}] Access denied for user ${req.user?.id || 'unknown'}`);
      return res.status(403).json({
        success: false,
        errorCode: ERROR_CODES.INVALID_ROLE,
        message: 'Access denied: Client only'
      });
    }

    const updateData = req.body || {};

    // Sanitize string inputs before filtering
    const sanitizedData = Object.keys(updateData).reduce((obj, key) => {
      obj[key] = sanitizeString(updateData[key]);
      return obj;
    }, {});

    const filteredUpdateData = Object.keys(sanitizedData)
      .filter((key) => ALLOWED_FIELDS.includes(key))
      .reduce((obj, key) => {
        obj[key] = sanitizedData[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdateData).length === 0) {
      logger.warn(`[${ERROR_CODES.NO_VALID_FIELDS}] No valid fields provided`, { userId: req.user.id });
      return res.status(400).json({
        success: false,
        errorCode: ERROR_CODES.NO_VALID_FIELDS,
        message: 'No valid fields to update'
      });
    }

    const typeError = validateFieldTypes(filteredUpdateData);
    if (typeError) {
      logger.warn(`[${ERROR_CODES.FIELD_VALIDATION_FAILED}] ${typeError}`, { userId: req.user.id });
      return res.status(400).json({
        success: false,
        errorCode: ERROR_CODES.FIELD_VALIDATION_FAILED,
        message: typeError
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.error(`[${ERROR_CODES.USER_NOT_FOUND}] User not found`, { userId: req.user.id });
      return res.status(404).json({
        success: false,
        errorCode: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found'
      });
    }

    await user.update(filteredUpdateData);
    logger.info('Client profile updated successfully', {
      userId: user.id,
      updatedFields: Object.keys(filteredUpdateData)
    });

    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'refreshTokenHash'] }
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    logger.error(`[${ERROR_CODES.DATABASE_ERROR}] Error updating client profile`, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.DATABASE_ERROR,
      message: 'Failed to update profile: ' + error.message
    });
  }
};
