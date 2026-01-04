import express from 'express';
import {
  getStrengthProfile,
  getVolumeProgression,
  getSessionUsage,
  getClientPersonalRecords,
  getFrequencyStats,
  getNASMProgress,
  getNASMRecommendations,
  getAnalyticsDashboard
} from '../controllers/analyticsController.mjs';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/analytics/:userId/dashboard
 * @desc    Get comprehensive analytics dashboard
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/:userId/dashboard', getAnalyticsDashboard);

/**
 * @route   GET /api/analytics/:userId/strength-profile
 * @desc    Get strength profile for radar chart
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/:userId/strength-profile', getStrengthProfile);

/**
 * @route   GET /api/analytics/:userId/volume-progression
 * @desc    Get volume progression over time
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/:userId/volume-progression', getVolumeProgression);

/**
 * @route   GET /api/analytics/:userId/session-usage
 * @desc    Get session usage statistics (solo vs trainer-led)
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/:userId/session-usage', getSessionUsage);

/**
 * @route   GET /api/analytics/:userId/personal-records
 * @desc    Get personal records
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/:userId/personal-records', getClientPersonalRecords);

/**
 * @route   GET /api/analytics/:userId/frequency
 * @desc    Get workout frequency statistics
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/:userId/frequency', getFrequencyStats);

/**
 * @route   GET /api/analytics/:userId/nasm-progress
 * @desc    Get NASM progression status
 * @access  Trainer, Admin
 */
router.get('/:userId/nasm-progress', authorizeRoles('admin', 'trainer'), getNASMProgress);

/**
 * @route   GET /api/analytics/nasm-recommendations/:level
 * @desc    Get NASM phase recommendations
 * @access  Trainer, Admin, Client
 */
router.get('/nasm-recommendations/:level', getNASMRecommendations);

export default router;
