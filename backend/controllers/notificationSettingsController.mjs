// backend/controllers/notificationSettingsController.mjs
import logger from '../utils/logger.mjs';
import NotificationSettings from '../models/NotificationSettings.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';
import { getUser } from '../models/index.mjs';
// The consent READ path deliberately calls the CRON'S OWN accessors rather than
// re-deriving them, so the value a client is shown and the value the scheduler
// acts on cannot drift. G10 / packet 48 "Consent settings".
import {
  hasCoachProactiveNudgeConsent,
  coachNudgeSnoozeUntil,
} from '../services/coachProactiveNudgeCron.mjs';

/**
 * Get all notification settings
 */
export const getAllSettings = async (req, res) => {
  try {
    const settings = await NotificationSettings.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    return successResponse(res, settings, 'Notification settings retrieved successfully');
  } catch (error) {
    logger.error('Error in getAllSettings:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving notification settings', 500);
  }
};

/**
 * Get a single notification setting by ID
 */
export const getSettingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const setting = await NotificationSettings.findByPk(id);
    
    if (!setting) {
      return errorResponse(res, 'Notification setting not found', 404);
    }
    
    return successResponse(res, setting, 'Notification setting retrieved successfully');
  } catch (error) {
    logger.error('Error in getSettingById:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving notification setting', 500);
  }
};

/**
 * Create a new notification setting
 */
export const createSetting = async (req, res) => {
  try {
    const { name, email, phone, isActive, notificationType, isPrimary } = req.body;
    
    // Basic validation
    if (!name) {
      return errorResponse(res, 'Name is required', 400);
    }
    
    if (!email && !phone) {
      return errorResponse(res, 'At least one contact method (email or phone) is required', 400);
    }
    
    // Create the setting
    const setting = await NotificationSettings.create({
      name,
      email,
      phone,
      isActive: isActive !== undefined ? isActive : true,
      notificationType: notificationType || 'ALL',
      isPrimary: isPrimary || false
    });
    
    logger.info(`Notification setting created: ${setting.id}`);
    
    return successResponse(res, setting, 'Notification setting created successfully', 201);
  } catch (error) {
    logger.error('Error in createSetting:', error.message, { stack: error.stack });
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return errorResponse(res, 'Validation error', 400, error.errors.map(e => e.message));
    }
    
    return errorResponse(res, 'Server error creating notification setting', 500);
  }
};

/**
 * Update an existing notification setting
 */
export const updateSetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, isActive, notificationType, isPrimary } = req.body;
    
    // Find the setting
    const setting = await NotificationSettings.findByPk(id);
    
    if (!setting) {
      return errorResponse(res, 'Notification setting not found', 404);
    }
    
    // Update the setting
    await setting.update({
      name: name !== undefined ? name : setting.name,
      email: email !== undefined ? email : setting.email,
      phone: phone !== undefined ? phone : setting.phone,
      isActive: isActive !== undefined ? isActive : setting.isActive,
      notificationType: notificationType || setting.notificationType,
      isPrimary: isPrimary !== undefined ? isPrimary : setting.isPrimary
    });
    
    logger.info(`Notification setting updated: ${setting.id}`);
    
    return successResponse(res, setting, 'Notification setting updated successfully');
  } catch (error) {
    logger.error('Error in updateSetting:', error.message, { stack: error.stack });
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return errorResponse(res, 'Validation error', 400, error.errors.map(e => e.message));
    }
    
    return errorResponse(res, 'Server error updating notification setting', 500);
  }
};

/**
 * Delete a notification setting
 */
export const deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the setting
    const setting = await NotificationSettings.findByPk(id);
    
    if (!setting) {
      return errorResponse(res, 'Notification setting not found', 404);
    }
    
    // Delete the setting
    await setting.destroy();
    
    logger.info(`Notification setting deleted: ${id}`);
    
    return successResponse(res, { id }, 'Notification setting deleted successfully');
  } catch (error) {
    logger.error('Error in deleteSetting:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error deleting notification setting', 500);
  }
};

/**
 * ============================================================================
 * G10 coach-nudge consent (packet 48 "Consent settings")
 * ============================================================================
 * `services/coachProactiveNudgeCron.mjs:80` opts a client in ONLY on a real
 * boolean `true` inside `notificationPreferences.coachProactiveNudges`, and
 * `:89` reads the snooze beside it. Until now nothing could set either key, so
 * the scheduler was live but unreachable. These two handlers are that write
 * path, and the read that lets a client see the state it will act on.
 *
 * AUTHORIZATION: self-service only, for every role. The subject is ALWAYS
 * `req.user.id` and is never taken from the path, the query or the body — so
 * there is no shape of request in which one account acts on another's consent
 * (and no admin-for-client variant: consent is the data subject's own act).
 * `protect` is the file's existing gate; the neighbouring admin CRUD routes add
 * `admin`, which these deliberately do not.
 *
 * FAIL CLOSED: the write refuses anything that is not a real boolean or a real
 * timestamp, so junk can never be stored for the cron's `=== true` to trip over.
 * Absent stays absent, which the cron already reads as OFF.
 */

