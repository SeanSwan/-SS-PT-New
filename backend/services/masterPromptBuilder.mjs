/**
 * Master Prompt Builder Service v5.0
 * ===================================
 * Auto-builds a masterPromptJson from existing user data when none exists.
 * Pulls from: User, WaiverRecord, MovementAnalysis, EquipmentProfile, WorkoutSession,
 *             ClientBaselineMeasurements, ClientOnboardingQuestionnaire,
 *             ClientPainEntry, BodyMeasurement, ClientNote, Goal.
 *
 * Used by: aiWorkoutController, longHorizonController, aiChatService
 */
import { getAllModels } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { sanitizeClientText } from './ai/clientTextSanitizer.mjs';

// ── Helper Functions ──────────────────────────────────────────────────────────

function calculateTrend(measurements, field) {
  if (!measurements || measurements.length < 2) return 'insufficient_data';
  const recent = measurements[0]?.[field];
  const older = measurements[measurements.length - 1]?.[field];
  if (recent == null || older == null) return 'insufficient_data';
  const diff = recent - older;
  if (Math.abs(diff) < 0.5) return 'stable';
  return diff > 0 ? 'increasing' : 'decreasing';
}

function isWithinDays(date, days) {
  if (!date) return false;
  const d = new Date(date);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

function calculateWeeklyAverage(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const dates = sessions.map(s => new Date(s.date)).filter(d => !isNaN(d));
  if (dates.length === 0) return 0;
  const earliest = new Date(Math.min(...dates));
  const latest = new Date(Math.max(...dates));
  const weeks = Math.max(1, daysBetween(earliest, latest) / 7);
  return Math.round((dates.length / weeks) * 10) / 10;
}

/**
 * Summarize ALL workout sessions into a compact format for AI context.
 * Provides exercise frequency, volume trends by month, and personal records.
 */
function summarizeFullHistory(sessions) {
  if (!sessions || sessions.length === 0) return null;

  const exerciseFrequency = {};
  const exercisePRs = {};
  const monthlyVolume = {};
  const categoryCounts = {};
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;

  for (const session of sessions) {
    // Monthly volume tracking
    const monthKey = session.date ? session.date.substring(0, 7) : 'unknown';
    if (!monthlyVolume[monthKey]) monthlyVolume[monthKey] = { sessions: 0, volume: 0 };
    monthlyVolume[monthKey].sessions++;

    for (const log of (session.logs || [])) {
      const name = log.exerciseName || log.exercise || 'Unknown';
      const weight = parseFloat(log.weight) || 0;
      const reps = parseInt(log.reps) || 0;
      const sets = parseInt(log.sets) || 1;
      const volume = weight * reps * sets;
      const category = log.nasmCategory || log.category || 'General';

      // Exercise frequency
      exerciseFrequency[name] = (exerciseFrequency[name] || 0) + 1;

      // Personal records (estimated 1RM via Epley)
      if (weight > 0 && reps > 0) {
        const est1RM = Math.round(weight * (1 + reps / 30));
        if (!exercisePRs[name] || est1RM > exercisePRs[name].est1RM) {
          exercisePRs[name] = { est1RM, weight, reps, date: session.date };
        }
      }

      // Category distribution
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      // Totals
      totalVolume += volume;
      totalSets += sets;
      totalReps += reps;
      monthlyVolume[monthKey].volume += volume;
    }
  }

  // Sort exercises by frequency (most trained first)
  const topExercises = Object.entries(exerciseFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count, pr: exercisePRs[name] || null }));

  // Monthly trends (chronological)
  const monthlyTrends = Object.entries(monthlyVolume)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  return {
    totalSessions: sessions.length,
    totalVolume: Math.round(totalVolume),
    totalSets,
    totalReps,
    topExercises,
    categoryDistribution: categoryCounts,
    monthlyTrends,
    personalRecords: Object.entries(exercisePRs)
      .sort((a, b) => b[1].est1RM - a[1].est1RM)
      .slice(0, 15)
      .map(([name, pr]) => ({ exercise: name, ...pr })),
    firstSessionDate: sessions[sessions.length - 1]?.date || null,
    lastSessionDate: sessions[0]?.date || null,
  };
}

// ── Main Builder ──────────────────────────────────────────────────────────────

/**
 * Build masterPromptJson from available user data.
 * Returns a v4.0-compatible master prompt object, or null if user not found.
 */
