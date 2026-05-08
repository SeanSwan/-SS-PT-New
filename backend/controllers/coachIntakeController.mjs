/**
 * coachIntakeController.mjs
 * =========================
 * HTTP handlers for the canonical Swan Coach intake queue.
 */
import logger from '../utils/logger.mjs';
import {
  CoachIntakeSchemaUnavailableError,
  CoachIntakeValidationError,
  createCoachTextIntakeItem,
  listUnifiedCoachIntakeItems,
} from '../services/coachIntakeItemService.mjs';
import { confirmCoachIntakeAudioOrder } from '../services/coachIntakeReviewActionsService.mjs';

function jsonError(res, status, code, message, details = {}) {
  return res.status(status).json({
    success: false,
    error: { code, message, ...details },
  });
}

function currentUserId(req) {
  const id = Number(req.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function createCoachTextIntakeHandler(req, res) {
  try {
    const userId = currentUserId(req);
    if (!userId) return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');

    const item = await createCoachTextIntakeItem({
      userId,
      text: req.body?.text,
      sourceType: req.body?.sourceType || 'chat_narrative',
      clientId: req.body?.clientId ?? null,
      metadata: {
        captureSurface: 'coach_assistant',
        trigger: req.body?.trigger || 'manual',
      },
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    if (err instanceof CoachIntakeValidationError) {
      return jsonError(res, 400, err.code, err.message, err.details);
    }
    if (err instanceof CoachIntakeSchemaUnavailableError) {
      return jsonError(res, 503, err.code, err.message);
    }
    if (err.code === 'CIPHER_KEY_MISCONFIGURED' || err.code === 'CIPHER_KEY_VERSION_UNAVAILABLE') {
      return jsonError(res, 503, 'COACH_INTAKE_ENCRYPTION_UNAVAILABLE', 'Coach intake encryption is not configured');
    }
    logger.error('[coachIntake.createText] %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Failed to create Coach intake item');
  }
}

export async function listCoachIntakeHandler(req, res) {
  try {
    const userId = currentUserId(req);
    if (!userId) return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');

    const result = await listUnifiedCoachIntakeItems({
      userId,
      scope: req.query.scope,
      limit: req.query.limit,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error('[coachIntake.list] %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Failed to list Coach intake queue');
  }
}

export async function confirmCoachIntakeAudioOrderHandler(req, res) {
  try {
    const userId = currentUserId(req);
    if (!userId) return jsonError(res, 401, 'AUTH_REQUIRED', 'Authentication required');

    const item = await confirmCoachIntakeAudioOrder({
      userId,
      intakeId: req.params.id,
    });

    return res.status(200).json({ success: true, item });
  } catch (err) {
    if (err instanceof CoachIntakeValidationError) {
      const status = err.code === 'INTAKE_NOT_FOUND' ? 404 : 400;
      return jsonError(res, status, err.code, err.message, err.details);
    }
    if (err instanceof CoachIntakeSchemaUnavailableError) {
      return jsonError(res, 503, err.code, err.message);
    }
    logger.error('[coachIntake.confirmAudioOrder] %s', err.message);
    return jsonError(res, 500, 'INTERNAL_ERROR', 'Failed to confirm Coach intake audio order');
  }
}

export default {
  createCoachTextIntakeHandler,
  listCoachIntakeHandler,
  confirmCoachIntakeAudioOrderHandler,
};
