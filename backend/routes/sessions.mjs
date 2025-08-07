/**
 * sessions.mjs - Unified Session Routes (Phase 1: Backend Harmonization)
 * =====================================================================
 * Express routes for comprehensive session management using the unified service
 * 
 * ARCHITECTURAL TRANSFORMATION:
 * ✅ Direct service integration (no fragmented controllers)
 * ✅ Role-based middleware protection at route level
 * ✅ Transactional integrity through unified service
 * ✅ Consistent error handling and response formatting
 * ✅ Consolidated session lifecycle management
 * 
 * REPLACES:
 * - enhancedScheduleRoutes.mjs (Enhanced operations)
 * - scheduleRoutes.mjs (Basic operations)
 * 
 * CONSOLIDATES ENDPOINTS:
 * - Session CRUD operations
 * - Session booking and lifecycle management
 * - Session allocation from orders
 * - Statistics and reporting
 * - User management (trainers/clients)
 */

import express from "express";
import { protect, adminOnly, trainerOrAdminOnly } from "../middleware/authMiddleware.mjs";
import unifiedSessionService from "../services/sessions/session.service.mjs";
import logger from '../utils/logger.mjs';

const router = express.Router();

// ==================== CORE SESSION CRUD OPERATIONS ====================

/**
 * GET /api/sessions
 * Get all sessions with role-based filtering
 */
router.get("/", protect, async (req, res) => {
  try {
    const sessions = await unifiedSessionService.getAllSessions(req.query, req.user);
    
    return res.status(200).json(sessions);
  } catch (error) {
    logger.error('Error in GET /api/sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching sessions',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/stats
 * Get schedule statistics with role-based data
 */
router.get("/stats", protect, async (req, res) => {
  try {
    const result = await unifiedSessionService.getScheduleStats(req.user);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in GET /api/sessions/stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:id
 * Get a single session by ID with role-based access control
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const session = await unifiedSessionService.getSessionById(req.params.id, req.user);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    logger.error(`Error in GET /api/sessions/${req.params.id}:`, error);
    
    // Handle permission errors
    if (error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error fetching session',
      error: error.message
    });
  }
});

// ==================== SESSION CREATION (ADMIN ONLY) ====================

/**
 * POST /api/sessions
 * Create available session slots (admin only)
 */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { sessions } = req.body;
    
    if (!sessions) {
      return res.status(400).json({
        success: false,
        message: 'Sessions array is required in request body'
      });
    }
    
    const createdSessions = await unifiedSessionService.createAvailableSessions(sessions, req.user);
    
    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdSessions.length} available session slots`,
      sessions: createdSessions
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions:', error);
    
    // Handle validation errors
    if (error.message.includes('Admin privileges required') || error.message.includes('Invalid request')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('must include') || error.message.includes('Cannot create')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error creating sessions',
      error: error.message
    });
  }
});

/**
 * POST /api/sessions/recurring
 * Create recurring sessions (admin only)
 */
router.post("/recurring", protect, adminOnly, async (req, res) => {
  try {
    const result = await unifiedSessionService.createRecurringSessions(req.body, req.user);
    
    return res.status(201).json(result);
  } catch (error) {
    logger.error('Error in POST /api/sessions/recurring:', error);
    
    // Handle validation errors
    if (error.message.includes('Admin privileges required')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Missing required') || error.message.includes('must be') || 
        error.message.includes('Invalid') || error.message.includes('No valid')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error creating recurring sessions',
      error: error.message
    });
  }
});

// ==================== SESSION LIFECYCLE MANAGEMENT ====================

/**
 * POST /api/sessions/:id/book
 * Book an available session
 */
router.post("/:id/book", protect, async (req, res) => {
  try {
    const result = await unifiedSessionService.bookSession(req.params.id, req.user, req.body);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in POST /api/sessions/${req.params.id}/book:`, error);
    
    // Handle booking-specific errors
    if (error.message.includes('not available') || error.message.includes('in the past') || 
        error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error booking session',
      error: error.message
    });
  }
});

/**
 * PATCH /api/sessions/:id/cancel
 * Cancel a session
 */
router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await unifiedSessionService.cancelSession(req.params.id, req.user, reason);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/cancel:`, error);
    
    // Handle cancellation-specific errors
    if (error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling session',
      error: error.message
    });
  }
});

/**
 * PATCH /api/sessions/:id/confirm
 * Confirm a session (admin/trainer only)
 */
router.patch("/:id/confirm", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const result = await unifiedSessionService.confirmSession(req.params.id, req.user);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/confirm:`, error);
    
    // Handle confirmation-specific errors
    if (error.message.includes('privileges required') || error.message.includes('can only confirm')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Only scheduled')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error confirming session',
      error: error.message
    });
  }
});

/**
 * PATCH /api/sessions/:id/complete
 * Mark a session as completed (admin/trainer only)
 */
router.patch("/:id/complete", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { notes } = req.body;
    const result = await unifiedSessionService.completeSession(req.params.id, req.user, notes);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/complete:`, error);
    
    // Handle completion-specific errors
    if (error.message.includes('privileges required') || error.message.includes('can only complete')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Only confirmed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error completing session',
      error: error.message
    });
  }
});

/**
 * PATCH /api/sessions/:id/assign
 * Assign a trainer to a session (admin only)
 */
router.patch("/:id/assign", protect, adminOnly, async (req, res) => {
  try {
    const { trainerId } = req.body;
    
    if (!trainerId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }
    
    const result = await unifiedSessionService.assignTrainer(req.params.id, trainerId, req.user);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/assign:`, error);
    
    // Handle assignment-specific errors
    if (error.message.includes('Admin privileges required')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('required')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error assigning trainer',
      error: error.message
    });
  }
});

// ==================== SESSION ALLOCATION FROM ORDERS ====================

/**
 * POST /api/sessions/allocate
 * Allocate sessions from completed order (admin only for manual allocation)
 */
router.post("/allocate", protect, adminOnly, async (req, res) => {
  try {
    const { orderId, userId } = req.body;
    
    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and User ID are required'
      });
    }
    
    const result = await unifiedSessionService.allocateSessionsFromOrder(orderId, userId);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in POST /api/sessions/allocate:', error);
    
    if (error.message.includes('not found') || error.message.includes('not completed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error allocating sessions',
      error: error.message
    });
  }
});

// ==================== USER MANAGEMENT FOR DROPDOWNS ====================

/**
 * GET /api/sessions/users/trainers
 * Get all trainers for dropdown selection
 */
router.get("/users/trainers", protect, async (req, res) => {
  try {
    const trainers = await unifiedSessionService.getTrainers();
    
    return res.status(200).json(trainers);
  } catch (error) {
    logger.error('Error in GET /api/sessions/users/trainers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching trainers',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/users/clients
 * Get all clients for dropdown selection (admin/trainer only)
 */
router.get("/users/clients", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const clients = await unifiedSessionService.getClients(req.user);
    
    return res.status(200).json(clients);
  } catch (error) {
    logger.error('Error in GET /api/sessions/users/clients:', error);
    
    if (error.message.includes('privileges required')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error fetching clients',
      error: error.message
    });
  }
});

// ==================== SERVICE HEALTH CHECK ====================

/**
 * GET /api/sessions/health
 * Health check for the unified session service
 */
router.get("/health", async (req, res) => {
  try {
    const health = await unifiedSessionService.healthCheck();
    
    return res.status(200).json(health);
  } catch (error) {
    logger.error('Error in GET /api/sessions/health:', error);
    return res.status(500).json({
      service: 'UnifiedSessionService',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
