// backend/routes/orientationRoutes.mjs
import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/authMiddleware.mjs';
import { orientationSignup, orientationSubmit, getOrientationData, getAllOrientations, updateOrientation } from '../controllers/orientationController.mjs';

const router = express.Router();

/**
 * POST /api/orientation/signup
 *
 * Protected route: Only accessible to logged-in users.
 * Validates required fields and then processes the orientation signup.
 */
router.post(
  '/signup',
  protect,
  [
    // Express-validator middleware to validate input fields.
    body('fullName').notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('phone').notEmpty().withMessage('Phone number is required.'),
    body('healthInfo').notEmpty().withMessage('Health information is required.'),
    body('waiverInitials').notEmpty().withMessage('Waiver initials are required.'),
  ],
  async (req, res) => {
    // Check for validation errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }
    // Call the orientationSignup controller to handle the request.
    return orientationSignup(req, res);
  }
);

/**
 * POST /api/orientation/submit
 *
 * Public route: Accessible to anyone (for consultation form submissions).
 * Validates required fields and then processes the orientation signup without requiring auth.
 */
router.post(
  '/submit',
  [
    // Express-validator middleware to validate input fields.
    body('fullName').notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('phone').notEmpty().withMessage('Phone number is required.'),
    body('healthInfo').notEmpty().withMessage('Health information is required.'),
    body('waiverInitials').notEmpty().withMessage('Waiver initials are required.'),
  ],
  async (req, res) => {
    // Check for validation errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }
    // Call the orientationSubmit controller to handle the request.
    return orientationSubmit(req, res);
  }
);

/**
 * GET /api/orientation/user/:userId
 *
 * Protected route: Only accessible to logged-in users (must be admin or the user themselves).
 * Retrieves orientation data for a specific user.
 */
router.get('/user/:userId', protect, getOrientationData);

/**
 * GET /api/orientation/all
 *
 * Protected route: Only accessible to admin users.
 * Retrieves all orientation submissions.
 */
router.get('/all', protect, getAllOrientations);

/**
 * PUT /api/orientation/:id
 *
 * Protected route: Only accessible to admin or trainer users.
 * Updates an orientation record (status, assigned trainer, etc.)
 */
router.put(
  '/:id',
  protect,
  [
    body('status').optional().isIn(['pending', 'scheduled', 'completed', 'cancelled']).withMessage('Invalid status'),
    body('assignedTrainer').optional().isString().withMessage('Assigned trainer must be a string'),
    body('scheduledDate').optional().isISO8601().withMessage('Invalid date format')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }
    return updateOrientation(req, res);
  }
);

export default router;