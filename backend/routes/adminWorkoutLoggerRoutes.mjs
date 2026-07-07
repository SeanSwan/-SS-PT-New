import express from 'express';
import { protect, authorize } from '../middleware/auth.mjs';
import { logWorkout, getClientWorkouts, editWorkout, deleteWorkoutLog } from '../controllers/adminWorkoutLoggerController.mjs';

const router = express.Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));

/**
 * ─── Charter v3 H: attested history backfill ───────────────────────────────
 * Preview (nothing persisted) → trainer edits → commit (attestation required;
 * ai_generated_backfill source = billing/XP/streak/PR-award suppressed) → undo.
 */
router.post('/clients/:clientId/workouts/backfill/preview', async (req, res) => {
  try {
    const { buildBackfillPreview } = await import('../services/workout/historyBackfillService.mjs');
    const { startDate, endDate, sessionsPerWeek, dominantExercises, breaks } = req.body || {};
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
    }
    const preview = await buildBackfillPreview({
      userId: parseInt(req.params.clientId, 10),
      startDate,
      endDate,
      sessionsPerWeek,
      dominantExercises: Array.isArray(dominantExercises) ? dominantExercises : [],
      breaks: Array.isArray(breaks) ? breaks : [],
    });
    return res.json({ success: true, ...preview });
  } catch (error) {
    const status = Number(error?.statusCode) || (/capped|history|startDate/.test(error?.message ?? '') ? 400 : 500);
    return res.status(status).json({ success: false, message: error.message });
  }
});

router.post('/clients/:clientId/workouts/backfill/commit', async (req, res) => {
  try {
    const { commitBackfill } = await import('../services/workout/historyBackfillService.mjs');
    const { days, attestation, grounding } = req.body || {};
    const result = await commitBackfill({
      userId: parseInt(req.params.clientId, 10),
      trainerId: req.user.id,
      days,
      attestation,
      grounding: grounding ?? null,
    });
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({
      success: false,
      message: status >= 500 ? 'Backfill commit failed' : error.message,
    });
  }
});

router.post('/backfill-runs/:runId/undo', async (req, res) => {
  try {
    const { undoBackfillRun } = await import('../services/workout/historyBackfillService.mjs');
    const result = await undoBackfillRun({
      runId: parseInt(req.params.runId, 10),
      trainerId: req.user.id,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({
      success: false,
      message: status >= 500 ? 'Backfill undo failed' : error.message,
    });
  }
});

/** POST /api/admin/clients/:clientId/workouts — log a workout */
router.post('/clients/:clientId/workouts', logWorkout);

/** GET /api/admin/clients/:clientId/workouts — get workout history */
router.get('/clients/:clientId/workouts', getClientWorkouts);

/** PATCH /api/admin/clients/:clientId/workouts/:sessionId — edit a completed workout */
router.patch('/clients/:clientId/workouts/:sessionId', editWorkout);

/** DELETE /api/admin/clients/:clientId/workouts/:sessionId/logs/:logId — remove a single set */
router.delete('/clients/:clientId/workouts/:sessionId/logs/:logId', deleteWorkoutLog);

export default router;
