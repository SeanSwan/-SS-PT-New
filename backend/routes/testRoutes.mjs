// backend/routes/testRoutes.mjs
import express from 'express';
import testController from '../controllers/testController.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

/**
 * @route   POST /api/test/create-client
 * @desc    Create a test client user
 * @access  Private/Admin
 */
router.post('/create-client', protect, adminOnly, testController.createTestClient);

/**
 * @route   POST /api/test/add-sessions
 * @desc    Add sessions to a test client
 * @access  Private/Admin
 */
router.post('/add-sessions', protect, adminOnly, testController.addSessionsToTestClient);

export default router;
