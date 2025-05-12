// backend/routes/adminRoutes.mjs
import express from 'express';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.mjs';
import userManagementController from '../controllers/userManagementController.mjs';
import sessionSyncController from '../controllers/sessionSyncController.mjs';
import progressSyncController from '../controllers/progressSyncController.mjs';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(authorizeAdmin);

// User management endpoints
router.get('/users', userManagementController.getAllUsers);
router.get('/users/:id', userManagementController.getUserById);
router.put('/users/:id', userManagementController.updateUser);
router.delete('/users/:id', userManagementController.deleteUser);
router.post('/users/:id/reset-password', userManagementController.resetUserPassword);

// Session synchronization endpoints
router.post('/sync-sessions', sessionSyncController.syncSessions);
router.get('/check-dashboard-consistency', sessionSyncController.checkDashboardConsistency);

// Progress synchronization endpoints
router.post('/sync-client-progress', progressSyncController.syncClientProgress);
router.post('/verify-progress-integration', progressSyncController.verifyProgressIntegration);
router.post('/update-achievements', progressSyncController.updateAchievements);
router.post('/refresh-client-progress/:clientId', progressSyncController.refreshClientProgress);

export default router;