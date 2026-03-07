/**
 * Form Analysis Service
 * =====================
 * Orchestrates the form analysis pipeline:
 *   1. Upload media to R2
 *   2. Queue analysis job
 *   3. Call Python FastAPI service (MediaPipe + rule engine)
 *   4. Store results in FormAnalysis table
 *   5. Update MovementProfile aggregation
 *
 * Graceful degradation: If R2 is unavailable, stores local path.
 * If Python service is unavailable, marks job as failed with retry info.
 */
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.mjs';
import { getFormAnalysis, getMovementProfile } from '../models/index.mjs';

// Python form analysis service URL
const FORM_ANALYSIS_SERVICE_URL = process.env.FORM_ANALYSIS_URL || 'http://localhost:8100';

/**
 * Create a new form analysis record (pending status).
 */
export async function createFormAnalysis({ userId, trainerId, sessionId, exerciseName, mediaUrl, mediaType, metadata }) {
  const FormAnalysis = getFormAnalysis();

  const analysis = await FormAnalysis.create({
    userId,
    trainerId: trainerId || null,
    sessionId: sessionId || null,
    exerciseName,
    mediaUrl,
    mediaType,
    analysisStatus: 'pending',
    metadata: metadata || null,
  });

  logger.info('[FormAnalysis] Created analysis %d for user %d, exercise: %s', analysis.id, userId, exerciseName);
  return analysis;
}

/**
 * Process a form analysis by calling the Python service.
 * Updates the FormAnalysis record with results.
 */
