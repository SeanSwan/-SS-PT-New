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
import logger from '../utils/logger.mjs';

const router = Router();

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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { LiveStream } = await getModels();
    const streams = await LiveStream.findAll({
      where: { status: ['scheduled', 'live'] },
      order: [['scheduledStartTime', 'ASC']],
      limit: 20,
    });
    res.json({ streams });
  } catch (err) {
    logger.error('Error fetching live streams', { error: err.message });
    res.json({ streams: [], status: 'coming_soon', message: 'Live streaming coming soon' });
  }
});

/**
 * GET /api/live-streams/trending
 * Get trending/popular streams
 */
router.get('/trending', authenticateToken, async (req, res) => {
  try {
    const { LiveStream } = await getModels();
    const streams = await LiveStream.getTrendingStreams?.() || [];
    res.json({ streams });
  } catch (err) {
    logger.error('Error fetching trending streams', { error: err.message });
    res.json({ streams: [], status: 'coming_soon', message: 'Live streaming coming soon' });
  }
});

/**
 * GET /api/live-streams/:id
 * Get stream details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { LiveStream } = await getModels();
    const stream = await LiveStream.findByPk(req.params.id);
    if (!stream) return res.status(404).json({ message: 'Stream not found' });
    res.json({ stream });
  } catch (err) {
    logger.error('Error fetching stream', { error: err.message });
    res.status(500).json({ message: 'Error fetching stream details' });
  }
});

/**
 * POST /api/live-streams
 * Schedule a new stream (trainer/admin only)
 */
router.post('/', authenticateToken, async (req, res) => {
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
    logger.error('Error creating stream', { error: err.message });
    res.status(500).json({ message: 'Error creating stream' });
  }
});

/**
 * GET /api/live-streams/config
 * Feature configuration
 */
router.get('/config', authenticateToken, (_req, res) => {
  res.json({
    enabled: false,
    status: 'coming_soon',
    categories: ['workout', 'cardio', 'strength', 'flexibility', 'nutrition', 'motivation'],
    maxDuration: 3600,
  });
});

export default router;
