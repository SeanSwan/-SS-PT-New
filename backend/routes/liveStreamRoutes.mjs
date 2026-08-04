/**
 * ============================================================================
 * FILE: liveStreamRoutes.mjs
 * PURPOSE: REST API routes for Live Streaming feature
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides endpoints for listing streams, getting stream
 * details, and basic CRUD. Full WebRTC/HLS integration is Phase 2.
 */
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.mjs';
import { requireTier } from '../middleware/requireTier.mjs';
import logger from '../utils/logger.mjs';
import {
  isMissingTableError,
  respondComingSoon,
  respondComingSoonWrite,
} from './featureAvailability.mjs';

const COMING_SOON = 'Live streaming coming soon';

const router = Router();

// All live streaming routes require Crystalline tier
router.use(authenticateToken, requireTier('elite', 'live.streaming'));

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers — dynamic model import
// ─────────────────────────────────────────────────────────────

async function getModels() {
  const mod = await import('../models/social/enhanced/LiveStreaming.mjs');
  return {
    LiveStream: mod.LiveStream,
    LiveStreamViewer: mod.LiveStreamViewer,
    LiveStreamChat: mod.LiveStreamChat,
    LiveStreamPoll: mod.LiveStreamPoll,
  };
}

// ─────────────────────────────────────────────────────────────
// SECTION: Routes
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/live-streams
 * List upcoming and live streams
 */
router.get('/', async (req, res) => {
  try {
    const { LiveStream } = await getModels();
    const streams = await LiveStream.findAll({
      where: { status: ['scheduled', 'live'] },
      order: [['scheduledStartTime', 'ASC']],
      limit: 20,
    });
    res.json({ streams });
  } catch (err) {
    // Only a missing table means "not built yet". Anything else is a real failure and must not be
    // renamed "coming soon" — that hid outages from users and from the logs (SWA-101).
    if (isMissingTableError(err)) {
      logger.warn('LiveStreams table absent — serving coming-soon', { error: err.message });
      return respondComingSoon(res, { streams: [] }, COMING_SOON);
    }
    logger.error('Error fetching live streams', { error: err.message });
    res.status(500).json({ message: 'Error fetching live streams' });
  }
});

/**
 * GET /api/live-streams/trending
 * Get trending/popular streams
 */
router.get('/trending', async (req, res) => {
  try {
    const { LiveStream } = await getModels();
    const streams = await LiveStream.getTrendingStreams?.() || [];
    res.json({ streams });
  } catch (err) {
    if (isMissingTableError(err)) {
      logger.warn('LiveStreams table absent — serving coming-soon', { error: err.message });
      return respondComingSoon(res, { streams: [] }, COMING_SOON);
    }
    logger.error('Error fetching trending streams', { error: err.message });
    res.status(500).json({ message: 'Error fetching trending streams' });
  }
});

/**
 * GET /api/live-streams/:id
 * Get stream details
 */
router.get('/:id', async (req, res) => {
  try {
    const { LiveStream } = await getModels();
    const stream = await LiveStream.findByPk(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    res.json({ stream });
  } catch (err) {
    // Was an unguarded 500: a client following a stream link saw a broken page rather than an
    // honest "not available yet" (SWA-101).
    if (isMissingTableError(err)) {
      logger.warn('LiveStreams table absent — serving coming-soon', { error: err.message });
      return respondComingSoon(res, { stream: null }, COMING_SOON);
    }
    logger.error('Error fetching stream', { error: err.message });
    res.status(500).json({ message: 'Error fetching stream details' });
  }
});

/**
 * POST /api/live-streams
 * Schedule a new stream (trainer/admin only)
 */
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    if (!['admin', 'trainer'].includes(user.role)) {
      return res.status(403).json({ message: 'Only trainers and admins can create streams' });
    }

    const { LiveStream } = await getModels();
    const stream = await LiveStream.startStream?.({
      streamerId: user.id,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || 'workout',
      visibility: req.body.visibility || 'public',
      scheduledStartTime: req.body.scheduledStartTime,
    }) || await LiveStream.create({
      streamerId: user.id,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || 'workout',
      status: 'scheduled',
      visibility: req.body.visibility || 'public',
    });

    res.status(201).json({ stream });
  } catch (err) {
    // WRITE path: 503, never a 200 "coming soon" — the stream was not created and the trainer
    // must not be told otherwise (SWA-101).
    if (isMissingTableError(err)) {
      logger.warn('LiveStreams table absent — refusing create', { error: err.message });
      return respondComingSoonWrite(res, COMING_SOON);
    }
    logger.error('Error creating stream', { error: err.message });
    res.status(500).json({ message: 'Error creating stream' });
  }
});

/**
 * GET /api/live-streams/config
 * Feature configuration
 */
router.get('/config', (_req, res) => {
  res.json({
    enabled: false,
    status: 'coming_soon',
    categories: ['workout', 'cardio', 'strength', 'flexibility', 'nutrition', 'motivation'],
    maxDuration: 3600,
  });
});

export default router;
