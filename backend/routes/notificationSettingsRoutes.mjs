// backend/routes/notificationSettingsRoutes.mjs
import express from 'express';
import {
  getAllSettings,
  getSettingById,
  createSetting,
  updateSetting,
  deleteSetting,
  getCoachNudgeConsent,
  updateCoachNudgeConsent,
} from '../controllers/notificationSettingsController.mjs';
import { protect, admin } from '../middleware/authMiddleware.mjs';

const router = express.Router();

/**
 * ============================================================================
 * G10 coach-nudge consent — SELF-SERVICE (packet 48 "Consent settings")
 * ============================================================================
 * `GET|PUT /api/notification-settings/coach-nudges`
 *
 * The consent the G10 scheduler requires
 * (`notificationPreferences.coachProactiveNudges === true`, read at
 * services/coachProactiveNudgeCron.mjs:80) had no writer anywhere in the tree,
 * so the scheduler was live but unreachable. These two routes are that writer
 * and its matching read.
 *
 * GATE: `protect` only — the caller acts on its OWN row (`req.user.id`), never
 * on an id supplied by the request. The admin CRUD routes below keep their
 * existing `protect, admin` gate unchanged; there is deliberately no
 * admin-for-client variant of this route, because consent is the data
 * subject's own act.
 *
 * ORDER MATTERS — these are registered BEFORE `/:id`. Express matches in
 * registration order, so a later `GET /coach-nudges` would be captured by
 * `GET /:id` and answered with that route's `admin` gate: a 403 for every
 * client. tests/api/notificationSettingsCoachNudgeConsent.test.mjs pins the
 * order and the client-visible behaviour it protects.
 */
router.get('/coach-nudges', protect, getCoachNudgeConsent);
router.put('/coach-nudges', protect, updateCoachNudgeConsent);

/**
 * GET /api/notification-settings
 * Get all notification settings
 */
router.get('/', protect, admin, getAllSettings);

/**
 * GET /api/notification-settings/:id
 * Get a single notification setting by ID
 */
router.get('/:id', protect, admin, getSettingById);

/**
 * POST /api/notification-settings
 * Create a new notification setting
 */
router.post('/', protect, admin, createSetting);

/**
 * PUT /api/notification-settings/:id
 * Update an existing notification setting
 */
router.put('/:id', protect, admin, updateSetting);

/**
 * DELETE /api/notification-settings/:id
 * Delete a notification setting
 */
router.delete('/:id', protect, admin, deleteSetting);

export default router;
