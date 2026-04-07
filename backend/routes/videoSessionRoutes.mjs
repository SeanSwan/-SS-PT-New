/**
 * ┌─── ROUTES: Video Session Management ───────────────────────┐
 * │ PREFIX: /api/video-sessions                                 │
 * │ AUTH: protect (all), authorize(['admin', 'trainer']) (create/manage)              │
 * │ PURPOSE: Create video rooms, generate join tokens, manage   │
 * │          remote assessment sessions via LiveKit.            │
 * │ CEO RULING: 2026-04-07 — LiveKit, pre-call check, Step     │
 * │          Back Mode, FDA wellness disclaimer.                │
 * └────────────────────────────────────────────────────────────┘
 */

import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import livekit from '../services/livekitService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// All routes require auth
router.use(protect);

// ── Health Check (any authenticated user) ────────────────────
// GET /api/video-sessions/health
router.get('/health', async (_req, res) => {
  try {
    const health = await livekit.checkHealth();
    res.json({ success: true, data: health });
  } catch (err) {
    logger.error('Video session health check failed:', err.message);
    res.status(500).json({ success: false, message: 'Health check failed' });
  }
});

// ── Create Video Session (admin/trainer only) ────────────────
// POST /api/video-sessions
router.post('/', authorize(['admin', 'trainer']), async (req, res) => {
  const { clientId, sessionId, assessmentType } = req.body;

  if (!clientId) {
    return res.status(400).json({ success: false, message: 'clientId is required' });
  }

  try {
    // Lazy import model to avoid circular deps
    const { default: VideoSession } = await import('../models/VideoSession.mjs');

    const roomName = livekit.createRoomName(req.user.id, clientId);

    // Generate trainer token
    const trainerToken = await livekit.generateToken(
      roomName,
      req.user.username || 'Trainer',
      String(req.user.id),
      true // isTrainer
    );

    // Generate client token
    const clientToken = await livekit.generateToken(
      roomName,
      `Client-${clientId}`,
      String(clientId),
      false
    );

    // Create database record
    const videoSession = await VideoSession.create({
      trainerId: req.user.id,
      clientId,
      sessionId: sessionId || null,
      livekitRoomName: roomName,
      assessmentType: assessmentType || 'general',
      status: 'pending',
      joinToken: clientToken,
    });

    logger.info(`[AUDIT] Admin ${req.user.id} created video session ${videoSession.id} for client ${clientId}`);

    const connInfo = livekit.getConnectionInfo();

    res.status(201).json({
      success: true,
      data: {
        videoSessionId: videoSession.id,
        roomName,
        livekitUrl: connInfo.url,
        trainerToken,
        clientToken,
        assessmentType: videoSession.assessmentType,
      },
    });
  } catch (err) {
    logger.error('Failed to create video session:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create video session' });
  }
});

// ── Join Video Session (client or trainer) ───────────────────
// GET /api/video-sessions/:id/join
router.get('/:id/join', async (req, res) => {
  try {
    const { default: VideoSession } = await import('../models/VideoSession.mjs');
    const session = await VideoSession.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Video session not found' });
    }

    // Verify user is participant
    const userId = req.user.id;
    const isTrainer = userId === session.trainerId || req.user.role === 'admin';
    const isClient = userId === session.clientId;

    if (!isTrainer && !isClient) {
      return res.status(403).json({ success: false, message: 'Not a participant in this session' });
    }

    // Generate fresh token
    const token = await livekit.generateToken(
      session.livekitRoomName,
      req.user.username || (isTrainer ? 'Trainer' : 'Client'),
      String(userId),
      isTrainer
    );

    // Mark as active if first join
    if (session.status === 'pending') {
      await session.update({ status: 'active', startedAt: new Date() });
    }

    const connInfo = livekit.getConnectionInfo();

    res.json({
      success: true,
      data: {
        videoSessionId: session.id,
        roomName: session.livekitRoomName,
        livekitUrl: connInfo.url,
        token,
        assessmentType: session.assessmentType,
        isTrainer,
        disclaimer: 'SwanStudios provides fitness and movement efficiency insights, not medical diagnoses.',
      },
    });
  } catch (err) {
    logger.error('Failed to join video session:', err.message);
    res.status(500).json({ success: false, message: 'Failed to join session' });
  }
});

// ── End Video Session (trainer only) ─────────────────────────
// PATCH /api/video-sessions/:id/end
router.patch('/:id/end', authorize(['admin', 'trainer']), async (req, res) => {
  try {
    const { default: VideoSession } = await import('../models/VideoSession.mjs');
    const session = await VideoSession.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Video session not found' });
    }

    const endedAt = new Date();
    const durationMinutes = session.startedAt
      ? Math.round((endedAt.getTime() - new Date(session.startedAt).getTime()) / 60000)
      : 0;

    await session.update({
      status: 'completed',
      endedAt,
      durationMinutes,
      trainerNotes: req.body.trainerNotes || session.trainerNotes,
    });

    logger.info(`[AUDIT] Admin ${req.user.id} ended video session ${session.id} (${durationMinutes}min)`);

    res.json({ success: true, data: session });
  } catch (err) {
    logger.error('Failed to end video session:', err.message);
    res.status(500).json({ success: false, message: 'Failed to end session' });
  }
});

// ── List Video Sessions (admin) ──────────────────────────────
// GET /api/video-sessions
router.get('/', authorize(['admin', 'trainer']), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const { default: VideoSession } = await import('../models/VideoSession.mjs');
    const sessions = await VideoSession.findAll({
      order: [['createdAt', 'DESC']],
      limit,
    });
    res.json({ success: true, data: sessions });
  } catch (err) {
    logger.error('Failed to list video sessions:', err.message);
    res.status(500).json({ success: false, message: 'Failed to list sessions' });
  }
});

// ── Get Single Video Session ─────────────────────────────────
// GET /api/video-sessions/:id
router.get('/:id', async (req, res) => {
  try {
    const { default: VideoSession } = await import('../models/VideoSession.mjs');
    const session = await VideoSession.findByPk(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Video session not found' });
    }

    // Only participants can view
    const userId = req.user.id;
    if (userId !== session.trainerId && userId !== session.clientId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: session });
  } catch (err) {
    logger.error('Failed to get video session:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get session' });
  }
});

export default router;
