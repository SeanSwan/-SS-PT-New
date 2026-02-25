/**
 * Session RBAC Helper
 * ===================
 * Role-Based Access Control for session visibility and data sanitization.
 *
 * MindBody Parity: Enforces strict session visibility rules:
 * - Clients: See ONLY their own sessions (no other client data)
 * - Trainers: See ONLY sessions assigned to them
 * - Admin: Configurable scope (my schedule / all trainers)
 *
 * Security Model:
 * - Backend-enforced filtering (never trust frontend)
 * - PII minimization based on viewer role
 * - Busy slot abstraction for unauthorized viewers
 */

import { Op } from 'sequelize';
import logger from './logger.mjs';

/**
 * Admin View Scope Options
 */
export const ADMIN_VIEW_SCOPE = {
  MY_SCHEDULE: 'my',
  ALL_TRAINERS: 'global'
};

/**
 * Build WHERE clause for session visibility based on user role
 *
 * @param {Object} user - Authenticated user object
 * @param {Object} options - Additional filter options
 * @param {string} options.adminScope - 'my' or 'global' for admin users
 * @param {number} options.trainerId - Specific trainer filter (admin only)
 * @param {number} options.clientId - Specific client filter (admin only)
 * @returns {Object} Sequelize WHERE clause
 */
export function buildSessionVisibilityFilter(user, options = {}) {
  const { adminScope = 'global', trainerId, clientId } = options;
  const filter = {};

  if (!user || !user.id) {
    logger.warn('[RBAC] buildSessionVisibilityFilter called without valid user');
    // Return impossible filter to prevent data leak
    return { id: { [Op.eq]: null } };
  }

  switch (user.role) {
    case 'client':
      // SECURITY: Clients can ONLY see their own sessions
      // Removed { status: 'available' } to prevent data leak
      filter.userId = user.id;
      break;

    case 'trainer':
      // SECURITY: Trainers see only sessions assigned to them
      filter.trainerId = user.id;
      break;

    case 'admin':
      // Admin scope is configurable (MindBody parity)
      if (adminScope === ADMIN_VIEW_SCOPE.MY_SCHEDULE) {
        // "My Schedule" mode - admin sees only their own trainer sessions
        filter.trainerId = user.id;
      } else {
        // "Global" mode - admin sees all, with optional filters
        if (trainerId) {
          filter.trainerId = trainerId;
        }
        if (clientId) {
          filter.userId = clientId;
        }
      }
      break;

    default:
      // Unknown role - deny all access
      logger.warn(`[RBAC] Unknown role: ${user.role}`);
      return { id: { [Op.eq]: null } };
  }

  logger.debug(`[RBAC] Built visibility filter for ${user.role} (id: ${user.id}):`, filter);
  return filter;
}

/**
 * Determine which client fields are visible based on viewer role and relationship
 *
 * @param {Object} viewer - User viewing the session
 * @param {Object} session - Session being viewed
 * @returns {Array} List of allowed client attributes
 */
export function getClientAttributesForRole(viewer, session = null) {
  if (!viewer) return [];

  switch (viewer.role) {
    case 'admin':
      // Admin sees full client details
      return ['id', 'firstName', 'lastName', 'email', 'phone', 'photo'];

    case 'trainer':
      // Trainer sees name and photo only (no contact info unless assigned)
      // Contact info only if this is their assigned client
      if (session && session.trainerId === viewer.id) {
        return ['id', 'firstName', 'lastName', 'email', 'phone', 'photo'];
      }
      return ['id', 'firstName', 'lastName', 'photo'];

    case 'client':
      // Clients never see other client details
      return [];

    default:
      return [];
  }
}

/**
 * Get trainer attributes visible to the viewer
 *
 * @param {Object} viewer - User viewing the session
 * @returns {Array} List of allowed trainer attributes
 */
export function getTrainerAttributesForRole(viewer) {
  if (!viewer) return [];

  // Trainer info is generally public (name, photo, specialties)
  // Email/phone hidden from clients
  switch (viewer.role) {
    case 'admin':
      return ['id', 'firstName', 'lastName', 'email', 'photo', 'bio', 'specialties'];
    case 'trainer':
      return ['id', 'firstName', 'lastName', 'email', 'photo', 'bio', 'specialties'];
    case 'client':
      return ['id', 'firstName', 'lastName', 'photo', 'bio', 'specialties'];
    default:
      return ['id', 'firstName', 'lastName'];
  }
}

/**
 * Sanitize a session object based on viewer's role
 * Removes or masks PII that the viewer shouldn't see
 *
 * @param {Object} session - Session object to sanitize
 * @param {Object} viewer - User viewing the session
 * @returns {Object} Sanitized session
 */
export function sanitizeSessionForRole(session, viewer) {
  if (!session || !viewer) return null;

  const sessionData = session.get ? session.get({ plain: true }) : { ...session };

  // Client viewing - ensure they only see their own session data
  if (viewer.role === 'client') {
    // If this is not their session, return minimal "busy slot" info
    if (sessionData.userId !== viewer.id) {
      logger.warn(`[RBAC] Client ${viewer.id} attempted to access session ${sessionData.id} belonging to user ${sessionData.userId}`);
      return {
        id: sessionData.id,
        sessionDate: sessionData.sessionDate,
        duration: sessionData.duration,
        status: 'busy', // Abstract status
        isBlocked: true,
        // No PII
      };
    }
    // Their session - include trainer info but sanitize
    if (sessionData.trainer) {
      delete sessionData.trainer.email;
      delete sessionData.trainer.phone;
    }
    // Remove other client info if somehow included
    if (sessionData.client && sessionData.client.id !== viewer.id) {
      delete sessionData.client;
    }
  }

  // Trainer viewing - only see their assigned sessions
  if (viewer.role === 'trainer') {
    if (sessionData.trainerId !== viewer.id) {
      logger.warn(`[RBAC] Trainer ${viewer.id} attempted to access session ${sessionData.id} assigned to trainer ${sessionData.trainerId}`);
      return {
        id: sessionData.id,
        sessionDate: sessionData.sessionDate,
        duration: sessionData.duration,
        status: 'busy',
        isBlocked: true,
      };
    }
    // Their session - full access to client info
  }

  return sessionData;
}

/**
 * Check if a user can view a specific session
 *
 * @param {Object} viewer - User attempting to view
 * @param {Object} session - Session being accessed
 * @returns {boolean} Whether access is allowed
 */
export function canViewSession(viewer, session) {
  if (!viewer || !session) return false;

  switch (viewer.role) {
    case 'admin':
      return true; // Admins can view all
    case 'trainer':
      return session.trainerId === viewer.id;
    case 'client':
      return session.userId === viewer.id;
    default:
      return false;
  }
}

/**
 * Check if a user can modify a specific session
 *
 * @param {Object} viewer - User attempting to modify
 * @param {Object} session - Session being modified
 * @returns {boolean} Whether modification is allowed
 */
export function canModifySession(viewer, session) {
  if (!viewer || !session) return false;

  switch (viewer.role) {
    case 'admin':
      return true; // Admins can modify all
    case 'trainer':
      return session.trainerId === viewer.id;
    case 'client':
      // Clients can only cancel their own future sessions
      return session.userId === viewer.id &&
             session.status !== 'completed' &&
             new Date(session.sessionDate) > new Date();
    default:
      return false;
  }
}

export default {
  ADMIN_VIEW_SCOPE,
  buildSessionVisibilityFilter,
  getClientAttributesForRole,
  getTrainerAttributesForRole,
  sanitizeSessionForRole,
  canViewSession,
  canModifySession
};
