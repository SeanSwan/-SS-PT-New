// backend/routes/orientationRoutes.mjs
import express from 'express';
import Orientation from '../models/Orientation.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

/**
 * POST /api/orientation/signup
 * This endpoint allows users to sign up for an orientation following NASM protocols.
 * It validates the required fields and then creates an Orientation record.
 */
router.post(
  '/signup',
  [
    // Validate required fields using express-validator.
    body('fullName').notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().withMessage('A valid email is required.'),
    body('phone').notEmpty().withMessage('Phone number is required.'),
    body('healthInfo').notEmpty().withMessage('Health information is required.'),
    body('waiverInitials').notEmpty().withMessage('Waiver initials are required.'),
  ],
  async (req, res) => {
    // Check validation errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }
    try {
      const { fullName, email, phone, healthInfo, waiverInitials } = req.body;
      // Create an orientation record.
      const orientation = await Orientation.create({ fullName, email, phone, healthInfo, waiverInitials });
      return res.status(201).json({
        message: 'Orientation signup successful.',
        orientation,
      });
    } catch (error) {
      console.error('Error during orientation signup:', error);
      return res.status(500).json({ message: 'Server error during orientation signup.' });
    }
  }
);

/**
 * GET /api/orientation
 * This endpoint retrieves all orientation signups.
 * Typically used by admins to review orientation requests.
 */
router.get('/', async (req, res) => {
  try {
    const orientations = await Orientation.findAll();
    res.status(200).json(orientations);
  } catch (error) {
    console.error('Error fetching orientations:', error);
    res.status(500).json({ message: 'Server error fetching orientations.' });
  }
});

export default router;
