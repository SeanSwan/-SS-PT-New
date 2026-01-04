fimport express from 'express';
import measurementController from '../controllers/measurementController.mjs';
import { protect, adminOrTrainerOnly } from '../middleware/authMiddleware.mjs'; // Assuming this middleware exists
import multer from 'multer';

// Configure multer for file uploads (in a real app, move this to a separate config file)
const upload = multer({ dest: 'uploads/measurements/' });

const router = express.Router();

/**
 * All routes are protected and accessible only by admins or trainers.
 */
router.use(protect, adminOrTrainerOnly);

// @route   POST /api/measurements
// @desc    Create a new body measurement for a client.
// @access  Private (Admin/Trainer)
router.post('/', measurementController.createMeasurement);

// @route   POST /api/measurements/upload-photos
// @desc    Upload before/after photos for a measurement.
// @access  Private (Admin/Trainer)
router.post(
  '/upload-photos',
  upload.array('photos', 5), // 'photos' is the field name, limit to 5 files
  measurementController.uploadPhotos
);

// @route   GET /api/measurements/:userId
// @desc    Get all measurements for a specific client.
// @access  Private (Admin/Trainer)
router.get('/:userId', measurementController.getMeasurementsForUser);

// @route   GET /api/measurements/:userId/latest
// @desc    Get the latest measurement for a specific client.
// @access  Private (Admin/Trainer)
router.get('/:userId/latest', measurementController.getLatestMeasurement);

export default router;