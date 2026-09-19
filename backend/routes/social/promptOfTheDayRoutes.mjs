import express from 'express';
import { Op } from 'sequelize';
import { protect } from '../../middleware/authMiddleware.mjs';
import logger from '../../utils/logger.mjs';

/**
 * Prompt of the day — the composer's gentle starting nudge.
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §6 S4
 *
 * NOT a notification, NOT streak pressure, and never tracked per member. The prompt exists
 * so the composer is easier to start, not so the member owes the app something.
 */
const router = express.Router();

const MAX_PROMPT_LENGTH = 140;
const MAX_CHIP_LENGTH = 32;

/**
 * Curated fallback prompts. These exist so the composer is never empty before an admin has
 * scheduled anything — and so a database hiccup degrades to a real prompt instead of a gap.
 * Selected deterministically by day, so the prompt is stable within a day but rotates.
 */
export const FALLBACK_PROMPTS = [
  { chipLabel: 'Hardest set', promptText: 'What was the hardest set today?' },
  { chipLabel: 'Small win', promptText: 'What is one small win from today?' },
  { chipLabel: 'Proud of', promptText: 'What are you proud of this week?' },
  { chipLabel: 'New thing', promptText: 'What did you try for the first time?' },
  { chipLabel: 'Someone else', promptText: 'Who showed up for you lately?' },
  { chipLabel: 'Tomorrow', promptText: 'What is one thing you want tomorrow to look like?' },
  { chipLabel: 'Grateful', promptText: 'What made training feel good today?' },
];

const dayIndex = (date = new Date()) =>
  Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);

/** Deterministic fallback so the same day always shows the same prompt. */
export const fallbackPromptFor = (date = new Date()) =>
  FALLBACK_PROMPTS[dayIndex(date) % FALLBACK_PROMPTS.length];

const toIsoDay = (date = new Date()) => date.toISOString().slice(0, 10);

/**
 * GET /api/social/prompt-of-the-day
 * 200 { success, prompt: { chipLabel, promptText, source } }
 * Never 404s: the composer always has something to show.
 */
router.get('/', protect, async (_req, res) => {
  try {
    const SocialPromptOfTheDay = (await import('../../models/social/SocialPromptOfTheDay.mjs')).default;
    const scheduled = await SocialPromptOfTheDay.findOne({
      where: {
        isActive: true,
        [Op.or]: [{ activeOn: null }, { activeOn: { [Op.lte]: toIsoDay() } }]
      },
      order: [['activeOn', 'DESC'], ['updatedAt', 'DESC']],
      attributes: ['promptText', 'chipLabel', 'activeOn'],
      raw: true
    });

    if (scheduled?.promptText) {
      return res.status(200).json({
        success: true,
        prompt: {
          chipLabel: scheduled.chipLabel || scheduled.promptText,
          promptText: scheduled.promptText,
          source: 'scheduled'
        }
      });
    }

    const fallback = fallbackPromptFor();
    return res.status(200).json({ success: true, prompt: { ...fallback, source: 'fallback' } });
  } catch (error) {
    // A prompt is ambient. A failed lookup must never break the composer.
    logger.warn('Prompt of the day lookup failed (falling back):', error?.message);
    return res.status(200).json({ success: true, prompt: { ...fallbackPromptFor(), source: 'fallback' } });
  }
});

/**
 * POST /api/social/prompt-of-the-day  (admin only)
 * Body: { promptText, chipLabel?, activeOn? }
 */
router.post('/', protect, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can schedule prompts.' });
    }
    const promptText = typeof req.body?.promptText === 'string' ? req.body.promptText.trim() : '';
    if (!promptText) {
      return res.status(422).json({ success: false, message: 'promptText is required.' });
    }
    if (promptText.length > MAX_PROMPT_LENGTH) {
      return res.status(422).json({ success: false, message: `promptText must be ${MAX_PROMPT_LENGTH} characters or fewer.` });
    }
    const chipLabel = typeof req.body?.chipLabel === 'string' ? req.body.chipLabel.trim().slice(0, MAX_CHIP_LENGTH) : null;

    const SocialPromptOfTheDay = (await import('../../models/social/SocialPromptOfTheDay.mjs')).default;
    const created = await SocialPromptOfTheDay.create({
      promptText,
      chipLabel: chipLabel || null,
      activeOn: typeof req.body?.activeOn === 'string' ? req.body.activeOn.slice(0, 10) : null,
      isActive: req.body?.isActive !== false,
      createdBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      prompt: { id: created.id, chipLabel: created.chipLabel || created.promptText, promptText: created.promptText }
    });
  } catch (error) {
    logger.error('Prompt of the day create failed:', error?.message);
    return res.status(500).json({ success: false, message: 'Server error while saving the prompt.' });
  }
});

export default router;
