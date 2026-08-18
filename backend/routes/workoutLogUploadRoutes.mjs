/**
 * Workout Log Upload Routes
 * ==========================
 * Endpoints for uploading voice memos and files to parse into workout logs.
 *
 * POST /api/workout-logs/upload   Upload file + get parsed workout
 * POST /api/workout-logs/history-preview   Upload history + get draft candidates
 */

import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { assertAssignmentOrAdmin } from '../middleware/verifyClientAccess.mjs';
import { transcribeAudio, extractText, isAudioFile } from '../services/voiceTranscriptionService.mjs';
import { parseWorkoutTranscript } from '../services/workoutLogParserService.mjs';
import { previewHistoricalWorkoutImport } from '../services/historicalWorkoutImportService.mjs';
import { getLastLoggedWeights, MAX_REQUESTED_NAMES } from '../services/workoutLastWeightService.mjs';
import { requireSubjectAiConsent } from '../middleware/aiConsent.mjs';
import { getAiPrivacyProfile } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();
const UNSUPPORTED_UPLOAD_MESSAGE = 'Unsupported file type. Upload an audio, text, CSV, or PDF file.';
const UPLOAD_TOO_LARGE_MESSAGE = 'File is too large. Max upload size is 20MB.';

const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseJsonArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Rate limiter: 10 uploads per 15 min per user
const uploadCounts = new Map();
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

// Cleanup stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW;
  for (const [key, times] of uploadCounts) {
    const filtered = times.filter(t => t > cutoff);
    if (filtered.length === 0) uploadCounts.delete(key);
    else uploadCounts.set(key, filtered);
  }
}, 5 * 60 * 1000).unref();

function rateLimiter(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return next();

  const key = `${userId}`;
  const now = Date.now();

  if (!uploadCounts.has(key)) uploadCounts.set(key, []);
  const timestamps = uploadCounts.get(key).filter(t => now - t < RATE_WINDOW);

  if (timestamps.length >= 10) {
    return res.status(429).json({ error: 'Upload rate limit exceeded. Max 10 uploads per 15 minutes.' });
  }

  timestamps.push(now);
  uploadCounts.set(key, timestamps);
  next();
}

// Multer for audio + text files (memory storage, 20MB limit).
// Phase 10 alignment 2026-04-14: the upstream constraint is the Gemini
// inline-data limit enforced at voiceTranscriptionService.mjs:16
// (20MB). Accepting 50MB here used to let files pass multer and then
// fail silently at the Gemini upload step with a confusing error. The
// real cap is the Gemini one; align the user-facing limit to the truth.
// The Gemini File Upload API (for >20MB audio) is a separate refactor
// scoped out of this pass.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max — aligned with Gemini inline-data cap
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      // Audio (voice memos)
      'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm',
      'audio/ogg', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
      'audio/flac', 'audio/x-wav',
      // Text / docs
      'text/plain', 'text/csv',
      'application/pdf',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('UNSUPPORTED_WORKOUT_LOG_UPLOAD_TYPE'));
    }
  },
});

function uploadFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    logger.warn('[WorkoutLogUpload] Rejected upload', {
      code: err.code || err.message,
      userId: req.user?.id,
    });

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: UPLOAD_TOO_LARGE_MESSAGE });
    }

    return res.status(400).json({ error: UNSUPPORTED_UPLOAD_MESSAGE });
  });
}

/**
 * Both upload routes send the CLIENT's session content to a third-party model
 * (`transcribeAudio` → Gemini for audio; the parser for text), so the client is
 * the data subject and the client's consent governs. `clientId` lives in the
 * multipart body, so this gate is mounted AFTER `uploadFile`.
 *
 * Fail-open on a MISSING profile only — see `requireSubjectAiConsent`. An
 * explicit opt-out or a withdrawal blocks the upload.
 */
const clientConsentGate = requireSubjectAiConsent(
  getAiPrivacyProfile,
  (req) => req.body?.clientId,
  { failOpenWhenMissing: true, label: 'workout-log-upload' },
);

