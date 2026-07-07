/**
 * recoveryBoardController.mjs — Recovery Board HTTP handlers (4B.2/4B.3)
 * ========================================================================
 * Self-service (userId from the JWT — clientAnalyticsRoutes pattern; a
 * trainer/admin per-client view arrives with 4B.5). Deliberately UN-tier-gated
 * (guidance class, like nba-lite): recovery homework is coaching surface, not
 * an analytics upsell — flag to Sean if he wants a gate.
 */
import { getTodayRecoveryBoard, recordRecoveryCompletion } from '../services/recoveryBoardService.mjs';
import logger from '../utils/logger.mjs';

export async function getRecoveryBoardHandler(req, res) {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const board = await getTodayRecoveryBoard(userId);
    return res.status(200).json({ success: true, board });
  } catch (error) {
    logger.error('[RecoveryBoard] board fetch failed', { error: error?.message });
    return res.status(500).json({ success: false, message: 'Could not load the recovery board' });
  }
}

export async function postRecoveryCompletionHandler(req, res) {
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { exerciseKey, date } = req.body ?? {};
    const result = await recordRecoveryCompletion({ userId, exerciseKey, date });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    const status = Number(error?.statusCode) || 500;
    if (status >= 500) {
      logger.error('[RecoveryBoard] completion failed', { error: error?.message });
    }
    return res.status(status).json({
      success: false,
      message: status >= 500 ? 'Could not record the completion' : error.message,
    });
  }
}
