// backend/routes/adminRoutes.mjs
import express from 'express';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.mjs';
import userManagementController from '../controllers/userManagementController.mjs';

const router = express.Router();

// Protect all admin routes
router.use(authenticateToken);
router.use(authorizeAdmin);

// User management endpoints that actually exist
router.get('/users', userManagementController.getAllUsers);
router.put('/users/:id', userManagementController.updateUser);
router.post('/promote-client', userManagementController.promoteToClient);
router.post('/promote-admin', userManagementController.promoteToAdmin);

// TODO: Add these endpoints if needed:
// router.get('/users/:id', userManagementController.getUserById);
// router.delete('/users/:id', userManagementController.deleteUser);
// router.post('/users/:id/reset-password', userManagementController.resetUserPassword);

export default router;
