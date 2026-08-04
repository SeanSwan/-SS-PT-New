import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs';
import { generateScheduleAiProposal } from '../services/schedule-ai/scheduleAiProposalEngine.mjs';

const router = express.Router();
const MAX_MESSAGE_LENGTH = 2000;

function normalizeMessage(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { surface: 'universal_master_schedule' };
  }

  return {
    ...value,
    surface: value.surface || 'universal_master_schedule',
  };
}

function statusForCode(code, ok) {
  if (ok) return 200;
  if (code === 'SCHEDULE_AI_PROPOSAL_DENIED') return 403;
  if (code === 'SCHEDULE_AI_STALE_CONTEXT') return 409;
  if (code === 'SCHEDULE_AI_PROVIDER_DEGRADED') return 503;
  return 400;
}

function errorPayload(code, message) {
  return {
    success: false,
    ok: false,
    type: 'error',
    code,
    message,
  };
}

// Launch audit 2026-08-04 — cost abuse. Routes 2000-char messages to Gemini
// with no limiter, no tier gate and no per-user cap, so any authenticated
// account could loop paid completions. Sibling AI routes already apply
// aiRateLimiter (e.g. mealPlanRoutes.mjs:205).
router.post('/proposals', protect, aiRateLimiter, async (req, res) => {
  const message = normalizeMessage(req.body?.message);
  if (!message) {
    return res
      .status(400)
      .json(errorPayload('SCHEDULE_AI_MESSAGE_REQUIRED', 'Schedule AI message is required.'));
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res
      .status(400)
      .json(errorPayload('SCHEDULE_AI_MESSAGE_TOO_LONG', 'Schedule AI message is too long.'));
  }

  try {
    const result = await generateScheduleAiProposal({
      actor: req.user,
      message,
      context: normalizeContext(req.body?.context),
    });

    return res.status(statusForCode(result?.code, Boolean(result?.ok))).json({
      success: Boolean(result?.ok),
      ...result,
    });
  } catch (error) {
    return res.status(500).json(errorPayload(
      error?.code || 'SCHEDULE_AI_PROPOSAL_FAILED',
      'Schedule AI proposal failed.'
    ));
  }
});

export default router;
