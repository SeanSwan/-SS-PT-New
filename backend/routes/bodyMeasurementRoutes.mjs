import express from 'express';
import {
  createMeasurement,
  getUserMeasurements,
  getMeasurementById,
  updateMeasurement,
  deleteMeasurement,
  getLatestMeasurement,
  uploadProgressPhotos,
  getMeasurementStats,
  getScheduleStatus,
  getUpcomingChecks
} from '../controllers/bodyMeasurementController.mjs';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/measurements/schedule/status/:userId
 * @desc    Get measurement schedule status for a user
 * @access  Admin, Trainer
 */
router.get('/schedule/status/:userId', authorizeRoles('admin', 'trainer'), getScheduleStatus);

/**
 * @route   GET /api/measurements/schedule/upcoming
 * @desc    Get clients with upcoming or overdue measurement checks
 * @access  Admin only
 */
router.get('/schedule/upcoming', authorizeRoles('admin'), getUpcomingChecks);

/**
 * @route   POST /api/measurements
 * @desc    Create new body measurement
 * @access  Trainer, Admin, Client (for self-entry)
 */
router.post('/', createMeasurement);

/**
 * @route   GET /api/measurements/user/:userId
 * @desc    Get all measurements for a user
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/user/:userId', getUserMeasurements);

/**
 * @route   GET /api/measurements/user/:userId/latest
 * @desc    Get latest measurement for a user
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/user/:userId/latest', getLatestMeasurement);

/**
 * @route   GET /api/measurements/user/:userId/stats
 * @desc    Get measurement statistics for a user
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/user/:userId/stats', getMeasurementStats);

/**
 * @route   GET /api/measurements/:id
 * @desc    Get single measurement by ID
 * @access  Trainer, Admin, Client (own data)
 */
router.get('/:id', getMeasurementById);

/**
 * @route   PUT /api/measurements/:id
 * @desc    Update measurement
 * @access  Trainer, Admin
 */
router.put('/:id', authorizeRoles('admin', 'trainer'), updateMeasurement);

/**
 * @route   DELETE /api/measurements/:id
 * @desc    Delete measurement
 * @access  Admin only
 */
router.delete('/:id', authorizeRoles('admin'), deleteMeasurement);

/**
 * @route   POST /api/measurements/:id/photos
 * @desc    Upload progress photos for measurement
 * @access  Trainer, Admin
 */
router.post('/:id/photos', authorizeRoles('admin', 'trainer'), uploadProgressPhotos);

export default router;
