import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
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
import { protect, authorize } from '../middleware/authMiddleware.mjs';

const router = express.Router();

// Configure multer for measurement photo uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(process.cwd(), 'uploads', 'measurements');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + uuidv4();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per photo
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed'));
  }
});

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/measurements/schedule/status/:userId
 * @desc    Get measurement schedule status for a user
 * @access  Admin, Trainer
 */
router.get('/schedule/status/:userId', authorize(['admin', 'trainer']), getScheduleStatus);

/**
 * @route   GET /api/measurements/schedule/upcoming
 * @desc    Get clients with upcoming or overdue measurement checks
 * @access  Admin only
 */
router.get('/schedule/upcoming', authorize(['admin']), getUpcomingChecks);

/**
 * @route   POST /api/measurements/upload-photos
 * @desc    Upload progress photos (returns URLs to include in measurement)
 * @access  Trainer, Admin
 */
router.post('/upload-photos', authorize(['admin', 'trainer']), (req, res, next) => {
  upload.array('photos', 10)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'File too large. Maximum 10MB per photo.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ success: false, message: 'Too many files. Maximum 10 photos per upload.' });
      }
      if (err.message?.includes('Only image files')) {
        return res.status(400).json({ success: false, message: err.message });
      }
      return res.status(500).json({ success: false, message: 'Upload failed' });
    }
    next();
  });
}, (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }
  const photoUrls = req.files.map(file => `/uploads/measurements/${file.filename}`);
  res.json({ success: true, photoUrls });
});

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
router.put('/:id', authorize(['admin', 'trainer']), updateMeasurement);

/**
 * @route   DELETE /api/measurements/:id
 * @desc    Delete measurement
 * @access  Admin only
 */
router.delete('/:id', authorize(['admin']), deleteMeasurement);

/**
 * @route   POST /api/measurements/:id/photos
 * @desc    Upload progress photos for measurement
 * @access  Trainer, Admin
 */
router.post('/:id/photos', authorize(['admin', 'trainer']), uploadProgressPhotos);

export default router;
