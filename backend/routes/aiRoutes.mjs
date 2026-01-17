import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { generateWorkoutPlan } from '../controllers/aiWorkoutController.mjs';

const router = express.Router();

// POST /api/ai/workout-generation
router.post('/workout-generation', protect, generateWorkoutPlan);

export default router;
