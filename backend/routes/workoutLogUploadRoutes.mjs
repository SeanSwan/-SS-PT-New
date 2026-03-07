/**
 * Workout Log Upload Routes
 * ==========================
 * Endpoints for uploading voice memos and files to parse into workout logs.
 *
 * POST /api/workout-logs/upload   Upload file + get parsed workout
 */

import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { transcribeAudio, extractText, isAudioFile } from '../services/voiceTranscriptionService.mjs';
import { parseWorkoutTranscript } from '../services/workoutLogParserService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

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

// Multer for audio + text files (memory storage, 50MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
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
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: audio/*, text/plain, text/csv, application/pdf`));
    }
  },
});

// All routes require authentication + admin/trainer role
router.use(protect);

/**
 * POST /upload -- Upload voice memo or text file, get parsed workout
 */
router.post('/upload', authorize('admin', 'trainer'), rateLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { clientId, date, sessionId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const trainerId = req.user.id;
    const file = req.file;

    logger.info('[WorkoutLogUpload] Processing upload', {
      trainerId,
      clientId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Step 1: Get transcript
    let transcript;
    if (isAudioFile(file.mimetype)) {
      transcript = await transcribeAudio(file.buffer, file.originalname);
    } else {
      transcript = await extractText(file.buffer, file.mimetype);
    }

    if (!transcript || transcript.trim().length < 5) {
      return res.status(422).json({ error: 'Could not extract meaningful text from file' });
    }

    // Step 2: Parse transcript into workout structure
    const parsedWorkout = await parseWorkoutTranscript({
      transcript,
      clientId: parseInt(clientId, 10),
      trainerId,
      date: date || undefined,
    });

    // Step 3: Return for trainer review
    res.json({
      success: true,
      transcript,
      parsedWorkout,
      metadata: {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        clientId: parseInt(clientId, 10),
        trainerId,
        sessionId: sessionId ? parseInt(sessionId, 10) : null,
      },
    });
  } catch (err) {
    logger.error('[WorkoutLogUpload] Upload failed', { error: err.message, stack: err.stack });

    if (err.message?.includes('file type')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message?.includes('rate limit')) {
      return res.status(429).json({ error: err.message });
    }

    res.status(500).json({ error: 'Failed to process upload. Please try again.' });
  }
});

export default router;