export async function buildMasterPromptFromUserData(targetUser) {
  if (!targetUser) return null;

  let models;
  try {
    models = getAllModels();
  } catch (err) {
    logger.warn('getAllModels() failed in masterPromptBuilder', { error: err.message });
    models = {};
  }
  const {
    WaiverRecord,
    MovementAnalysis,
    EquipmentProfile,
    EquipmentItem,
    WorkoutSession,
    WorkoutLog,
    ClientBaselineMeasurements,
    ClientOnboardingQuestionnaire,
    ClientPainEntry,
    BodyMeasurement,
    ClientNote,
    Goal,
  } = models;

  const userId = targetUser.id;

  // Gather all data sources in parallel — each query wrapped safely
  let waiver = null, movementAnalysis = null, equipmentProfiles = [];
  let recentSessions = [], baseline = null, questionnaire = null;
  let painEntries = [], bodyMeasurements = [], trainerNotes = [], goals = [];

  try {
    const results = await Promise.all([
      WaiverRecord?.findOne({
        where: { userId, status: 'linked' },
        order: [['signedAt', 'DESC']],
      }).catch(() => null) ?? Promise.resolve(null),

      MovementAnalysis?.findOne({
        where: { userId, status: ['completed', 'linked'] },
        order: [['assessmentDate', 'DESC']],
      }).catch(() => null) ?? Promise.resolve(null),

      EquipmentProfile?.findAll({
        where: { trainerId: userId, isActive: true },
        include: EquipmentItem ? [{ model: EquipmentItem, as: 'items' }] : [],
        limit: 10,
      }).catch(() => []) ?? Promise.resolve([]),

      // Fetch ALL workout sessions — no limit, AI needs full history for best plans
      WorkoutSession?.findAll({
        where: { userId },
        order: [['date', 'DESC']],
        include: WorkoutLog ? [{ model: WorkoutLog, as: 'logs' }] : [],
      }).catch(() => []) ?? Promise.resolve([]),

      ClientBaselineMeasurements?.findOne({
        where: { userId },
        order: [['takenAt', 'DESC']],
      }).catch(() => null) ?? Promise.resolve(null),

      ClientOnboardingQuestionnaire?.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
      }).catch(() => null) ?? Promise.resolve(null),

      // ACTIVE pain entries sorted by severity — no row limit, but resolved
      // entries must never masquerade as current constraints (Slice 0, C2:
      // this query fed 10 resolved entries to the workout LLM as "active").
      ClientPainEntry?.findAll({
        where: { userId, isActive: true },
        order: [['painLevel', 'DESC']],
      }).catch(() => []) ?? Promise.resolve([]),

      // ALL body measurements for complete trend tracking
      BodyMeasurement?.findAll({
        where: { userId },
        order: [['measuredAt', 'DESC']],
      }).catch(() => []) ?? Promise.resolve([]),

      // ALL high/critical severity trainer notes
      ClientNote?.findAll({
        where: { userId, severity: ['critical', 'high'] },
        order: [['createdAt', 'DESC']],
      }).catch(() => []) ?? Promise.resolve([]),

      // ALL active goals with progress
      Goal?.findAll({
        where: { userId, status: ['active', 'in_progress'] },
        order: [['createdAt', 'DESC']],
      }).catch(() => []) ?? Promise.resolve([]),
    ]);

    [waiver, movementAnalysis, equipmentProfiles, recentSessions, baseline,
     questionnaire, painEntries, bodyMeasurements, trainerNotes, goals] = results;
  } catch (queryErr) {
    logger.warn('masterPromptBuilder: data queries failed, using empty defaults', {
      userId,
      error: queryErr.message,
    });
  }

  // Build the master prompt JSON (v4.0 schema)
  const masterPrompt = {
    version: '5.0',
    generatedAt: new Date().toISOString(),
    autoGenerated: true,

    // Client profile
    clientProfile: {
      name: targetUser.firstName && targetUser.lastName
        ? `${targetUser.firstName} ${targetUser.lastName}`
        : targetUser.username || 'Client',
      dateOfBirth: targetUser.dateOfBirth || waiver?.dateOfBirth || null,
      gender: targetUser.gender || null,
      weight: targetUser.weight || baseline?.weight || null,
      height: targetUser.height || baseline?.height || null,
    },

    // Goals
    goals: {
      primary: targetUser.fitnessGoal || questionnaire?.primaryGoal || 'general_fitness',
      secondary: questionnaire?.secondaryGoals || [],
      notes: questionnaire?.goalNotes || targetUser.fitnessGoal || null,
    },

    // Fitness background
    fitnessBackground: {
      experienceLevel: questionnaire?.experienceLevel || 'beginner',
      trainingExperience: targetUser.trainingExperience || null,
      currentActivityLevel: questionnaire?.activityLevel || null,
      preferredExercises: questionnaire?.preferredExercises || [],
      dislikedExercises: questionnaire?.dislikedExercises || [],
    },

    // Health & medical
    health: {
      concerns: targetUser.healthConcerns || null,
      medicalClearanceRequired: movementAnalysis?.medicalClearanceRequired || false,
      medicalClearanceDate: movementAnalysis?.medicalClearanceDate || null,
      injuries: extractInjuries(movementAnalysis, waiver),
      parqScreening: movementAnalysis?.parqScreening || null,
    },

    // Movement assessment data
    movementAssessment: movementAnalysis ? {
      assessmentDate: movementAnalysis.assessmentDate,
      nasmScore: movementAnalysis.nasmAssessmentScore,
      overheadSquat: movementAnalysis.overheadSquatAssessment || null,
      posturalAssessment: movementAnalysis.posturalAssessment || null,
      squatUniversity: movementAnalysis.squatUniversityAssessment || null,
      movementQuality: movementAnalysis.movementQualityAssessments || null,
      correctiveStrategy: movementAnalysis.correctiveExerciseStrategy || null,
      primaryCompensations: extractCompensations(movementAnalysis.overheadSquatAssessment),
    } : null,

    // Available equipment
    equipment: equipmentProfiles.length > 0
      ? equipmentProfiles.map(p => ({
          profileName: p.name,
          locationType: p.locationType,
          items: (p.items || []).map(i => ({
            name: i.name,
            category: i.category,
            quantity: i.quantity,
          })),
        }))
      : [{ profileName: 'Default', locationType: 'gym', items: [] }],

    // v5.0: Complete training history — detailed recent + summarized historical
    trainingHistory: {
      totalSessions: recentSessions.length,
      // Last 30 sessions with FULL detail (exercises, sets, reps, weight, form)
      detailedRecent: recentSessions.slice(0, 30).map(s => ({
        date: s.date,
        type: s.sessionType || s.type || 'general',
        duration: s.duration || null,
        exercises: (s.logs || []).map(log => ({
          name: log.exerciseName || log.exercise,
          sets: log.sets,
          reps: log.reps,
          weight: log.weight,
          formRating: log.formRating,
          rpe: log.rpe,
          category: log.nasmCategory || log.category,
        })),
      })),
      // Full history summarized — exercise frequency, volume trends, PRs
      historicalSummary: summarizeFullHistory(recentSessions),
    },

    // Baseline measurements
    measurements: baseline ? {
      takenAt: baseline.takenAt,
      weight: baseline.weight || null,
      bodyFatPercentage: baseline.bodyFatPercentage || null,
      bmi: baseline.bmi || null,
    } : null,

    // v4.0: Pain & injury context (active-only since Slice 0 C2 fix).
    // avoid/helps are CLIENT-writable free text → injection-sanitized (F3).
    // aiGuidance/syndrome are trainer-authored guidance, intentionally kept
    // for the generation LLM (server-side prompt; never client-rendered).
    painAndInjuries: {
      activePainEntries: painEntries.map(p => ({
        region: p.bodyRegion,
        side: p.side,
        level: p.painLevel,
        type: p.painType,
        avoid: sanitizeClientText(p.aggravatingMovements),
        helps: sanitizeClientText(p.relievingFactors),
        aiGuidance: p.aiNotes,
        syndrome: p.posturalSyndrome,
      })),
      totalActiveIssues: painEntries.length,
    },

    // v4.0: Body composition trajectory (trend, not just latest)
    bodyCompositionTrend: {
      measurements: bodyMeasurements.map(m => ({
        date: m.measuredAt,
        weight: m.weight,
        bodyFat: m.bodyFatPercentage,
        muscleMass: m.muscleMassPercentage,
        progressScore: m.progressScore,
      })),
      weightTrend: calculateTrend(bodyMeasurements, 'weight'),
      bodyFatTrend: calculateTrend(bodyMeasurements, 'bodyFatPercentage'),
      muscleTrend: calculateTrend(bodyMeasurements, 'muscleMassPercentage'),
    },

    // v4.0: Trainer flags (high/critical notes that should influence AI)
    trainerFlags: {
      criticalNotes: trainerNotes.map(n => ({
        type: n.noteType,
        severity: n.severity,
        content: n.content,
        category: n.category,
      })),
    },

    // v4.0: Active goals with progress
    activeGoals: goals.map(g => ({
      type: g.goalType,
      target: g.targetValue,
      current: g.currentValue,
      unit: g.unit,
      deadline: g.deadline,
      progress: g.progressPercentage,
    })),

    // v4.0: Workout consistency (derived from session history)
    consistency: {
      sessionsLast7Days: recentSessions.filter(s => isWithinDays(s.date, 7)).length,
      sessionsLast30Days: recentSessions.filter(s => isWithinDays(s.date, 30)).length,
      averageSessionsPerWeek: recentSessions.length > 0 ? calculateWeeklyAverage(recentSessions) : 0,
      longestStreak: targetUser.streakDays || 0,
      lastWorkoutDate: recentSessions[0]?.date || null,
      daysSinceLastWorkout: recentSessions[0] ? daysBetween(recentSessions[0].date, new Date()) : null,
    },
  };

  logger.info('Auto-generated masterPromptJson v5.0 from user data', {
    userId,
    hasWaiver: !!waiver,
    hasMovementAnalysis: !!movementAnalysis,
    equipmentProfiles: equipmentProfiles.length,
    recentSessions: recentSessions.length,
    hasBaseline: !!baseline,
    hasQuestionnaire: !!questionnaire,
    painEntries: painEntries.length,
    bodyMeasurements: bodyMeasurements.length,
    trainerNotes: trainerNotes.length,
    goals: goals.length,
  });

  return masterPrompt;
}

