// backend/routes/adminClientRoutes.mjs
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import adminClientController from '../controllers/adminClientController.mjs';

const router = express.Router();

// Protect all admin routes
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

// MCP integration routes
router.get('/clients/:clientId/workout-stats', adminClientController.getClientWorkoutStats);
router.post('/clients/:clientId/generate-workout-plan', adminClientController.generateWorkoutPlan);

// System monitoring
router.get('/mcp-status', adminClientController.getMCPStatus);

export default router;
