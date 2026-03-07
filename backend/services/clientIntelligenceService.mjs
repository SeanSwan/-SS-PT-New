/**
 * ClientIntelligenceService -- Cross-Component Intelligence Layer
 * ================================================================
 * Phase 9a: The nervous system connecting all SwanStudios subsystems.
 *
 * Aggregates data from 8 subsystems in parallel:
 *   1. Pain Management (ClientPainEntry)
 *   2. Movement Analysis (MovementAnalysis, MovementProfile)
 *   3. Form Analysis (FormAnalysis)
 *   4. Workout History (WorkoutSession, DailyWorkoutForm)
 *   5. Session Packages (StorefrontItem, Order)
 *   6. Equipment Profiles (EquipmentProfile, EquipmentItem)
 *   7. Variation Engine (VariationLog)
 *   8. Custom Exercises (CustomExercise)
 *
 * Returns a unified ClientContext object for the Intelligent Workout Builder.
 */

import {
  getClientPainEntry,
  getFormAnalysis,
  getMovementProfile,
  getEquipmentProfile,
  getEquipmentItem,
  getVariationLog,
  getCustomExercise,
  getDailyWorkoutForm,
  getWorkoutSession,
  getUser,
  getOrder,
  getOrderItem,
  getStorefrontItem,
  Op,
} from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

// ── Body Region to NASM Muscle Taxonomy ──────────────────────────────

const REGION_TO_MUSCLE_MAP = {
  // Head / Neck
  neck: ['sternocleidomastoid', 'upper_trapezius', 'levator_scapulae'],
  head: ['sternocleidomastoid'],

  // Shoulders
  left_shoulder: ['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff'],
  right_shoulder: ['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff'],
  shoulder: ['anterior_deltoid', 'medial_deltoid', 'posterior_deltoid', 'rotator_cuff'],

  // Arms
  left_elbow: ['biceps', 'triceps', 'brachialis'],
  right_elbow: ['biceps', 'triceps', 'brachialis'],
  left_wrist: ['wrist_flexors', 'wrist_extensors'],
  right_wrist: ['wrist_flexors', 'wrist_extensors'],

  // Chest / Upper Back
  chest: ['pectoralis_major', 'pectoralis_minor'],
  upper_back: ['rhomboids', 'middle_trapezius', 'lower_trapezius'],

  // Spine
  lower_back: ['erector_spinae', 'multifidus', 'quadratus_lumborum'],
  mid_back: ['latissimus_dorsi', 'erector_spinae'],
  thoracic_spine: ['erector_spinae', 'rhomboids'],

  // Core
  abdominals: ['rectus_abdominis', 'transverse_abdominis', 'internal_oblique', 'external_oblique'],
  core: ['rectus_abdominis', 'transverse_abdominis', 'internal_oblique', 'external_oblique'],

  // Hip / Pelvis
  left_hip: ['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors'],
  right_hip: ['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors'],
  hip: ['hip_flexors', 'gluteus_medius', 'gluteus_maximus', 'piriformis', 'adductors'],
  glutes: ['gluteus_maximus', 'gluteus_medius', 'gluteus_minimus'],

  // Legs
  left_quad: ['quadriceps', 'vastus_medialis', 'vastus_lateralis', 'rectus_femoris'],
  right_quad: ['quadriceps', 'vastus_medialis', 'vastus_lateralis', 'rectus_femoris'],
  left_hamstring: ['hamstrings', 'biceps_femoris', 'semitendinosus'],
  right_hamstring: ['hamstrings', 'biceps_femoris', 'semitendinosus'],
  left_knee: ['quadriceps', 'hamstrings', 'popliteus'],
  right_knee: ['quadriceps', 'hamstrings', 'popliteus'],
  left_calf: ['gastrocnemius', 'soleus', 'tibialis_anterior'],
  right_calf: ['gastrocnemius', 'soleus', 'tibialis_anterior'],
  left_shin: ['tibialis_anterior', 'tibialis_posterior'],
  right_shin: ['tibialis_anterior', 'tibialis_posterior'],

  // Ankles / Feet
  left_ankle: ['gastrocnemius', 'soleus', 'peroneals', 'tibialis_anterior'],
  right_ankle: ['gastrocnemius', 'soleus', 'peroneals', 'tibialis_anterior'],
  left_foot: ['peroneals', 'tibialis_posterior', 'intrinsic_foot'],
  right_foot: ['peroneals', 'tibialis_posterior', 'intrinsic_foot'],
};