async function extractTranscriptFromFile(file) {
  if (isAudioFile(file.mimetype)) {
    return transcribeAudio(file.buffer, file.originalname);
  }
  return extractText(file.buffer, file.mimetype);
}

// All routes require authentication; per-route role scopes below.
router.use(protect);

/**
 * GET /last-weights?clientId=84&names=Leg%20Press,Chest%20Press
 * Last logged weight per exercise for set-row suggestions (blueprint S5).
 * RBAC: same client-access contract as other client reads — admin any,
 * trainer needs an active assignment, client/user self only (403 otherwise).
 * Empty `weights:{}` is a SUCCESS (no history is not an error).
 */
router.get('/last-weights', authorize(['admin', 'trainer', 'client', 'user']), async (req, res) => {
  const clientId = parseStrictPositiveInteger(req.query.clientId);
  const names = (typeof req.query.names === 'string' ? req.query.names : '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, MAX_REQUESTED_NAMES);
  if (!clientId || names.length === 0) {
    return res.status(400).json({ success: false, error: 'clientId and names are required.' });
  }
  const allowed = await assertAssignmentOrAdmin(req.user?.id, req.user?.role, clientId);
  if (!allowed) {
    return res.status(403).json({ success: false, error: 'You do not have access to this client.' });
  }
  const { weights } = await getLastLoggedWeights(clientId, names);
  return res.json({ success: true, weights });
});

const SELF_VOICE_UPLOAD_ROLES = new Set(['client', 'user']);

/**
 * Phase 3c.3 (launch charter): voice-log access scope, pure + exported for tests.
 * - admin/trainer: any client (unchanged coaching flow).
 * - client/user: SELF ONLY — requestedClientId must equal the caller's id.
 *   The check runs IN-HANDLER (clientId arrives in the multipart body, which
 *   multer parses after route-level middleware). Fails closed on anything else.
 * Rule 8 note: the parser already redacts the transcript + never sends the
 * client name to the LLM (workoutLogParserService.mjs:112,433).
 */
export const resolveVoiceUploadScope = ({ role, requestedClientId, userId }) => {
  const normalizedRole = String(role || '').toLowerCase();
  if (normalizedRole === 'admin' || normalizedRole === 'trainer') {
    return { allowed: true, selfMode: false };
  }
  if (SELF_VOICE_UPLOAD_ROLES.has(normalizedRole)) {
    const allowed =
      Number.isInteger(requestedClientId) &&
      Number.isInteger(userId) &&
      requestedClientId === userId;
    return { allowed, selfMode: true };
  }
  return { allowed: false, selfMode: false };
};

/**
 * POST /upload -- Upload voice memo or text file, get parsed workout
 * (admin/trainer for any client; client/user for SELF only — Phase 3c.3)
 */
router.post('/upload', authorize(['admin', 'trainer', 'client', 'user']), rateLimiter, uploadFile, clientConsentGate, async (req, res) => {
  try {
    // S7 (JARVIS §6.2): the voice lane sends an already-transcribed `transcript`
    // text field — same route, same parser, no file required. Field addition
    // per ruling A9 (no new endpoints anywhere in this program).
    const directTranscript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
    if (!req.file && !directTranscript) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { clientId, date, sessionId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const parsedClientId = parseStrictPositiveInteger(clientId);
    const parsedTrainerId = parseStrictPositiveInteger(req.user?.id);
    const parsedSessionId = sessionId ? parseStrictPositiveInteger(sessionId) : null;

    if (!parsedClientId) {
      return res.status(400).json({ error: 'Valid clientId is required' });
    }

    if (!parsedTrainerId) {
      return res.status(400).json({ error: 'Valid trainer identity is required' });
    }

    const scope = resolveVoiceUploadScope({
      role: req.user?.role,
      requestedClientId: parsedClientId,
      userId: parsedTrainerId,
    });
    if (!scope.allowed) {
      return res.status(403).json({ error: 'You can only upload voice logs for your own workouts' });
    }

    if (sessionId && !parsedSessionId) {
      return res.status(400).json({ error: 'Valid sessionId is required' });
    }

    const file = req.file;

    logger.info('[WorkoutLogUpload] Processing upload', {
      trainerId: parsedTrainerId,
      clientId: parsedClientId,
      filename: file ? file.originalname : '(direct transcript field)',
      mimetype: file ? file.mimetype : 'text/plain',
      size: file ? file.size : directTranscript.length,
    });

    // Step 1: Get transcript (direct field wins; file path unchanged)
    const transcript = directTranscript || await extractTranscriptFromFile(file);

    if (!transcript || transcript.trim().length < 5) {
      return res.status(422).json({ error: 'Could not extract meaningful text from file' });
    }

    // Step 2: Parse transcript into workout structure
    const parsedWorkout = await parseWorkoutTranscript({
      transcript,
      clientId: parsedClientId,
      trainerId: parsedTrainerId,
      date: date || undefined,
    });

    // Step 3: Return for trainer review
    res.json({
      success: true,
      transcript,
      parsedWorkout,
      metadata: {
        filename: file ? file.originalname : 'transcript-field',
        mimetype: file ? file.mimetype : 'text/plain',
        size: file ? file.size : transcript.length,
        clientId: parsedClientId,
        trainerId: parsedTrainerId,
        sessionId: parsedSessionId,
      },
    });
  } catch (err) {
    logger.error('[WorkoutLogUpload] Upload failed', { error: err.message, stack: err.stack });

    // S7 fail-closed privacy gate: redaction failure is a 4xx, never a retry-me 500.
    if (err?.message === 'REDACTION_FAILED') {
      return res.status(422).json({ error: 'Could not safely process this transcript. Please edit it and try again.' });
    }
    res.status(500).json({ error: 'Failed to process upload. Please try again.' });
  }
});

/**
 * POST /history-preview -- Upload historical records, get draft-only candidates.
 */
router.post('/history-preview', authorize(['admin', 'trainer']), rateLimiter, uploadFile, clientConsentGate, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { clientId, sourceLabel, lastWorkoutNotes } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const parsedClientId = parseStrictPositiveInteger(clientId);
    const parsedTrainerId = parseStrictPositiveInteger(req.user?.id);

    if (!parsedClientId) {
      return res.status(400).json({ error: 'Valid clientId is required' });
    }

    if (!parsedTrainerId) {
      return res.status(400).json({ error: 'Valid trainer identity is required' });
    }

    const file = req.file;
    logger.info('[WorkoutLogUpload] Processing historical preview upload', {
      trainerId: parsedTrainerId,
      clientId: parsedClientId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const transcript = await extractTranscriptFromFile(file);
    if (!transcript || transcript.trim().length < 5) {
      return res.status(422).json({ error: 'Could not extract meaningful text from file' });
    }

    const preview = await previewHistoricalWorkoutImport({
      transcript,
      clientId: parsedClientId,
      trainerId: parsedTrainerId,
      knownDates: parseJsonArrayField(req.body.knownDates),
      missingDates: parseJsonArrayField(req.body.missingDates),
      sourceLabel: sourceLabel || 'External historical import',
      lastWorkoutNotes: lastWorkoutNotes || '',
    });

    res.json({
      success: true,
      draftOnly: true,
      transcript,
      drafts: preview.drafts,
      missingDraftRequests: preview.missingDraftRequests,
      metadata: {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        clientId: parsedClientId,
        trainerId: parsedTrainerId,
        parsedDrafts: preview.drafts.length,
        missingDraftRequests: preview.missingDraftRequests.length,
        parsedEntryCount: preview.parsedEntryCount,
        skippedKnownDates: preview.skippedKnownDates,
        truncated: preview.truncated,
      },
    });
  } catch (err) {
    logger.error('[WorkoutLogUpload] Historical preview failed', { error: err.message, stack: err.stack });

    res.status(500).json({ error: 'Failed to preview historical workout import. Please try again.' });
  }
});

export default router;
