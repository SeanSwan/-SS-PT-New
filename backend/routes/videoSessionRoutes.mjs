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
import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';
import livekit from '../services/livekitService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// All routes require auth
router.use(protect);

function sameUserId(left, right) {
  return String(left) === String(right);
}

function isSessionTrainer(session, userId, userRole) {
  return userRole === 'admin' || sameUserId(userId, session.trainerId);
}

function isSessionParticipant(session, userId, userRole) {
  return isSessionTrainer(session, userId, userRole) || sameUserId(userId, session.clientId);
}

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
router.post('/', authorize(['admin', 'trainer']), verifyClientAccessByUserId({ bodyField: 'clientId' }), async (req, res) => {
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
    const isTrainer = isSessionTrainer(session, userId, req.user.role);
    const isClient = sameUserId(userId, session.clientId);

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
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
    if (!session) return res.status(status).json({ success: false, message: error });

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

// ── Save Trainer Notes (trainer/admin) ───────────────────────
// PATCH /api/video-sessions/:id/notes
router.patch('/:id/notes', authorize(['admin', 'trainer']), async (req, res) => {
  const { trainerNotes } = req.body;
  if (trainerNotes == null || typeof trainerNotes !== 'string') {
    return res.status(400).json({ success: false, message: 'trainerNotes (string) is required' });
  }
  // Empty string is allowed — trainer can clear notes

  try {
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
    if (!session) return res.status(status).json({ success: false, message: error });

    await session.update({ trainerNotes });
    logger.info(`[AUDIT] Trainer ${req.user.id} saved notes for video session ${session.id}`);
    res.json({ success: true, data: { trainerNotes: session.trainerNotes } });
  } catch (err) {
    logger.error('Failed to save session notes:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save notes' });
  }
});

// ── Trigger Micro-Win (trainer/admin) ────────────────────────
// POST /api/video-sessions/:id/micro-win
router.post('/:id/micro-win', authorize(['admin', 'trainer']), async (req, res) => {
  const { type } = req.body;
  const validTypes = ['perfect_form', 'great_rep', 'full_rom', 'consistency', 'improvement'];

  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ success: false, message: `type must be one of: ${validTypes.join(', ')}` });
  }

  // XP values per type
  const XP_MAP = { perfect_form: 25, great_rep: 10, full_rom: 15, consistency: 10, improvement: 50 };

  try {
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);

    if (!session) return res.status(status).json({ success: false, message: error });

    if (session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Session not active' });
    }

    // Award XP to client via gamification
    try {
      const { default: Gamification } = await import('../models/Gamification.mjs');
      const gam = await Gamification.findOne({ where: { userId: session.clientId } });
      if (gam) {
        await gam.update({
          experience: (gam.experience || 0) + XP_MAP[type],
          totalXP: (gam.totalXP || 0) + XP_MAP[type],
        });
      }
    } catch { /* gamification XP is best-effort */ }

    logger.info(`[AUDIT] Trainer ${req.user.id} triggered micro-win "${type}" (+${XP_MAP[type]} XP) for client ${session.clientId}`);

    res.json({ success: true, data: { type, xp: XP_MAP[type], clientId: session.clientId } });
  } catch (err) {
    logger.error('Failed to trigger micro-win:', err.message);
    res.status(500).json({ success: false, message: 'Failed to trigger micro-win' });
  }
});

// ── List Video Sessions (admin) ──────────────────────────────
// GET /api/video-sessions
router.get('/', authorize(['admin', 'trainer']), async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const { default: VideoSession } = await import('../models/VideoSession.mjs');
    const where = req.user.role === 'admin' ? undefined : { trainerId: req.user.id };
    const sessions = await VideoSession.findAll({
      where,
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
    if (!isSessionParticipant(session, req.user.id, req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: session });
  } catch (err) {
    logger.error('Failed to get video session:', err.message);
    res.status(500).json({ success: false, message: 'Failed to get session' });
  }
});

