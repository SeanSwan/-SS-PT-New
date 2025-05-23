/**
 * Role Management Service
 * Handles user role upgrades and role logic for SwanStudios platform
 */

import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

/**
 * @desc    Upgrade user role from 'user' to 'client' when they purchase training
 * @param   {String} userId - User ID to upgrade
 * @returns {Promise<Boolean>} Success status
 */
export const upgradeToClient = async (userId) => {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      logger.error(`Attempt to upgrade non-existent user: ${userId}`);
      return false;
    }
    
    // Only upgrade if user is currently a 'user'
    if (user.role === 'user') {
      await user.update({ 
        role: 'client',
        updatedAt: new Date()
      });
      
      logger.info(`User ${userId} upgraded from 'user' to 'client'`);
      return true;
    }
    
    // Already a client or higher role
    logger.info(`User ${userId} already has role '${user.role}', no upgrade needed`);
    return true;
  } catch (error) {
    logger.error('Error upgrading user to client:', {
      userId,
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * @desc    Check if user has access to specific dashboard
 * @param   {Object} user - User object
 * @param   {String} dashboard - Dashboard type (admin, trainer, client, user)
 * @returns {Boolean} Access status
 */
export const hasAccessToDashboard = (user, dashboard) => {
  if (!user || !user.role) return false;
  
  // Admin has access to everything
  if (user.role === 'admin') return true;
  
  switch (dashboard) {
    case 'admin':
      return user.role === 'admin';
    case 'trainer':
      return ['admin', 'trainer'].includes(user.role);
    case 'client':
      return ['admin', 'trainer', 'client'].includes(user.role);
    case 'user':
      return true; // All authenticated users have access to user dashboard
    default:
      return false;
  }
};

/**
 * @desc    Get user's accessible dashboards
 * @param   {Object} user - User object
 * @returns {Array} Array of accessible dashboard names
 */
export const getAccessibleDashboards = (user) => {
  if (!user || !user.role) return ['user'];
  
  const dashboards = ['user']; // Everyone has user dashboard access
  
  if (user.role === 'client' || user.role === 'trainer' || user.role === 'admin') {
    dashboards.push('client');
  }
  
  if (user.role === 'trainer' || user.role === 'admin') {
    dashboards.push('trainer');
  }
  
  if (user.role === 'admin') {
    dashboards.push('admin');
  }
  
  return dashboards;
};

/**
 * @desc    Validate role transition
 * @param   {String} currentRole - Current user role
 * @param   {String} newRole - Desired new role
 * @returns {Boolean} Whether transition is allowed
 */
export const isValidRoleTransition = (currentRole, newRole) => {
  // Role hierarchy: user -> client -> trainer -> admin
  const roleHierarchy = {
    'user': 0,
    'client': 1,
    'trainer': 2,
    'admin': 3
  };
  
  const currentLevel = roleHierarchy[currentRole] || 0;
  const newLevel = roleHierarchy[newRole] || 0;
  
  // Can only upgrade role, not downgrade (except for admin operations)
  return newLevel >= currentLevel;
};

export default {
  upgradeToClient,
  hasAccessToDashboard,
  getAccessibleDashboards,
  isValidRoleTransition
};