// ── NASM CES Corrective Strategy Map ─────────────────────────────────

const CES_MAP = {
  knee_valgus: {
    inhibit: ['adductors', 'tfl', 'vastus_lateralis'],
    lengthen: ['adductors', 'tfl', 'biceps_femoris_short_head'],
    activate: ['gluteus_medius', 'vastus_medialis', 'gluteus_maximus'],
    integrate: ['single_leg_squat', 'lateral_band_walk', 'step_up'],
  },
  excessive_forward_lean: {
    inhibit: ['hip_flexors', 'gastrocnemius', 'soleus'],
    lengthen: ['hip_flexors', 'gastrocnemius', 'soleus'],
    activate: ['gluteus_maximus', 'erector_spinae', 'anterior_tibialis'],
    integrate: ['ball_squat', 'squat_to_row', 'step_up_to_balance'],
  },
  arms_fall_forward: {
    inhibit: ['latissimus_dorsi', 'pectoralis_major', 'pectoralis_minor'],
    lengthen: ['latissimus_dorsi', 'pectoralis_major', 'pectoralis_minor'],
    activate: ['middle_trapezius', 'lower_trapezius', 'rotator_cuff'],
    integrate: ['ball_combo_1', 'squat_to_row', 'overhead_squat'],
  },
  low_back_arch: {
    inhibit: ['hip_flexors', 'erector_spinae'],
    lengthen: ['hip_flexors', 'erector_spinae', 'latissimus_dorsi'],
    activate: ['gluteus_maximus', 'transverse_abdominis', 'internal_oblique'],
    integrate: ['ball_squat', 'squat_to_row', 'plank_variations'],
  },
  head_protrusion: {
    inhibit: ['upper_trapezius', 'levator_scapulae', 'sternocleidomastoid'],
    lengthen: ['upper_trapezius', 'levator_scapulae', 'sternocleidomastoid'],
    activate: ['deep_cervical_flexors', 'lower_trapezius'],
    integrate: ['chin_tucks', 'prone_cobra', 'wall_angels'],
  },
  shoulder_elevation: {
    inhibit: ['upper_trapezius', 'levator_scapulae'],
    lengthen: ['upper_trapezius', 'levator_scapulae', 'sternocleidomastoid'],
    activate: ['lower_trapezius', 'serratus_anterior'],
    integrate: ['wall_slides', 'prone_y_raises', 'band_pull_aparts'],
  },
  hip_drop: {
    inhibit: ['tfl', 'adductors'],
    lengthen: ['tfl', 'adductors', 'piriformis'],
    activate: ['gluteus_medius', 'gluteus_minimus', 'quadratus_lumborum'],
    integrate: ['single_leg_deadlift', 'lateral_band_walk', 'clamshells'],
  },
  foot_pronation: {
    inhibit: ['peroneals', 'lateral_gastrocnemius', 'biceps_femoris'],
    lengthen: ['peroneals', 'lateral_gastrocnemius', 'soleus'],
    activate: ['tibialis_posterior', 'tibialis_anterior', 'gluteus_medius'],
    integrate: ['single_leg_balance', 'calf_raises_inverted', 'step_up'],
  },
};

// ── Pain Severity Thresholds ─────────────────────────────────────────

const PAIN_AUTO_EXCLUDE_HOURS = 72;
const PAIN_AUTO_EXCLUDE_SEVERITY = 7;
const PAIN_WARN_SEVERITY = 4;

// ── Compensation Trend Analysis ──────────────────────────────────────

function analyzeCompensationTrend(compensations) {
  if (!Array.isArray(compensations) || compensations.length === 0) return [];

  return compensations.map(comp => {
    const trend = comp.trend || 'stable';
    return {
      type: comp.type,
      frequency: comp.frequency || 0,
      avgSeverity: comp.avgSeverity || 0,
      trend,
      lastDetected: comp.lastDetected ?? null,
      cesStrategy: CES_MAP[comp.type] ?? null,
    };
  });
}

// ── Package-to-Plan Horizon Mapping ──────────────────────────────────

function mapPackageToHorizon(totalSessions, sessionsPerWeek) {
  if (!totalSessions || !sessionsPerWeek || sessionsPerWeek <= 0) {
    return { weeks: 0, months: 0, horizon: 'unknown' };
  }
  const weeks = Math.ceil(totalSessions / sessionsPerWeek);
  const months = Math.round(weeks / 4.33);

  if (months <= 1) return { weeks, months: 1, horizon: 'short' };
  if (months <= 3) return { weeks, months, horizon: 'medium' };
  if (months <= 6) return { weeks, months, horizon: 'long' };
  return { weeks, months, horizon: 'extended' };
}

