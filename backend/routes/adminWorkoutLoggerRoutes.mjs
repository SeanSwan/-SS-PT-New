import express from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import { logWorkout, getClientWorkouts } from '../controllers/adminWorkoutLoggerController.mjs';

const router = express.Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));

/** POST /api/admin/clients/:clientId/workouts — log a workout */
router.post('/clients/:clientId/workouts', logWorkout);

/** GET /api/admin/clients/:clientId/workouts — get workout history */
router.get('/clients/:clientId/workouts', getClientWorkouts);

export default router;
