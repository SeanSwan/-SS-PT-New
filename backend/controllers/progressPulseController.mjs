/**
 * ============================================================================
 * FILE: progressPulseController.mjs
 * PURPOSE: HTTP handler for GET /api/client/analytics/progress-pulse.
 * CREATED: 2026-07-02 (Slice 8.1 — Progress Intelligence)
 * ============================================================================
 *
 * SECURITY: identical contract to chartDataController — `req.params.userId`
 * is injected by clientAnalyticsRoutes.mjs from `req.user.id` (JWT-derived).
 * This endpoint never trusts a URL-supplied userId on the client surface.
 *
 * RULE-55 GUARD: Express resets `req.params` between the router.use()
 * injection layer and a paramless route layer, so — exactly like
 * chartDataController's requireUser — the handler falls back to
 * `req.user.id` (JWT) when the injected param is missing. Reading only
 * `req.params.userId` here 400s every live request (probed incident class).
 */

import getProgressPulse from '../services/progressPulseService.mjs';
import { computeNextBestAction, getNextBestAction } from '../services/nextBestActionService.mjs';
import getWorkoutDayDetail from '../services/workoutDayDetailService.mjs';

const parseUserId = (raw) => {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function getProgressPulseHandler(req, res) {
  try {
    const userId = parseUserId(req.params?.userId || req.user?.id);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user context' });
    }
    const sequelize = req.app.get('sequelize');
    const data = await getProgressPulse(sequelize, userId);
    // One round trip: the pulse payload carries its own coach guidance so the
    // client surface never needs a second request for "what do I do next?".
    const nextBestAction = computeNextBestAction(data);
    return res.json({ success: true, data: { ...data, nextBestAction } });
  } catch (error) {
    console.error('[Progress Pulse Failed]', {
      message: error?.message,
      userId: req.params?.userId,
    });
    return res.status(500).json({
      success: false,
      message: 'Unable to load progress pulse',
      error: 'internal_error',
    });
  }
}

/** GET /api/client/analytics/workout-day?md=MM/DD — Slice 8.4 drill-down. */
export async function getWorkoutDayHandler(req, res) {
  try {
    const userId = parseUserId(req.params?.userId || req.user?.id);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid user context' });
    }
    const data = await getWorkoutDayDetail(req.app.get('sequelize'), userId, req.query?.md);
    if (data.invalidLabel) {
      return res.status(400).json({ success: false, message: 'Invalid date label' });
    }
    return res.json({ success: true, data });
  } catch (error) {
    console.error('[Workout Day Failed]', { message: error?.message, userId: req.params?.userId });
    return res.status(500).json({
      success: false,
      message: 'Unable to load workout detail',
      error: 'internal_error',
    });
  }
}

/**
 * GET /api/analytics/:userId/next-best-action — Slice 8.5 coach surface.
 * userId here IS a URL param; requireOwnershipOrTrainer gates access.
 */
export async function getNextBestActionHandler(req, res) {
  try {
    const userId = parseUserId(req.params?.userId);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    const result = await getNextBestAction(req.app.get('sequelize'), userId, { audience: 'coach' });
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Next Best Action Failed]', { message: error?.message, userId: req.params?.userId });
    return res.status(500).json({
      success: false,
      message: 'Unable to load next best action',
      error: 'internal_error',
    });
  }
}

export default getProgressPulseHandler;