/** The only two keys this surface owns. Anything else is refused, not ignored. */
export const COACH_NUDGE_CONSENT_FIELDS = Object.freeze(['coachProactiveNudges', 'coachNudgeSnoozedUntil']);

/**
 * Merge base for a read-modify-write. Mirrors the cron's own `parsePreferences`
 * (services/coachProactiveNudgeCron.mjs:70-76): a JSON-string blob is parsed,
 * and anything that is not a preference record contributes no fields — so a
 * malformed blob cannot resurrect old keys. Every OTHER preference (sms, email,
 * push, quietHours, …) is carried through untouched.
 */
const preferenceRecord = (stored) => {
  let prefs = stored;
  if (typeof prefs === 'string') {
    try { prefs = JSON.parse(prefs); } catch { prefs = null; }
  }
  if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) return {};
  return { ...prefs };
};

/** Exactly what the scheduler reads — same two accessors, same result. */
const coachNudgeConsentPayload = (user) => ({
  coachProactiveNudges: hasCoachProactiveNudgeConsent(user),
  coachNudgeSnoozedUntil: coachNudgeSnoozeUntil(user),
});

/**
 * GET /api/notification-settings/coach-nudges — the caller's OWN consent state.
 */
export const getCoachNudgeConsent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Not authorized, no user context', 401);
    }

    const user = await getUser().findByPk(userId, { attributes: ['id', 'notificationPreferences'] });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, coachNudgeConsentPayload(user), 'Coach nudge consent retrieved successfully');
  } catch (error) {
    logger.error('Error in getCoachNudgeConsent:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving coach nudge consent', 500);
  }
};

/**
 * PUT /api/notification-settings/coach-nudges — opt in/out and set/clear the
 * snooze for the caller's OWN account. Additive: sibling preference keys are
 * preserved byte for byte and never become writable through this path.
 */
export const updateCoachNudgeConsent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return errorResponse(res, 'Not authorized, no user context', 401);
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorResponse(res, 'Request body must be a JSON object', 400);
    }

    const unsupported = Object.keys(body).filter((key) => !COACH_NUDGE_CONSENT_FIELDS.includes(key));
    if (unsupported.length > 0) {
      return errorResponse(
        res,
        `Unsupported field(s): ${unsupported.join(', ')}. This endpoint writes only ${COACH_NUDGE_CONSENT_FIELDS.join(' and ')}.`,
        400,
      );
    }

    const hasOptIn = Object.prototype.hasOwnProperty.call(body, 'coachProactiveNudges');
    const hasSnooze = Object.prototype.hasOwnProperty.call(body, 'coachNudgeSnoozedUntil');
    if (!hasOptIn && !hasSnooze) {
      return errorResponse(res, `Provide at least one of ${COACH_NUDGE_CONSENT_FIELDS.join(' or ')}`, 400);
    }

    // Strict boolean. `"true"`, 1, {} and null are all refused rather than
    // stored, so the cron's `=== true` keeps meaning exactly what it says.
    if (hasOptIn && typeof body.coachProactiveNudges !== 'boolean') {
      return errorResponse(res, 'coachProactiveNudges must be a boolean (true or false)', 400);
    }

    let snooze;
    if (hasSnooze) {
      const raw = body.coachNudgeSnoozedUntil;
      if (raw === null) {
        snooze = null;
      } else if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(new Date(raw).getTime())) {
        snooze = new Date(raw).toISOString();
      } else {
        return errorResponse(res, 'coachNudgeSnoozedUntil must be null or a valid ISO 8601 timestamp', 400);
      }
    }

    const user = await getUser().findByPk(userId, { attributes: ['id', 'notificationPreferences'] });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const next = preferenceRecord(user.notificationPreferences);
    if (hasOptIn) next.coachProactiveNudges = body.coachProactiveNudges;
    if (hasSnooze) {
      if (snooze === null) delete next.coachNudgeSnoozedUntil;
      else next.coachNudgeSnoozedUntil = snooze;
    }

    await user.update({ notificationPreferences: next });
    logger.info(`Coach nudge consent updated: ${userId}`);

    return successResponse(
      res,
      coachNudgeConsentPayload({ notificationPreferences: next }),
      'Coach nudge consent updated successfully',
    );
  } catch (error) {
    logger.error('Error in updateCoachNudgeConsent:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error updating coach nudge consent', 500);
  }
};