// ── Phase 3: Participant ownership check ───────────────────────
async function getSessionIfParticipant(sessionId, userId, userRole) {
  const { default: VideoSession } = await import('../models/VideoSession.mjs');
  const session = await VideoSession.findByPk(sessionId);
  if (!session) return { session: null, error: 'Session not found', status: 404 };
  if (!isSessionParticipant(session, userId, userRole)) {
    return { session: null, error: 'Not authorized — you are not a participant of this session', status: 403 };
  }
  return { session, error: null, status: 200 };
}

// ── Phase 3: ROM Tracking ──────────────────────────────────────
// POST /api/video-sessions/:id/rom
router.post('/:id/rom', protect, async (req, res) => {
  const { measurements } = req.body;
  if (!Array.isArray(measurements) || measurements.length === 0) {
    return res.status(400).json({ success: false, message: 'measurements array required' });
  }

  try {
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
    if (!session) return res.status(status).json({ success: false, message: error });

    // Append to existing ROM data
    const existing = session.romData || [];
    const stamped = measurements.map(m => ({
      joint: m.joint,
      angle: m.angle,
      side: m.side || 'bilateral',
      timestamp: m.timestamp || new Date().toISOString(),
    }));
    const updated = [...existing, ...stamped];

    // Compute recovery/mobility score from ROM data
    const recoveryScore = computeRecoveryScore(updated);

    await session.update({ romData: updated, recoveryScore });

    logger.info(`[AUDIT] ROM data added to session ${req.params.id}: ${stamped.length} measurements, score=${recoveryScore}`);
    res.json({ success: true, data: { romData: updated, recoveryScore } });
  } catch (err) {
    logger.error('ROM tracking error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save ROM data' });
  }
});

// GET /api/video-sessions/:id/rom
router.get('/:id/rom', protect, async (req, res) => {
  try {
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
    if (!session) return res.status(status).json({ success: false, message: error });

    res.json({ success: true, data: { romData: session.romData || [], recoveryScore: session.recoveryScore } });
  } catch (err) {
    logger.error('ROM fetch error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch ROM data' });
  }
});

// ── Phase 3: Wearable Data Integration ─────────────────────────
// POST /api/video-sessions/:id/wearable
router.post('/:id/wearable', protect, async (req, res) => {
  const { heartRate, steps, sleepHours, hrv, source } = req.body;

  const VALID_SOURCES = ['healthkit', 'google_fit'];
  if (!source || !VALID_SOURCES.includes(source)) {
    return res.status(400).json({ success: false, message: `source must be one of: ${VALID_SOURCES.join(', ')}` });
  }

  try {
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
    if (!session) return res.status(status).json({ success: false, message: error });

    const wearableData = {
      heartRate: heartRate || null,
      steps: steps || null,
      sleepHours: sleepHours || null,
      hrv: hrv || null,
      source,
      syncedAt: new Date().toISOString(),
    };

    await session.update({ wearableData });

    logger.info(`[AUDIT] Wearable data synced to session ${req.params.id} from ${source}`);
    res.json({ success: true, data: { wearableData } });
  } catch (err) {
    logger.error('Wearable sync error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to sync wearable data' });
  }
});

// GET /api/video-sessions/:id/wearable
router.get('/:id/wearable', protect, async (req, res) => {
  try {
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
    if (!session) return res.status(status).json({ success: false, message: error });

    res.json({ success: true, data: { wearableData: session.wearableData } });
  } catch (err) {
    logger.error('Wearable fetch error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch wearable data' });
  }
});

