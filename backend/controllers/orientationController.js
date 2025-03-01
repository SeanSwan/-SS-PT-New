// backend/controllers/orientationController.js
import Orientation from '../models/Orientation.mjs';

/**
 * orientationSignup Controller
 *
 * This function processes the orientation signup request.
 * It expects the following fields in req.body:
 *  - fullName, email, phone, healthInfo, waiverInitials (all required)
 *  - trainingGoals, experienceLevel (optional)
 *
 * It also uses req.user (populated by the protect middleware)
 * to associate the signup with the logged-in user.
 */
export const orientationSignup = async (req, res) => {
  try {
    // Extract the logged-in user's id (set by protect middleware)
    const userId = req.user.id;

    // Destructure expected fields from the request body.
    const {
      fullName,
      email,
      phone,
      healthInfo,
      waiverInitials,
      trainingGoals,
      experienceLevel,
    } = req.body;

    // Basic validation: ensure required fields are provided.
    if (!fullName || !email || !phone || !healthInfo || !waiverInitials) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // Create a new orientation record, associating it with the logged-in user.
    const orientation = await Orientation.create({
      fullName,
      email,
      phone,
      healthInfo,
      waiverInitials,
      trainingGoals: trainingGoals || null,
      experienceLevel: experienceLevel || null,
      userId,
    });

    res.status(201).json({
      message: 'Orientation signup successful.',
      orientation,
    });
  } catch (error) {
    console.error('Error in orientationSignup:', error.message);
    res.status(500).json({ message: 'Server error during orientation signup.' });
  }
};
