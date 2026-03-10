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

    // Calculate symmetry score from bilateral joint angle comparison
    const symmetryScore = calculateSymmetryScore(result.joint_angle_summary || {});
    // Calculate range of motion percentage from angle data relative to exercise ideal ROM
    const rangeOfMotionPercent = calculateROMPercent(result.joint_angle_summary || {}, analysis.exerciseName);

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
        symmetryScore,
        rangeOfMotionPercent,
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
 * Calculate bilateral symmetry score (0-100) from joint angle data.
 * Compares left vs right side angles for bilateral joints.
 * A perfect score (100) means both sides move identically.
 */
function calculateSymmetryScore(jointAngles) {
  if (!jointAngles || typeof jointAngles !== 'object') return null;

  const bilateralPairs = [
    ['left_elbow', 'right_elbow'],
    ['left_knee', 'right_knee'],
    ['left_hip', 'right_hip'],
    ['left_shoulder', 'right_shoulder'],
    ['left_ankle', 'right_ankle'],
  ];

  let totalDiff = 0;
  let pairsFound = 0;

  for (const [left, right] of bilateralPairs) {
    const leftAngle = jointAngles[left]?.avg ?? jointAngles[left]?.mean ?? null;
    const rightAngle = jointAngles[right]?.avg ?? jointAngles[right]?.mean ?? null;
    if (leftAngle != null && rightAngle != null) {
      // Difference as a percentage of the larger angle (capped at 100% diff)
      const maxAngle = Math.max(Math.abs(leftAngle), Math.abs(rightAngle), 1);
      const diff = Math.abs(leftAngle - rightAngle) / maxAngle;
      totalDiff += Math.min(diff, 1);
      pairsFound++;
    }
  }

  if (pairsFound === 0) return null;
  // Average difference → invert to get symmetry score (0-100)
  const avgDiff = totalDiff / pairsFound;
  return Math.round(Math.max(0, (1 - avgDiff) * 100));
}

/**
 * Calculate range of motion as a percentage of the ideal ROM for the exercise.
 * Each exercise has expected joint angle ranges based on NASM standards.
 */
function calculateROMPercent(jointAngles, exerciseName) {
  if (!jointAngles || typeof jointAngles !== 'object') return null;

  // Ideal ROM ranges per exercise (degrees) — based on NASM OPT model
  const idealROM = {
    'Squat':              { primary: 'knee', min: 50, max: 90 },       // knee flexion at bottom
    'Deadlift':           { primary: 'hip', min: 60, max: 90 },        // hip hinge angle
    'Overhead Press':     { primary: 'shoulder', min: 150, max: 180 }, // shoulder flexion at top
    'Bicep Curl':         { primary: 'elbow', min: 30, max: 140 },     // elbow flexion range
    'Lunge':              { primary: 'knee', min: 70, max: 100 },      // front knee flexion
    'Push-Up':            { primary: 'elbow', min: 70, max: 160 },     // elbow flexion range
    'Bench Press':        { primary: 'elbow', min: 70, max: 160 },     // elbow flexion range
    'Row':                { primary: 'elbow', min: 40, max: 130 },     // elbow flexion range
    'Romanian Deadlift':  { primary: 'hip', min: 50, max: 80 },        // hip hinge range
    'Hip Thrust':         { primary: 'hip', min: 70, max: 170 },       // hip extension range
    'Pull-Up':            { primary: 'elbow', min: 40, max: 160 },     // elbow flexion range
    'Tricep Extension':   { primary: 'elbow', min: 40, max: 160 },     // elbow extension range
    'Lateral Raise':      { primary: 'shoulder', min: 10, max: 90 },   // shoulder abduction
    'Front Raise':        { primary: 'shoulder', min: 10, max: 90 },   // shoulder flexion
    'Plank':              { primary: 'hip', min: 170, max: 180 },      // hip alignment
    'Leg Press':          { primary: 'knee', min: 60, max: 100 },      // knee flexion
    'Calf Raise':         { primary: 'ankle', min: 80, max: 120 },     // ankle plantarflexion
    'Face Pull':          { primary: 'shoulder', min: 60, max: 120 },  // shoulder ext rotation
  };

  const ideal = idealROM[exerciseName];
  if (!ideal) return null;

  // Find the relevant joint angles (check both sides, take average)
  const joint = ideal.primary;
  const leftKey = `left_${joint}`;
  const rightKey = `right_${joint}`;
  const centerKey = joint;

  const angles = [
    jointAngles[leftKey]?.min, jointAngles[leftKey]?.max,
    jointAngles[rightKey]?.min, jointAngles[rightKey]?.max,
    jointAngles[centerKey]?.min, jointAngles[centerKey]?.max,
  ].filter(v => v != null);

  if (angles.length === 0) return null;

  const actualMin = Math.min(...angles);
  const actualMax = Math.max(...angles);
  const actualRange = actualMax - actualMin;
  const idealRange = ideal.max - ideal.min;

  if (idealRange <= 0) return null;
  // ROM % = how much of ideal range is achieved (capped at 120% for hyperflexion)
  return Math.round(Math.min((actualRange / idealRange) * 100, 120));
}

/**
 * Determine NASM OPT phase recommendation based on aggregated movement profile.
 * Phase 1: Stabilization (score < 50, many compensations)
 * Phase 2: Strength Endurance (score 50-65)
 * Phase 3: Hypertrophy (score 65-75)
 * Phase 4: Maximal Strength (score 75-85)
 * Phase 5: Power (score 85+, minimal compensations)
 */
function calculateNASMPhase(exerciseScores, commonCompensations) {
  const exercises = Object.values(exerciseScores || {});
  if (exercises.length === 0) return 1;

  const avgScore = exercises.reduce((sum, ex) => sum + (ex.avg || 0), 0) / exercises.length;
  const compensationCount = (commonCompensations || []).filter(c => c.frequency >= 2).length;

  // Heavy compensations push down by 1 phase
  const compensationPenalty = compensationCount > 5 ? 1 : compensationCount > 2 ? 0.5 : 0;

  if (avgScore < 50) return 1;
  if (avgScore < 65 - compensationPenalty * 10) return 2;
  if (avgScore < 75 - compensationPenalty * 10) return 3;
  if (avgScore < 85 - compensationPenalty * 10) return 4;
  return 5;
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

  // Calculate NASM OPT phase recommendation from aggregated data
  const nasmPhaseRecommendation = calculateNASMPhase(exerciseScores, commonComps);

  await profile.update({
    exerciseScores,
    commonCompensations: commonComps,
    improvementTrend: trimmedTrend,
    nasmPhaseRecommendation,
    totalAnalyses: (profile.totalAnalyses || 0) + 1,
    lastAnalysisAt: new Date(),
    lastAnalysisId: analysis.id,
  });

  logger.info('[MovementProfile] Updated profile for user %d: totalAnalyses=%d, nasmPhase=%d', userId, profile.totalAnalyses + 1, nasmPhaseRecommendation);
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