// ── Phase 3: Transcription (Deepgram) ──────────────────────────
// POST /api/video-sessions/:id/transcribe
router.post('/:id/transcribe', protect, authorize(['admin', 'trainer']), async (req, res) => {
  try {
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
    if (!session) return res.status(status).json({ success: false, message: error });

    if (!session.recordingUrl) {
      return res.status(400).json({ success: false, message: 'No recording available for transcription' });
    }

    if (session.transcriptionStatus === 'processing') {
      return res.status(409).json({ success: false, message: 'Transcription already in progress' });
    }

    await session.update({ transcriptionStatus: 'processing' });

    // Deepgram transcription (async — runs in background)
    transcribeWithDeepgram(session.id, session.recordingUrl).catch(err => {
      logger.error(`Transcription failed for session ${session.id}:`, err.message);
    });

    logger.info(`[AUDIT] Transcription started for session ${req.params.id}`);
    res.json({ success: true, data: { transcriptionStatus: 'processing' } });
  } catch (err) {
    logger.error('Transcription start error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to start transcription' });
  }
});

// GET /api/video-sessions/:id/transcription
router.get('/:id/transcription', protect, async (req, res) => {
  try {
    const { session, error, status } = await getSessionIfParticipant(req.params.id, req.user.id, req.user.role);
    if (!session) return res.status(status).json({ success: false, message: error });

    res.json({
      success: true,
      data: {
        transcription: session.transcription,
        status: session.transcriptionStatus,
      },
    });
  } catch (err) {
    logger.error('Transcription fetch error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch transcription' });
  }
});

// ── Recovery Score Computation ─────────────────────────────────
function computeRecoveryScore(romData) {
  if (!romData || romData.length === 0) return null;

  // Normal ROM ranges (degrees) by joint
  const NORMAL_ROM = {
    shoulder_flexion: 180,
    shoulder_extension: 60,
    shoulder_abduction: 180,
    elbow_flexion: 145,
    hip_flexion: 120,
    hip_extension: 30,
    knee_flexion: 135,
    knee_extension: 0,
    ankle_dorsiflexion: 20,
    ankle_plantarflexion: 50,
    cervical_flexion: 50,
    cervical_extension: 60,
    lumbar_flexion: 60,
    lumbar_extension: 25,
  };

  // Get latest measurement per joint
  const latestByJoint = {};
  for (const m of romData) {
    const key = `${m.joint}_${m.side}`;
    if (!latestByJoint[key] || m.timestamp > latestByJoint[key].timestamp) {
      latestByJoint[key] = m;
    }
  }

  const entries = Object.values(latestByJoint);
  if (entries.length === 0) return null;

  let totalPercent = 0;
  let count = 0;
  for (const m of entries) {
    const normalMax = NORMAL_ROM[m.joint];
    if (normalMax) {
      totalPercent += Math.min((m.angle / normalMax) * 100, 100);
      count++;
    }
  }

  return count > 0 ? Math.round(totalPercent / count) : null;
}

// ── Deepgram Transcription (Background) ────────────────────────
async function transcribeWithDeepgram(sessionId, recordingUrl) {
  const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
  if (!DEEPGRAM_API_KEY) {
    const { default: VideoSession } = await import('../models/VideoSession.mjs');
    await VideoSession.update(
      { transcriptionStatus: 'failed', transcription: 'Deepgram API key not configured' },
      { where: { id: sessionId } }
    );
    return;
  }

  try {
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true', {
      method: 'POST',
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: recordingUrl }),
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.status}`);
    }

    const data = await response.json();
    const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript
      || data?.results?.channels?.[0]?.alternatives?.[0]?.transcript
      || '';

    const { default: VideoSession } = await import('../models/VideoSession.mjs');
    await VideoSession.update(
      { transcription: transcript, transcriptionStatus: 'complete' },
      { where: { id: sessionId } }
    );

    logger.info(`[AUDIT] Transcription complete for session ${sessionId}: ${transcript.length} chars`);
  } catch (err) {
    const { default: VideoSession } = await import('../models/VideoSession.mjs');
    await VideoSession.update(
      { transcriptionStatus: 'failed', transcription: `Error: ${err.message}` },
      { where: { id: sessionId } }
    );
    logger.error(`Transcription failed for session ${sessionId}:`, err.message);
  }
}

export default router;
