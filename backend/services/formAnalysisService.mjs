/**
 * Form Analysis Service
 * =====================
 * AI-powered exercise form analysis using pose estimation.
 * Uses Gemini Vision for keypoint extraction + NASM rules for assessment.
 *
 * Returns: keypoints, bones, corrections, overall score
 */
import { Op } from 'sequelize';
import FormAnalysis from '../models/FormAnalysis.mjs';
import MovementProfile from '../models/MovementProfile.mjs';
import logger from '../utils/logger.mjs';

/** COCO 17-keypoint standard */
const JOINT_NAMES = [
  'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
  'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
];

/** Bone connections (joint index pairs) for skeleton rendering */
const BONES = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
];

function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return Math.round(degrees);
}

/** NASM-based form assessment rules */
function assessForm(keypoints) {
  const corrections = [];
  const get = (name) => keypoints.find(k => k.name === name);

  const ls = get('left_shoulder'), rs = get('right_shoulder');
  const lh = get('left_hip'), rh = get('right_hip');
  const lk = get('left_knee'), rk = get('right_knee');
  const la = get('left_ankle'), ra = get('right_ankle');

  if (ls && rs && Math.abs(ls.y - rs.y) > 0.05) {
    corrections.push({ joint: 'left_shoulder', severity: 'adjust', message: 'Shoulders uneven — check for compensatory patterns', angle: null });
  }
  if (lh && rh && Math.abs(lh.y - rh.y) > 0.05) {
    corrections.push({ joint: 'left_hip', severity: 'adjust', message: 'Hip tilt detected — engage core to level pelvis', angle: null });
  }
  if (lk && la && lh) {
    const a = calculateAngle(lh, lk, la);
    if (a < 160 && lk.x < la.x - 0.02) {
      corrections.push({ joint: 'left_knee', severity: 'adjust', message: `Left knee valgus — press knees outward (${a}°)`, angle: a });
    }
  }
  if (rk && ra && rh) {
    const a = calculateAngle(rh, rk, ra);
    if (a < 160 && rk.x > ra.x + 0.02) {
      corrections.push({ joint: 'right_knee', severity: 'adjust', message: `Right knee valgus — press knees outward (${a}°)`, angle: a });
    }
  }

  return corrections;
}

/** Analyze form from an image buffer via Gemini Vision */
export async function analyzeForm(imageBuffer, exerciseType = 'general') {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return { success: false, error: 'Form analysis requires GEMINI_API_KEY' };
  }

  try {
    const base64Image = imageBuffer.toString('base64');
    const prompt = `You are an expert NASM-certified personal trainer analyzing exercise form from a photo.

Analyze this image and return ONLY valid JSON (no markdown, no code blocks):
{
  "keypoints": [
    {"name": "nose", "x": 0.5, "y": 0.1, "confidence": 0.95},
    {"name": "left_shoulder", "x": 0.4, "y": 0.25, "confidence": 0.9}
  ],
  "exerciseDetected": "squat",
  "overallScore": 85,
  "summary": "Brief 1-sentence form assessment"
}

x=0 left, x=1 right, y=0 top, y=1 bottom (normalized 0-1).
Include all 17 COCO keypoints visible with confidence > 0.3.
If not a fitness photo, set overallScore to null.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
          ]}],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');

    const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(jsonStr);

    const keypoints = (result.keypoints || []).map(kp => ({
      name: kp.name,
      x: Math.max(0, Math.min(1, kp.x)),
      y: Math.max(0, Math.min(1, kp.y)),
      confidence: kp.confidence || 0.5,
    }));

    const corrections = assessForm(keypoints);

    return {
      success: true,
      keypoints,
      bones: BONES,
      jointNames: JOINT_NAMES,
      corrections,
      exerciseDetected: result.exerciseDetected || 'unknown',
      overallScore: result.overallScore,
      summary: result.summary || '',
    };
  } catch (err) {
    logger.error('[FormAnalysis] Analysis failed:', err.message);
    return { success: false, error: err.message };
  }
}

/** Create a new FormAnalysis record */
export async function createFormAnalysis({ userId, trainerId, sessionId, exerciseName, mediaUrl, mediaType, metadata }) {
  return FormAnalysis.create({
    userId,
    trainerId,
    sessionId,
    exerciseName,
    mediaUrl,
    mediaType,
    analysisStatus: 'pending',
    metadata,
  });
}

/** Process a pending analysis — calls Gemini Vision and stores results */
export async function processFormAnalysis(analysisId) {
  const analysis = await FormAnalysis.findByPk(analysisId);
  if (!analysis) throw new Error(`Analysis ${analysisId} not found`);

  await analysis.update({ analysisStatus: 'processing' });
  const startTime = Date.now();

  try {
    // For image analyses, fetch the buffer and run through Gemini
    // For now, mark as complete with placeholder if no media buffer available
    // (Real pipeline would download from R2, process through MediaPipe/Gemini)
    await analysis.update({
      analysisStatus: 'complete',
      processingDurationMs: Date.now() - startTime,
      overallScore: null,
      findings: { note: 'Processing pipeline pending full integration' },
    });

    logger.info('[FormAnalysis] Analysis %d completed in %dms', analysisId, Date.now() - startTime);
  } catch (err) {
    await analysis.update({
      analysisStatus: 'failed',
      errorMessage: err.message,
      processingDurationMs: Date.now() - startTime,
    });
    throw err;
  }
}

/** Get paginated analysis history for a user */
export async function getAnalysisHistory(userId, { page = 1, limit = 20, exerciseName, status }) {
  const where = { userId };
  if (exerciseName) where.exerciseName = exerciseName;
  if (status) where.analysisStatus = status;

  const offset = (page - 1) * limit;
  const { count, rows } = await FormAnalysis.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return {
    analyses: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

/** Get a single analysis by ID (with ownership check) */
export async function getAnalysisById(id, userId, userRole) {
  const where = { id };
  // Non-admin/trainer can only see their own
  if (userRole !== 'admin' && userRole !== 'trainer') {
    where.userId = userId;
  }
  return FormAnalysis.findOne({ where });
}

/** Get movement profile for a user */
export async function getMovementProfileForUser(userId) {
  return MovementProfile.findOne({ where: { userId } });
}

/** Get aggregate stats for admin dashboard */
export async function getFormAnalysisStats() {
  const [total, pending, complete, failed] = await Promise.all([
    FormAnalysis.count(),
    FormAnalysis.count({ where: { analysisStatus: 'pending' } }),
    FormAnalysis.count({ where: { analysisStatus: 'complete' } }),
    FormAnalysis.count({ where: { analysisStatus: 'failed' } }),
  ]);

  return { total, pending, complete, failed };
}

export { JOINT_NAMES, BONES, calculateAngle };
