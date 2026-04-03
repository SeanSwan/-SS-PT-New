import express from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import { logWorkout, getClientWorkouts, editWorkout, deleteWorkoutLog } from '../controllers/adminWorkoutLoggerController.mjs';

const router = express.Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));

/** POST /api/admin/clients/:clientId/workouts — log a workout */
router.post('/clients/:clientId/workouts', logWorkout);

/** GET /api/admin/clients/:clientId/workouts — get workout history */
router.get('/clients/:clientId/workouts', getClientWorkouts);

/** PATCH /api/admin/clients/:clientId/workouts/:sessionId — edit a completed workout */
router.patch('/clients/:clientId/workouts/:sessionId', editWorkout);

/** DELETE /api/admin/clients/:clientId/workouts/:sessionId/logs/:logId — remove a single set */
router.delete('/clients/:clientId/workouts/:sessionId/logs/:logId', deleteWorkoutLog);

export default router;
