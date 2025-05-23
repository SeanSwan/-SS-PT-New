/**
 * auth.mjs
 * 
 * Simplified import point for authentication middleware functions.
 * This file re-exports functions from authMiddleware.mjs to maintain
 * backwards compatibility with existing imports.
 */

import { 
  protect, 
  adminOnly,
  trainerOnly,
  clientOnly,
  trainerOrAdminOnly,
  ownerOrAdminOnly,
  checkTrainerClientRelationship,
  rateLimiter,
  authorize
} from './authMiddleware.mjs';

// Export authenticateToken as an alias for protect
export const authenticateToken = protect;

// Export authorizeAdmin as an alias for adminOnly
export const authorizeAdmin = adminOnly;

// Export other middleware functions
export {
  protect,
  adminOnly,
  trainerOnly,
  clientOnly,
  trainerOrAdminOnly,
  ownerOrAdminOnly,
  checkTrainerClientRelationship,
  rateLimiter,
  authorize
};

// Default export with all functions
export default {
  authenticateToken,
  authorizeAdmin,
  protect,
  adminOnly,
  trainerOnly,
  clientOnly,
  trainerOrAdminOnly,
  ownerOrAdminOnly,
  checkTrainerClientRelationship,
  rateLimiter,
  authorize
};
