/**
 * workoutSummaryRoutes.mjs
 * ════════════════════════════════════════════════════════════════
 * POST /api/workout-summaries — Generate workout summary + optionally email to client.
 *
 * Per AI Village consensus: POST (not GET) for summary generation,
 * with async job queue capability (future BullMQ integration).
 *
 * Phase: Master Prompt Implementation — Session Logger post-workout flow.
 */

import { Router } from 'express';
import { protect, trainerOrAdminOnly } from '../middleware/auth.mjs';
import { getAllModels } from '../models/index.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// The summary text is assembled from trainer-supplied prose (sessionNotes,
// exerciseName). It is interpolated into an HTML mail body below, so it must be
// escaped or the platform sender becomes a content-injection vector.
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeOptionalUuid = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
};

/**
 * POST /api/workout-summaries
 * Generates a workout summary from exercise data and optionally emails it.
 */
router.post('/', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    // Phase 2 Slice 2.1 (2026-05-03): null-honest destructuring.
    // Was `overallIntensity = 5` — when the trainer omitted intensity
    // from the summary request, this seeded a phantom 5/10 into the
    // generated text and email. Matches the Phase 16 null-honest
    // contract: undefined / null = "not rated" → omit the line.
    const {
      clientId,
      formId,
      exercises = [],
      sessionNotes = '',
      overallIntensity = null,
      sendEmail = false,
    } = req.body;

    const parsedClientId = parseStrictPositiveInteger(clientId);
    const normalizedFormId = normalizeOptionalUuid(formId);
    const formIdProvided = formId !== undefined && formId !== null && String(formId).trim() !== '';

    if (!parsedClientId) {
      return res.status(400).json({ success: false, message: 'Valid clientId is required' });
    }

    if (formIdProvided && !normalizedFormId) {
      return res.status(400).json({ success: false, message: 'Valid formId is required' });
    }

    if (!Array.isArray(exercises)) {
      return res.status(400).json({ success: false, message: 'exercises must be an array' });
    }

    if (!exercises.length && !normalizedFormId) {
      return res.status(400).json({ success: false, message: 'exercises or formId is required' });
    }

    // Launch audit 2026-08-03: this route was `protect` + `trainerOrAdminOnly`
    // only, so any trainer could summarize, persist to, and email ANY client.
    const access = await ensureClientAccess(req, parsedClientId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const models = getAllModels();
    const { User, DailyWorkoutForm } = models;

    // Fetch client info
    const client = await User.findByPk(parsedClientId, {
      attributes: ['id', 'firstName', 'lastName', 'email'],
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // A caller authorized for client A must not be able to overwrite a form
    // belonging to client B by passing that form's id.
    if (normalizedFormId && DailyWorkoutForm?.findByPk) {
      const targetForm = await DailyWorkoutForm.findByPk(normalizedFormId, {
        attributes: ['id', 'clientId'],
      });
      if (targetForm && Number(targetForm.clientId) !== parsedClientId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Build summary from provided exercises
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const totalVolume = exercises.reduce((sum, ex) => {
      return sum + (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
    }, 0);

    // Phase 2 Slice 2.1 (2026-05-03): null-honest summary aggregates.
    //
    // avgRpe was computed by summing per-exercise RPE averages and
    // dividing by `exercises.length`, which dragged the overall avg
    // toward 0 for every exercise that had no rated sets. Fix:
    // collect every rated set across all exercises, then average that
    // flat list. Returns 0 only when literally no set has an RPE > 0
    // (the surrounding template treats `> 0` as the rendered guard).
    //
    // avgFormRating was `(ex.formRating || 0)` summed across ALL
    // exercises divided by exercises.length — phantom 0 for every
    // unrated exercise polluted the average. Fix: filter to rated
    // exercises, average only those.
    const allRpes = exercises
      .flatMap(ex => (ex.sets || []).map(s => s.rpe))
      .filter(rpe => Number.isFinite(rpe) && rpe > 0);
    const avgRpe = allRpes.length > 0
      ? allRpes.reduce((a, b) => a + b, 0) / allRpes.length
      : 0;

    const ratedFormRatings = exercises
      .map(ex => ex.formRating)
      .filter(r => Number.isFinite(r) && r > 0);
    const avgFormRating = ratedFormRatings.length > 0
      ? ratedFormRatings.reduce((a, b) => a + b, 0) / ratedFormRatings.length
      : 0;

    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const exerciseLines = exercises.map(ex => {
      const sets = ex.sets?.length || 0;
      const topSet = (ex.sets || []).reduce((best, s) => {
        const vol = (s.weight || 0) * (s.reps || 0);
        return vol > best.vol ? { vol, weight: s.weight, reps: s.reps } : best;
      }, { vol: 0, weight: 0, reps: 0 });

      return `  - ${ex.exerciseName}: ${sets} set${sets !== 1 ? 's' : ''}${
        topSet.weight > 0 ? ` (top: ${topSet.weight}lbs × ${topSet.reps})` : ''
      }`;
    });

    const summaryText = [
      `Workout Summary — ${date}`,
      `Client: ${client.firstName} ${client.lastName}`,
      ``,
      `Exercises (${exercises.length}):`,
      ...exerciseLines,
      ``,
      `Stats:`,
      `  Total Sets: ${totalSets}`,
      `  Total Volume: ${Math.round(totalVolume).toLocaleString()} lbs`,
      avgRpe > 0 ? `  Average RPE: ${avgRpe.toFixed(1)}/10` : null,
      avgFormRating > 0 ? `  Average Form: ${avgFormRating.toFixed(1)}/5` : null,
      // Phase 2 Slice 2.1: gate on null/undefined so the line drops
      // when the trainer didn't rate the session, matching avgRpe and
      // avgFormRating treatment. Null-honest contract: omit > phantom.
      (overallIntensity !== undefined && overallIntensity !== null)
        ? `  Overall Intensity: ${overallIntensity}/10`
        : null,
      sessionNotes ? `\nTrainer Notes: ${sessionNotes}` : null,
      ``,
      `Great work today, ${client.firstName}! Keep up the momentum.`,
    ].filter(Boolean).join('\n');

    // Persist summary to form if formId provided
    if (normalizedFormId && DailyWorkoutForm) {
      try {
        await DailyWorkoutForm.update(
          { clientSummary: summaryText },
          { where: { id: normalizedFormId } }
        );
      } catch (persistErr) {
        logger.warn('[WorkoutSummary] Failed to persist summary to form:', persistErr.message);
      }
    }

    // Email summary to client (non-blocking)
    let emailSent = false;
    if (sendEmail && client.email) {
      try {
        // Use existing email service if available
        const { sendEmail: sendEmailFn } = await import('../emailService.mjs').catch(() => ({}));
        if (sendEmailFn) {
          await sendEmailFn({
            to: client.email,
            subject: `Your Workout Summary — ${date}`,
            text: summaryText,
            html: `<pre style="font-family: 'Plus Jakarta Sans', sans-serif; white-space: pre-wrap; line-height: 1.6; color: #334155;">${escapeHtml(summaryText)}</pre>`,
          });
          emailSent = true;
          // Log the client id only — never the email (PII, incl. minors).
          logger.info('[WorkoutSummary] Email sent', { clientId: parsedClientId });
        } else {
          logger.warn('[WorkoutSummary] Email service not available');
        }
      } catch (emailErr) {
        logger.warn('[WorkoutSummary] Email failed (non-blocking):', emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      summary: summaryText,
      emailSent,
      formId: normalizedFormId,
    });
  } catch (error) {
    logger.error('[WorkoutSummary] Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
});

export default router;