export async function processFormAnalysis(analysisId) {
  const FormAnalysis = getFormAnalysis();
  const analysis = await FormAnalysis.findByPk(analysisId);

  if (!analysis) {
    throw new Error(`FormAnalysis ${analysisId} not found`);
  }

  const startTime = Date.now();

  try {
    // Mark as processing
    await analysis.update({ analysisStatus: 'processing' });

    // Call Python service
    const response = await fetch(`${FORM_ANALYSIS_SERVICE_URL}/analyze-exercise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_name: analysis.exerciseName,
        video_url: analysis.mediaUrl,
        // The Python service will download and process the video
      }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Python service returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const processingDuration = Date.now() - startTime;

    // Store results
    await analysis.update({
      analysisStatus: 'complete',
      overallScore: Math.round(result.avg_score || 0),
      repCount: result.total_reps || 0,
      findings: {
        jointAngles: result.joint_angle_summary || {},
        compensations: result.compensations || [],
        repScores: result.rep_scores || [],
        reps: result.reps || [],
        fatigueDetected: result.fatigue_detected || false,
        fatigueOnsetRep: result.fatigue_onset_rep || null,
        tempoAnalysis: result.tempo_analysis || {},
        symmetryScore: null, // calculated from bilateral comparison
        rangeOfMotionPercent: null, // calculated from angle data
      },
      recommendations: result.corrective_recommendations || [],
      coachingFeedback: result.coaching_feedback || {},
      processingDurationMs: processingDuration,
    });

    logger.info(
      '[FormAnalysis] Completed analysis %d: score=%d, reps=%d, compensations=%d, duration=%dms',
      analysisId, analysis.overallScore, analysis.repCount,
      (result.compensations || []).length, processingDuration
    );

    // Update movement profile in background (best-effort)
    updateMovementProfile(analysis.userId, analysis).catch(err => {
      logger.error('[FormAnalysis] Failed to update movement profile for user %d:', analysis.userId, err.message);
    });

    return analysis;
  } catch (error) {
    const processingDuration = Date.now() - startTime;

    await analysis.update({
      analysisStatus: 'failed',
      errorMessage: error.message,
      processingDurationMs: processingDuration,
    });

    logger.error('[FormAnalysis] Analysis %d failed after %dms: %s', analysisId, processingDuration, error.message);
    throw error;
  }
}

/**
 * Get analysis history for a user with pagination.
 */
export async function getAnalysisHistory(userId, { page = 1, limit = 20, exerciseName = null, status = null } = {}) {
  const FormAnalysis = getFormAnalysis();

  const where = { userId };
  if (exerciseName) where.exerciseName = exerciseName;
  if (status) where.analysisStatus = status;

  const offset = (page - 1) * limit;

  const { rows, count } = await FormAnalysis.findAndCountAll({
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

/**
 * Get a single analysis by ID with ownership check.
 */
export async function getAnalysisById(analysisId, requestingUserId, requestingUserRole) {
  const FormAnalysis = getFormAnalysis();

  const analysis = await FormAnalysis.findByPk(analysisId);
  if (!analysis) return null;

  // Ownership check: admin/trainer can view any, client can only view own
  if (requestingUserRole !== 'admin' && requestingUserRole !== 'trainer') {
    if (analysis.userId !== requestingUserId) return null;
  }

  return analysis;
}

/**
 * Update the MovementProfile with data from a completed analysis.
 * Creates the profile if it doesn't exist.
 */
async function updateMovementProfile(userId, analysis) {
  const MovementProfile = getMovementProfile();

  let profile = await MovementProfile.findOne({ where: { userId } });

  if (!profile) {
    profile = await MovementProfile.create({
      userId,
      totalAnalyses: 0,
      commonCompensations: [],
      improvementTrend: [],
      exerciseScores: {},
    });
  }

  const findings = analysis.findings || {};
  const compensations = findings.compensations || [];

  // Update exercise scores
  const exerciseScores = { ...(profile.exerciseScores || {}) };
  const exerciseKey = analysis.exerciseName;
  const existing = exerciseScores[exerciseKey] || { scores: [], count: 0 };
  existing.scores = [...(existing.scores || []), analysis.overallScore].slice(-20); // keep last 20
  existing.count = (existing.count || 0) + 1;
  existing.avg = Math.round(existing.scores.reduce((a, b) => a + b, 0) / existing.scores.length);
  existing.lastScore = analysis.overallScore;
  existing.lastDate = new Date().toISOString();

  // Determine trend
  if (existing.scores.length >= 3) {
    const recent = existing.scores.slice(-3);
    const older = existing.scores.slice(-6, -3);
    if (older.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      existing.trend = recentAvg > olderAvg + 2 ? 'improving' : recentAvg < olderAvg - 2 ? 'declining' : 'stable';
    }
  }
  exerciseScores[exerciseKey] = existing;

  // Update common compensations
  const commonComps = [...(profile.commonCompensations || [])];
  for (const comp of compensations) {
    const idx = commonComps.findIndex(c => c.type === comp.type);
    if (idx >= 0) {
      commonComps[idx].frequency = (commonComps[idx].frequency || 0) + 1;
      commonComps[idx].lastDetected = new Date().toISOString();
      // Running average severity
      const prevTotal = (commonComps[idx].avgSeverity || 0) * (commonComps[idx].frequency - 1);
      commonComps[idx].avgSeverity = (prevTotal + (comp.severity_score || 0.5)) / commonComps[idx].frequency;
    } else {
      commonComps.push({
        type: comp.type,
        frequency: 1,
        avgSeverity: comp.severity_score || 0.5,
        lastDetected: new Date().toISOString(),
        trend: 'new',
      });
    }
  }

  // Update improvement trend (keep last 50 data points)
  const trend = [...(profile.improvementTrend || [])];
  trend.push({
    date: new Date().toISOString(),
    avgScore: analysis.overallScore,
    exerciseName: analysis.exerciseName,
    compensationCount: compensations.length,
  });
  const trimmedTrend = trend.slice(-50);

  await profile.update({
    exerciseScores,
    commonCompensations: commonComps,
    improvementTrend: trimmedTrend,
    totalAnalyses: (profile.totalAnalyses || 0) + 1,
    lastAnalysisAt: new Date(),
    lastAnalysisId: analysis.id,
  });

  logger.info('[MovementProfile] Updated profile for user %d: totalAnalyses=%d', userId, profile.totalAnalyses + 1);
}

/**
 * Get the movement profile for a user.
 */
export async function getMovementProfileForUser(userId) {
  const MovementProfile = getMovementProfile();
  return MovementProfile.findOne({ where: { userId } });
}

/**
 * Get form analysis stats for admin dashboard.
 */
export async function getFormAnalysisStats() {
  const FormAnalysis = getFormAnalysis();
  const { Op } = await import('sequelize');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalAnalyses, todayAnalyses, pendingAnalyses, failedAnalyses] = await Promise.all([
    FormAnalysis.count({ where: { analysisStatus: 'complete' } }),
    FormAnalysis.count({
      where: {
        analysisStatus: 'complete',
        createdAt: { [Op.gte]: today },
      },
    }),
    FormAnalysis.count({ where: { analysisStatus: 'pending' } }),
    FormAnalysis.count({ where: { analysisStatus: 'failed' } }),
  ]);

  // Get today's average score
  const todayResults = await FormAnalysis.findAll({
    where: {
      analysisStatus: 'complete',
      createdAt: { [Op.gte]: today },
    },
    attributes: ['overallScore'],
    raw: true,
  });

  const avgScoreToday = todayResults.length > 0
    ? Math.round(todayResults.reduce((sum, r) => sum + (r.overallScore || 0), 0) / todayResults.length)
    : null;

  // Recent analyses (last 10)
  const recentAnalyses = await FormAnalysis.findAll({
    where: { analysisStatus: 'complete' },
    order: [['createdAt', 'DESC']],
    limit: 10,
    attributes: ['id', 'userId', 'exerciseName', 'overallScore', 'repCount', 'createdAt'],
  });

  return {
    totalAnalyses,
    todayAnalyses,
    pendingAnalyses,
    failedAnalyses,
    avgScoreToday,
    recentAnalyses,
  };
}
