// backend/routes/orientationRoutes.mjs
import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/authMiddleware.mjs';
import { orientationSignup } from '../controllers/orientationController.js';

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

export default router;