// ── Main: Get Client Context ─────────────────────────────────────────

/**
 * Parallel-fetch data from all subsystems for a single client.
 * Returns a unified ClientContext object.
 *
 * @param {number} clientId
 * @param {number} trainerId - The trainer requesting context
 * @returns {Promise<Object>} ClientContext
 */
export async function getClientContext(clientId, trainerId) {
  const now = new Date();
  const seventyTwoHoursAgo = new Date(now.getTime() - PAIN_AUTO_EXCLUDE_HOURS * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Parallel queries to all subsystems
  const [
    painEntries,
    movementProfile,
    recentFormAnalyses,
    recentWorkouts,
    equipmentProfiles,
    recentVariations,
    clientUser,
  ] = await Promise.all([
    // 1. Active pain entries
    getClientPainEntry().findAll({
      where: { userId: clientId, isActive: true },
      order: [['createdAt', 'DESC']],
    }).catch(err => {
      logger.warn('[ClientIntelligence] Pain entries fetch failed:', err.message);
      return [];
    }),

    // 2. Movement profile (aggregated)
    getMovementProfile().findOne({
      where: { userId: clientId },
    }).catch(err => {
      logger.warn('[ClientIntelligence] Movement profile fetch failed:', err.message);
      return null;
    }),

    // 3. Recent form analyses (last 2 weeks)
    getFormAnalysis().findAll({
      where: {
        userId: clientId,
        analysisStatus: 'complete',
        createdAt: { [Op.gte]: twoWeeksAgo },
      },
      order: [['createdAt', 'DESC']],
      limit: 20,
    }).catch(err => {
      logger.warn('[ClientIntelligence] Form analyses fetch failed:', err.message);
      return [];
    }),

    // 4. Recent workouts (last 2 weeks)
    getDailyWorkoutForm().findAll({
      where: {
        clientId,
        createdAt: { [Op.gte]: twoWeeksAgo },
      },
      order: [['date', 'DESC']],
      limit: 14,
    }).catch(err => {
      logger.warn('[ClientIntelligence] Workouts fetch failed:', err.message);
      return [];
    }),

    // 5. Trainer's equipment profiles
    getEquipmentProfile().findAll({
      where: { trainerId, isActive: true },
      include: [{
        model: getEquipmentItem(),
        as: 'items',
        where: { isActive: true, approvalStatus: 'approved' },
        required: false,
      }],
    }).catch(err => {
      logger.warn('[ClientIntelligence] Equipment profiles fetch failed:', err.message);
      return [];
    }),

    // 6. Recent variation logs (last 2 weeks)
    getVariationLog().findAll({
      where: {
        clientId,
        trainerId,
        sessionDate: { [Op.gte]: twoWeeksAgo },
      },
      order: [['sessionDate', 'DESC']],
      limit: 10,
    }).catch(err => {
      logger.warn('[ClientIntelligence] Variation logs fetch failed:', err.message);
      return [];
    }),

    // 7. Client user record
    getUser().findByPk(clientId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
    }).catch(err => {
      logger.warn('[ClientIntelligence] User fetch failed:', err.message);
      return null;
    }),
  ]);

  // ── Process Pain Data ──────────────────────────────────────────

  const painExclusions = [];
  const painWarnings = [];
  const excludedMuscles = new Set();

  for (const entry of painEntries) {
    const muscles = REGION_TO_MUSCLE_MAP[entry.bodyRegion] || [];
    const isRecent = entry.createdAt >= seventyTwoHoursAgo;
    const severity = entry.painLevel || 0;

    if (severity >= PAIN_AUTO_EXCLUDE_SEVERITY && isRecent) {
      painExclusions.push({
        bodyRegion: entry.bodyRegion,
        painLevel: severity,
        painType: entry.painType,
        muscles,
        reason: `Auto-excluded: severity ${severity}/10 within 72h`,
        entryId: entry.id,
      });
      muscles.forEach(m => excludedMuscles.add(m));
    } else if (severity >= PAIN_WARN_SEVERITY) {
      painWarnings.push({
        bodyRegion: entry.bodyRegion,
        painLevel: severity,
        painType: entry.painType,
        muscles,
        reason: severity >= PAIN_AUTO_EXCLUDE_SEVERITY
          ? `High severity but >72h ago -- trainer review needed`
          : `Moderate pain (${severity}/10) -- modify load/ROM`,
        entryId: entry.id,
      });
    }
  }

  // ── Process Movement Profile ───────────────────────────────────

  const compensations = movementProfile?.commonCompensations
    ? analyzeCompensationTrend(
        typeof movementProfile.commonCompensations === 'string'
          ? JSON.parse(movementProfile.commonCompensations)
          : movementProfile.commonCompensations
      )
    : [];

  const nasmPhaseRecommendation = movementProfile?.nasmPhaseRecommendation ?? null;
  const exerciseScores = movementProfile?.exerciseScores || {};

  // ── Process Recent Workout Data ────────────────────────────────

  const workoutSummary = {
    sessionsLast2Weeks: recentWorkouts.length,
    recentExercises: [],
    avgFormRating: 0,
    avgIntensity: 0,
  };

  const recentExerciseSet = new Set();
  let totalFormRating = 0;
  let formRatingCount = 0;
  let totalIntensity = 0;

  for (const workout of recentWorkouts) {
    const formData = typeof workout.formData === 'string'
      ? JSON.parse(workout.formData)
      : workout.formData;

    if (formData?.exercises) {
      for (const ex of formData.exercises) {
        if (ex.exerciseName) recentExerciseSet.add(ex.exerciseName);
        if (ex.formRating) {
          totalFormRating += ex.formRating;
          formRatingCount++;
        }
      }
    }
    if (formData?.overallIntensity) {
      totalIntensity += formData.overallIntensity;
    }
  }

  workoutSummary.recentExercises = Array.from(recentExerciseSet);
  workoutSummary.avgFormRating = formRatingCount > 0
    ? Math.round((totalFormRating / formRatingCount) * 10) / 10
    : 0;
  workoutSummary.avgIntensity = recentWorkouts.length > 0
    ? Math.round((totalIntensity / recentWorkouts.length) * 10) / 10
    : 0;

  // ── Process Equipment ──────────────────────────────────────────

  const equipmentByLocation = equipmentProfiles.map(profile => ({
    id: profile.id,
    name: profile.name,
    locationType: profile.locationType,
    equipmentCount: profile.equipmentCount,
    items: (profile.items || []).map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      resistanceType: item.resistanceType,
    })),
  }));

  // ── Process Variation History ───────────────────────────────────

  const variationSummary = {
    recentSessions: recentVariations.length,
    lastSessionType: recentVariations[0]?.sessionType ?? null,
    lastSessionDate: recentVariations[0]?.sessionDate ?? null,
    recentlyUsedExercises: [],
    currentPattern: recentVariations[0]?.rotationPattern || 'standard',
  };

  const recentVarExercises = new Set();
  for (const log of recentVariations) {
    const exercises = typeof log.exercisesUsed === 'string'
      ? JSON.parse(log.exercisesUsed)
      : log.exercisesUsed;
    if (Array.isArray(exercises)) {
      exercises.forEach(e => recentVarExercises.add(e));
    }
  }
  variationSummary.recentlyUsedExercises = Array.from(recentVarExercises);

  // ── Process Form Analysis Results ──────────────────────────────

  const formAnalysisSummary = {
    recentCount: recentFormAnalyses.length,
    detectedCompensations: [],
    avgScore: 0,
    flaggedExercises: [],
  };

  const detectedComps = new Set();
  let totalScore = 0;
  let scoreCount = 0;

  for (const analysis of recentFormAnalyses) {
    if (analysis.overallScore) {
      totalScore += analysis.overallScore;
      scoreCount++;
    }
    const findings = typeof analysis.findings === 'string'
      ? JSON.parse(analysis.findings)
      : analysis.findings;
    if (findings?.compensations) {
      findings.compensations.forEach(c => detectedComps.add(c));
    }
    if (analysis.overallScore && analysis.overallScore < 60) {
      formAnalysisSummary.flaggedExercises.push({
        exercise: analysis.exerciseName,
        score: analysis.overallScore,
        analysisId: analysis.id,
      });
    }
  }

  formAnalysisSummary.detectedCompensations = Array.from(detectedComps);
  formAnalysisSummary.avgScore = scoreCount > 0
    ? Math.round(totalScore / scoreCount)
    : 0;

  // ── Build ClientContext ────────────────────────────────────────

  return {
    clientId,
    trainerId,
    clientName: clientUser
      ? `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim()
      : `Client #${clientId}`,
    fetchedAt: now.toISOString(),

    pain: {
      activeEntries: painEntries.length,
      exclusions: painExclusions,
      warnings: painWarnings,
      excludedMuscles: Array.from(excludedMuscles),
    },

    movement: {
      nasmPhaseRecommendation,
      compensations,
      exerciseScores,
      totalAnalyses: movementProfile?.totalAnalyses || 0,
    },

    formAnalysis: formAnalysisSummary,

    workouts: workoutSummary,

    equipment: equipmentByLocation,

    variation: variationSummary,

    constraints: {
      excludedMuscles: Array.from(excludedMuscles),
      compensationTypes: compensations.map(c => c.type),
      recentlyUsedExercises: variationSummary.recentlyUsedExercises,
      nasmPhase: nasmPhaseRecommendation,
    },
  };
}

