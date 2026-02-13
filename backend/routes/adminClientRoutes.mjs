/**
 * Admin Client Management Routes (Admin-Only)
 * =============================================
 *
 * Purpose: REST API routes for admin-only client management operations
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Admin Dashboard
 *
 * Base Path: /api/admin
 *
 * Architecture Overview:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Admin Client   │─────▶│  Express Routes  │─────▶│  Admin Client   │
 * │  Dashboard      │      │  (this file)     │      │  Controller     │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *                                   │
 *                                   │ (middleware)
 *                                   ▼
 *                          ┌──────────────────┐
 *                          │  protect +       │
 *                          │  authorize       │
 *                          │  (['admin'])     │
 *                          └──────────────────┘
 *
 * Middleware Flow (Global Route Protection):
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
 *   │ router.use()    │──────▶│ protect middleware │
 *   │ (global)        │       │ Verify JWT         │
 *   └─────────────────┘       └────────────────────┘
 *         │
 *         ▼
 *   ┌─────────────────┐       ┌────────────────────┐
 *   │ router.use()    │──────▶│ authorize(['admin'])│
 *   │ (global)        │       │ Check role = admin │
 *   └─────────────────┘       └────────────────────┘
 *         │
 *         ├───────────────┐
 *         │               │
 *         ▼               ▼
 *   (not admin)     (is admin)
 *         │               │
 *         ▼               ▼
 *   403 Forbidden   Controller → 200 OK
 *
 * API Endpoints (10 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD  ENDPOINT                                        AUTH      PURPOSE                │
 * ├──────────────────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /clients                                        Admin     List all clients       │
 * │ GET     /clients/:clientId                              Admin     Get client details     │
 * │ POST    /clients                                        Admin     Create new client      │
 * │ PUT     /clients/:clientId                              Admin     Update client          │
 * │ DELETE  /clients/:clientId                              Admin     Soft delete client     │
 * │ POST    /clients/:clientId/reset-password               Admin     Reset client password  │
 * │ POST    /clients/:clientId/assign-trainer               Admin     Assign trainer         │
 * │ GET     /clients/:clientId/workout-stats                Admin     Get workout analytics  │
 * │ POST    /clients/:clientId/generate-workout-plan        Admin     Generate AI workout    │
 * │ GET     /mcp-status                                     Admin     Check MCP servers      │
 * └──────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Route Groups:
 *
 * 1. Client CRUD (5 routes):
 *    - GET /clients - List with pagination/filtering
 *    - GET /clients/:clientId - Single client details
 *    - POST /clients - Create new client account
 *    - PUT /clients/:clientId - Update client profile
 *    - DELETE /clients/:clientId - Soft delete (set isActive=false)
 *
 * 2. Client-Specific Actions (2 routes):
 *    - POST /clients/:clientId/reset-password - Admin password reset
 *    - POST /clients/:clientId/assign-trainer - Assign trainer to client
 *
 * 3. MCP Integration (2 routes):
 *    - GET /clients/:clientId/workout-stats - Fetch workout analytics from MCP
 *    - POST /clients/:clientId/generate-workout-plan - Generate AI workout plan
 *
 * 4. System Monitoring (1 route):
 *    - GET /mcp-status - Check health of MCP servers
 *
 * Request/Response Flow (Mermaid):
 * ```mermaid
 * sequenceDiagram
 *     participant A as Admin Dashboard
 *     participant R as Express Router
 *     participant P as protect middleware
 *     participant Auth as authorize(['admin'])
 *     participant C as AdminClientController
 *
 *     A->>R: GET /api/admin/clients
 *     R->>P: Global middleware (router.use)
 *     P->>P: Verify JWT token
 *
 *     alt Invalid/missing token
 *         P-->>A: 401 Unauthorized
 *     else Valid token
 *         P->>Auth: Check user role
 *
 *         alt Not admin
 *             Auth-->>A: 403 Forbidden
 *         else Is admin
 *             Auth->>C: getClients(req, res)
 *             C-->>A: 200 OK + clients list
 *         end
 *     end
 * ```
 *
 * Authentication Strategy:
 *
 * Global Middleware (router.use):
 * - protect: Verifies JWT token for ALL routes in this router
 * - authorize(['admin']): Checks req.user.role === 'admin' for ALL routes
 * - Applied before any route handlers execute
 * - Reduces code duplication (no need to repeat middleware on each route)
 *
 * Request Context:
 * - req.user = { id, role, username, email } (set by protect middleware)
 * - Used in controller to track which admin performed action
 * - Logged for compliance (audit trail)
 *
 * Error Responses:
 *
 * 401 Unauthorized - Missing/invalid JWT (protect middleware)
 * {
 *   success: false,
 *   message: "Not authorized, no token"
 * }
 *
 * 403 Forbidden - Not admin (authorize middleware)
 * {
 *   success: false,
 *   message: "Access denied: Must have one of these roles: admin"
 * }
 *
 * 404 Not Found - Client not found (controller)
 * {
 *   success: false,
 *   message: "Client not found"
 * }
 *
 * 500 Internal Server Error - Database/server error (controller)
 * {
 *   success: false,
 *   message: "Error fetching clients",
 *   error: "..."
 * }
 *
 * Security Model:
 * - ALL routes require authentication (protect middleware)
 * - ALL routes require admin role (authorize(['admin']) middleware)
 * - No public endpoints in this router
 * - Global middleware prevents accidental unprotected routes
 * - Principle of least privilege: Only admins can manage clients
 *
 * Business Logic:
 *
 * WHY Global Middleware (router.use) Instead of Per-Route?
 * - Code simplification: Single declaration protects all routes
 * - Prevents human error: Can't forget to add middleware to new routes
 * - Clear intent: File header states "Admin-Only" explicitly
 * - Performance: No difference (middleware executes before route matching)
 * - Maintainability: Easier to audit security (1 line vs 10 lines)
 *
 * WHY authorize(['admin']) Instead of adminOnly?
 * - Flexibility: Can add more roles later (authorize(['admin', 'superadmin']))
 * - Consistency: Same middleware pattern as other route files
 * - Future-proof: Role hierarchy changes don't require refactor
 * - Clear syntax: authorize(['admin']) is self-documenting
 *
 * WHY Separate Routes for Actions (reset-password, assign-trainer)?
 * - RESTful design: Actions are not pure CRUD operations
 * - Clear intent: POST /clients/:id/reset-password vs PUT /clients/:id (ambiguous)
 * - Audit logging: Easier to track specific admin actions
 * - Validation: Different schemas for different actions
 *
 * WHY MCP Routes in Admin Section?
 * - Admin oversight: Only admins should trigger MCP operations
 * - Cost control: MCP calls may use external APIs (OpenAI, etc.)
 * - Data privacy: Workout stats may contain sensitive health data
 * - Testing: Admins can test MCP integration without client involvement
 *
 * WHY Include MCP Status Route?
 * - System monitoring: Admins need to know if MCP servers are down
 * - Debugging: Helps diagnose client-reported issues
 * - Proactive alerts: Frontend can show warning if MCP unavailable
 * - No client_id required: System-wide health check
 *
 * Usage Examples:
 *
 * // List clients with pagination
 * GET /api/admin/clients?page=1&limit=10&search=john&status=active
 *
 * // Get detailed client profile
 * GET /api/admin/clients/abc-123-def
 *
 * // Create new client account
 * POST /api/admin/clients
 * Body: { firstName, lastName, email, username, password, role: 'client' }
 *
 * // Reset forgotten password
 * POST /api/admin/clients/abc-123-def/reset-password
 * Body: { newPassword: "TempPass123!" }
 *
 * // Assign trainer to client
 * POST /api/admin/clients/abc-123-def/assign-trainer
 * Body: { trainerId: "xyz-456-ghi" }
 *
 * // Check MCP server health
 * GET /api/admin/mcp-status
 *
 * Performance Considerations:
 * - Global middleware overhead: ~5-10ms per request (JWT verify + role check)
 * - No caching: Each request validates token fresh (security > performance)
 * - Route matching: Express router optimized for 10-20 routes (no bottleneck)
 * - Controller delegation: All heavy logic in controller (routes are thin)
 *
 * Dependencies:
 * - express: Router and middleware framework
 * - authMiddleware: protect (JWT verify), authorize (role check)
 * - adminClientController: All business logic for client management
 *
 * Route Registration:
 * - Imported in backend/server.mjs as: app.use('/api/admin', adminClientRoutes)
 * - Full URLs: https://api.example.com/api/admin/clients/...
 *
 * Testing:
 * - Unit tests: backend/tests/adminClientRoutes.test.mjs
 * - Test cases:
 *   - ✅ GET /clients without token → 401 Unauthorized
 *   - ✅ GET /clients as non-admin → 403 Forbidden
 *   - ✅ GET /clients as admin → 200 OK
 *   - ✅ POST /clients creates new client → 201 Created
 *   - ✅ DELETE /clients/:id soft deletes → 200 OK
 *   - ✅ POST /reset-password generates new password → 200 OK
 *   - ✅ GET /mcp-status returns MCP health → 200 OK
 *
 * Future Enhancements:
 * - Add bulk operations endpoint (POST /clients/bulk-update)
 * - Add export endpoint (GET /clients/export?format=csv)
 * - Add webhook endpoints for third-party integrations
 * - Add versioning (GET /api/v2/admin/clients)
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

// backend/routes/adminClientRoutes.mjs
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import adminClientController from '../controllers/adminClientController.mjs';
import { createNotification } from '../controllers/notificationController.mjs';
import { getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// Protect all admin routes (global middleware)
router.use(protect);
router.use(authorize(['admin']));

// Client management routes
router.get('/clients', adminClientController.getClients);
router.get('/clients/:clientId', adminClientController.getClientDetails);
router.post('/clients', adminClientController.createClient);
router.put('/clients/:clientId', adminClientController.updateClient);
router.delete('/clients/:clientId', adminClientController.deleteClient);

// Client-specific actions
router.post('/clients/:clientId/reset-password', adminClientController.resetClientPassword);
router.post('/clients/:clientId/assign-trainer', adminClientController.assignTrainer);

/**
 * POST /api/admin/clients/:clientId/notify
 * Send a custom in-app notification to a client
 */
router.post('/clients/:clientId/notify', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { title, message, type = 'admin' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'title and message are required'
      });
    }

    // Verify client exists
    const User = getUser();
    const client = await User.findOne({
      where: { id: clientId, role: 'client' }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const result = await createNotification({
      userId: parseInt(clientId),
      title,
      message,
      type,
      senderId: req.user.id
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create notification'
      });
    }

    logger.info(`Admin ${req.user.id} sent notification to client ${clientId}: "${title}"`);

    return res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: { notificationId: result.notification?.id }
    });
  } catch (error) {
    logger.error('Error sending admin notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message
    });
  }
});

// P0: Billing & Sessions overview
router.get('/clients/:clientId/billing-overview', adminClientController.getBillingOverview);

// MCP integration routes
router.get('/clients/:clientId/workout-stats', adminClientController.getClientWorkoutStats);
router.post('/clients/:clientId/generate-workout-plan', adminClientController.generateWorkoutPlan);

// System monitoring
router.get('/mcp-status', adminClientController.getMCPStatus);

export default router;