/**
 * Extract injury/limitation data from movement analysis and waiver records.
 */
function extractInjuries(movementAnalysis, waiver) {
  const injuries = [];

  // From waiver activity types (may indicate limitations)
  if (waiver?.activityTypes && Array.isArray(waiver.activityTypes)) {
    // Activity types themselves aren't injuries, but metadata might have them
    if (waiver.metadata?.injuries) {
      injuries.push(...(Array.isArray(waiver.metadata.injuries) ? waiver.metadata.injuries : [waiver.metadata.injuries]));
    }
  }

  // From movement analysis corrective strategy
  if (movementAnalysis?.correctiveExerciseStrategy) {
    const strategy = movementAnalysis.correctiveExerciseStrategy;
    if (strategy.limitations && Array.isArray(strategy.limitations)) {
      injuries.push(...strategy.limitations);
    }
    if (strategy.painAreas && Array.isArray(strategy.painAreas)) {
      injuries.push(...strategy.painAreas);
    }
  }

  return injuries.length > 0 ? injuries : null;
}

/**
 * Extract primary compensations from OHSA assessment for quick reference.
 */
function extractCompensations(ohsa) {
  if (!ohsa) return [];

  const compensations = [];
  const views = ['anteriorView', 'lateralView'];
  const labels = {
    feetTurnout: 'Feet Turn Out',
    feetFlattening: 'Feet Flatten',
    kneeValgus: 'Knee Valgus',
    kneeVarus: 'Knee Varus',
    excessiveForwardLean: 'Excessive Forward Lean',
    lowBackArch: 'Low Back Arch',
    armsFallForward: 'Arms Fall Forward',
    forwardHead: 'Forward Head Posture',
  };

  for (const view of views) {
    if (!ohsa[view]) continue;
    for (const [key, label] of Object.entries(labels)) {
      if (ohsa[view][key] === 'significant' || ohsa[view][key] === 'minor') {
        compensations.push({ finding: label, severity: ohsa[view][key] });
      }
    }
  }

  if (ohsa.asymmetricWeightShift && ohsa.asymmetricWeightShift !== 'none') {
    compensations.push({ finding: 'Asymmetric Weight Shift', severity: ohsa.asymmetricWeightShift });
  }

  return compensations;
}

export default { buildMasterPromptFromUserData };