// ── Admin Intelligence Overview ──────────────────────────────────────

/**
 * Get admin-level overview across all clients for dashboard widgets.
 *
 * @param {number} trainerId
 * @returns {Promise<Object>} AdminIntelligenceOverview
 */
export async function getAdminIntelligenceOverview(trainerId) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    highPainAlerts,
    pendingApprovals,
    recentFormAnalyses,
    recentVariations,
    recentWorkouts,
  ] = await Promise.all([
    // Pain alerts: severity >= 7 in last 24h
    getClientPainEntry().findAll({
      where: {
        isActive: true,
        painLevel: { [Op.gte]: PAIN_AUTO_EXCLUDE_SEVERITY },
        createdAt: { [Op.gte]: twentyFourHoursAgo },
      },
      include: [{
        model: getUser(),
        as: 'client',
        attributes: ['id', 'firstName', 'lastName'],
      }],
      order: [['painLevel', 'DESC']],
    }).catch(() => []),

    // Equipment pending approvals
    getEquipmentItem().count({
      where: { approvalStatus: 'pending', isActive: true },
      include: [{
        model: getEquipmentProfile(),
        as: 'profile',
        where: { trainerId },
        attributes: [],
      }],
    }).catch(() => 0),

    // Form analyses this week
    getFormAnalysis().findAll({
      where: {
        trainerId,
        createdAt: { [Op.gte]: oneWeekAgo },
      },
      attributes: ['id', 'userId', 'exerciseName', 'analysisStatus', 'overallScore', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 50,
    }).catch(() => []),

    // Variation sessions this week
    getVariationLog().count({
      where: {
        trainerId,
        sessionDate: { [Op.gte]: oneWeekAgo },
      },
    }).catch(() => 0),

    // Workouts logged this week
    getDailyWorkoutForm().count({
      where: {
        trainerId,
        createdAt: { [Op.gte]: oneWeekAgo },
      },
    }).catch(() => 0),
  ]);

  // Process form analysis stats
  const formStats = {
    total: recentFormAnalyses.length,
    complete: 0,
    processing: 0,
    failed: 0,
    avgScore: 0,
    flaggedExercises: [],
  };

  let totalScore = 0;
  let scoreCount = 0;

  for (const fa of recentFormAnalyses) {
    if (fa.analysisStatus === 'complete') formStats.complete++;
    else if (fa.analysisStatus === 'processing') formStats.processing++;
    else if (fa.analysisStatus === 'failed') formStats.failed++;

    if (fa.overallScore) {
      totalScore += fa.overallScore;
      scoreCount++;
      if (fa.overallScore < 60) {
        formStats.flaggedExercises.push({
          userId: fa.userId,
          exercise: fa.exerciseName,
          score: fa.overallScore,
        });
      }
    }
  }
  formStats.avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

  return {
    fetchedAt: now.toISOString(),
    trainerId,

    painAlerts: highPainAlerts.map(entry => ({
      clientId: entry.userId,
      clientName: entry.client
        ? `${entry.client.firstName || ''} ${entry.client.lastName || ''}`.trim()
        : `Client #${entry.userId}`,
      bodyRegion: entry.bodyRegion,
      painLevel: entry.painLevel,
      painType: entry.painType,
      reportedAt: entry.createdAt,
    })),

    equipmentPendingApprovals: pendingApprovals,

    formAnalysis: formStats,

    variationSessionsThisWeek: recentVariations,

    workoutsLoggedThisWeek: recentWorkouts,
  };
}
