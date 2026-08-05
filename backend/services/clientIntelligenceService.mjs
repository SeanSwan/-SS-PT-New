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
  getGoal,
  getClientProgress,
  getBodyMeasurement,
  getLongTermProgramPlan,
  getModel,
  Op,
} from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { buildClientTrainingVaultContext } from './clientTrainingVaultContextService.mjs';
import {
  buildClientSourcePolicy,
  isNonDeductingClientSource,
  normalizeClientSource,
} from './sessionBillingPolicy.mjs';
import { buildRecentExercisePerformance } from './workoutProgressionService.mjs';
import { getCesStrategy } from './training-cortex/policy/nasmCesPolicy.mjs';
import { registryMusclesForRegion } from './training-cortex/ontology/regionMuscleMap.mjs';

// ── Safe model getter (non-fatal for optional tables) ────────────────
function safeGetModel(name) {
  try { return getModel(name); } catch { return null; }
}

// ── Safe Brzycki 1RM calculator (C3 FIX: guards against div-by-zero) ─
function safeBrzycki1RM(weight, reps) {
  if (!weight || !reps || weight <= 0 || reps < 1 || reps > 15) return null;
  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0.01) return null; // Guard near-zero denominator
  return Math.round(weight / denominator);
}

// ── Safe JSON.parse (H3 FIX: prevents crash on malformed data) ───────
function safeJsonParse(value, fallback = []) {
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeQueryRows(result) {
  if (Array.isArray(result?.[0]) && !result[0]?.id) return result[0];
  return Array.isArray(result) ? result : [];
}

function selectQueryType(sequelizeInstance) {
  return sequelizeInstance?.QueryTypes?.SELECT || 'SELECT';
}

function toNullablePositiveNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const SPECIAL_POPULATION_PATTERNS = [
  { flag: 'pregnancy_postpartum', pattern: /pregnan|postpartum/i },
  { flag: 'older_adult', pattern: /older[_\s-]*adult|senior|age[_\s-]*65|over[_\s-]*65/i },
  { flag: 'youth', pattern: /youth|adolescent|minor/i },
];

function collectSpecialPopulationFlags(value) {
  const flags = new Set();
  const visit = (node, key = '') => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${key}_${index}`));
      return;
    }
    if (typeof node === 'object') {
      Object.entries(node).forEach(([childKey, childValue]) => {
        visit(childValue, key ? `${key}_${childKey}` : childKey);
      });
      return;
    }

    const text = node === true || typeof node === 'string'
      ? `${key} ${String(node)}`
      : key;
    for (const { flag, pattern } of SPECIAL_POPULATION_PATTERNS) {
      if (pattern.test(text)) flags.add(flag);
    }
  };

  visit(value);
  return Array.from(flags).sort();
}

function normalizeHealthRisk(value) {
  if (!hasText(value)) return null;
  return String(value).trim().toLowerCase();
}

function buildClientHealthReviewContext({ healthConcerns, healthRisk, onboardingResponses, baseline }) {
  const normalizedRisk = normalizeHealthRisk(healthRisk);
  const specialPopulationFlags = collectSpecialPopulationFlags(onboardingResponses);
  const medicalClearanceRequired = Boolean(baseline?.medicalClearanceRequired);
  const hasHealthConcerns = hasText(healthConcerns);
  const riskRequiresReview = Boolean(normalizedRisk && normalizedRisk !== 'low');

  return {
    hasHealthConcerns,
    healthRisk: normalizedRisk,
    medicalClearanceRequired,
    specialPopulationFlags,
    reviewRequired: Boolean(
      hasHealthConcerns
      || riskRequiresReview
      || medicalClearanceRequired
      || specialPopulationFlags.length > 0,
    ),
    referralRecommended: Boolean(medicalClearanceRequired || normalizedRisk === 'high'),
  };
}

function toClientIntelligenceErrorMetadata(error) {
  const metadata = {
    name: error?.name || 'UnknownError',
  };

  if (error?.code) metadata.code = error.code;
  if (error?.statusCode || error?.status) metadata.statusCode = error.statusCode || error.status;
  if (error?.parent?.code) metadata.parentCode = error.parent.code;
  if (error?.original?.code) metadata.originalCode = error.original.code;

  return metadata;
}

export async function fetchRecentWorkoutLogSummaries(clientId, sinceDate, options = {}) {
  const { limit = 14, sequelizeOverride = sequelize } = options;

  try {
    const rows = await sequelizeOverride.query(
      `SELECT
         ws.id,
         ws.date,
         ws.intensity AS "overallIntensity",
         json_agg(json_build_object(
           'exerciseName', wl."exerciseName",
           'rpe', wl.rpe,
           'weight', wl.weight,
           'reps', wl.reps
         ) ORDER BY wl."exerciseName", wl."setNumber") AS exercises
       FROM workout_sessions ws
       JOIN workout_logs wl ON wl."sessionId" = ws.id
       WHERE ws."userId" = :clientId
         AND ws.status = 'completed'
         AND ws.date >= :sinceDate
       GROUP BY ws.id, ws.date, ws.intensity
       ORDER BY ws.date DESC
       LIMIT :limit`,
      {
        replacements: { clientId, sinceDate, limit },
        type: selectQueryType(sequelizeOverride),
      },
    );

    return normalizeQueryRows(rows).map((row) => {
      const exercises = safeJsonParse(row.exercises, []);
      return {
        id: row.id,
        date: row.date,
        formData: {
          overallIntensity: toNullablePositiveNumber(row.overallIntensity),
          exercises: (Array.isArray(exercises) ? exercises : [])
            .filter((exercise) => exercise?.exerciseName)
            .map((exercise) => ({
              exerciseName: exercise.exerciseName,
              formRating: toNullablePositiveNumber(exercise.formRating),
              rpe: toNullablePositiveNumber(exercise.rpe),
              weight: toNullablePositiveNumber(exercise.weight),
              reps: toNullablePositiveNumber(exercise.reps),
            })),
        },
      };
    });
  } catch (err) {
    logger.warn(
      '[ClientIntelligence] Recent workout-log summaries fetch failed:',
      toClientIntelligenceErrorMetadata(err),
    );
    return [];
  }
}

// ── Body Region to NASM Muscle Taxonomy ──────────────────────────────

/**
 * Collapse variation-log rows to ONE per (templateCategory, UTC day),
 * keeping the newest row for each. Rows arrive newest-first; the result is
 * chronological (oldest-first) for rotation counting. This is what makes
 * generation-time history writes safe: regenerating five times in one
 * session still advances BUILD/SWITCH exactly once.
 */
export function dedupeVariationHistoryRows(rows = []) {
  const seen = new Set();
  const kept = [];
  for (const log of rows) {
    const timestamp = Date.parse(log?.sessionDate);
    const day = Number.isFinite(timestamp)
      ? new Date(timestamp).toISOString().slice(0, 10)
      : `row-${kept.length}`;
    const key = `${log?.templateCategory || 'any'}|${day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(log);
  }
  return kept.reverse();
}

export function buildClientWorkoutSummary(recentWorkouts = []) {
  const workouts = Array.isArray(recentWorkouts) ? recentWorkouts : [];
  const workoutSummary = {
    sessionsLast2Weeks: workouts.length,
    recentExercisePerformance: buildRecentExercisePerformance(workouts),
    recentExercises: [],
    avgFormRating: null,
    avgIntensity: null,
  };

  const recentExerciseSet = new Set();
  let totalFormRating = 0;
  let formRatingCount = 0;
  let totalIntensity = 0;
  let intensityCount = 0;

  for (const workout of workouts) {
    const formData = safeJsonParse(workout.formData, {});

    if (formData?.exercises) {
      for (const ex of formData.exercises) {
        if (ex.exerciseName) recentExerciseSet.add(ex.exerciseName);
        const formRating = toNullablePositiveNumber(ex.formRating);
        if (formRating !== null) {
          totalFormRating += formRating;
          formRatingCount++;
        }
      }
    }
    const overallIntensity = toNullablePositiveNumber(formData?.overallIntensity);
    if (overallIntensity !== null) {
      totalIntensity += overallIntensity;
      intensityCount++;
    }
  }

  workoutSummary.recentExercises = Array.from(recentExerciseSet);
  workoutSummary.avgFormRating = formRatingCount > 0
    ? Math.round((totalFormRating / formRatingCount) * 10) / 10
    : null;
  workoutSummary.avgIntensity = intensityCount > 0
    ? Math.round((totalIntensity / intensityCount) * 10) / 10
    : null;

  return workoutSummary;
}

// Cortex Phase 2C: the region->muscle mapping moved to THE single home
// (training-cortex/ontology/regionMuscleMap.mjs); registryMusclesForRegion()
// is byte-identical to the table this replaced.

// ── NASM CES Corrective Strategy Map ─────────────────────────────────

// Cortex Phase 2B: the CES Inhibit->Lengthen->Activate->Integrate strategies
// moved to THE single CES catalog (training-cortex/policy/nasmCesPolicy.mjs);
// getCesStrategy() is byte-identical to the lookups this replaced.

// ── Pain Severity Thresholds ─────────────────────────────────────────

const PAIN_AUTO_EXCLUDE_HOURS = 72;
const PAIN_AUTO_EXCLUDE_SEVERITY = 7;
const PAIN_WARN_SEVERITY = 4;
// Cortex P0 (directive §5.1): an active issue untouched this long is flagged for
// reassessment — flagged, never silently dropped from planning context.
const PAIN_STALE_REVIEW_DAYS = 30;

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
      cesStrategy: getCesStrategy(comp.type),
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
  if (!clientId || !trainerId) {
    throw new Error('clientId and trainerId are required');
  }

  // C2 FIX: Validate trainer has access to this client
  // Admins can access any client; trainers need a relationship
  const requestingUser = await getUser().findByPk(trainerId, { attributes: ['id', 'role'] }).catch(() => null);
  if (!requestingUser) {
    throw new Error('Invalid trainer ID');
  }
  if (requestingUser.role === 'trainer') {
    const ClientTrainerAssignment = safeGetModel('ClientTrainerAssignment');
    if (ClientTrainerAssignment) {
      // 2026-05-01 schema fix: prior query used { isActive: true } on a column
      // that doesn't exist. Real column is status='active' (see model file:115
      // and the migration). The query threw, the .catch silently nulled the
      // result, and every legitimate trainer-with-assignment workflow tripped
      // "Trainer does not have an active assignment". Same rule-58 bug class
      // as the route-layer fixes earlier this session — switching to the
      // model contract used by verifyClientAccess.mjs.
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parseInt(clientId, 10),
          trainerId: parseInt(trainerId, 10),
          status: 'active',
        },
      }).catch((err) => {
        logger.warn('[ClientIntelligence] Assignment lookup error', {
          clientId,
          trainerId,
          ...toClientIntelligenceErrorMetadata(err),
        });
        return null;
      });
      if (!assignment) {
        throw new Error('Trainer does not have an active assignment with this client');
      }
    }
  }

  const now = new Date();
  const seventyTwoHoursAgo = new Date(now.getTime() - PAIN_AUTO_EXCLUDE_HOURS * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const painStaleCutoff = new Date(now.getTime() - PAIN_STALE_REVIEW_DAYS * 24 * 60 * 60 * 1000);

  // Parallel queries to all subsystems
  const [
    painEntries,
    movementProfile,
    recentFormAnalyses,
    recentWorkouts,
    equipmentProfiles,
    recentVariations,
    clientUser,
    activeGoals,
    clientProgress,
    bodyMeasurements,
    activeProgramPlan,
    baselineMeasurements,
    nutritionPlan,
    onboardingQuestionnaire,
    workoutStreak,
    trainingVaultContext,
    painTotalCount,
  ] = await Promise.all([
    // 1. Active pain entries (SAFETY-CRITICAL: failure is tracked)
    // Cortex P0 (directive §5.1): NO creation-time window — an unresolved chronic
    // issue must never age out of planning context. Severity-first ordering keeps
    // the worst issues inside the memory-bound limit; recency is computed
    // separately in processing (72h auto-exclude + 30-day staleness).
    getClientPainEntry().findAll({
      where: {
        userId: clientId,
        isActive: true,
      },
      order: [['painLevel', 'DESC'], ['createdAt', 'DESC']],
      limit: 100,
    }).catch(err => {
      logger.error(
        '[ClientIntelligence] CRITICAL: Pain entries fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return { __failed: true, data: [] };
    }),

    // 2. Movement profile (aggregated)
    getMovementProfile().findOne({
      where: { userId: clientId },
    }).catch(err => {
      logger.warn(
        '[ClientIntelligence] Movement profile fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
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
      logger.warn(
        '[ClientIntelligence] Form analyses fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return [];
    }),

    // 4. Recent completed workouts from the canonical workout diary tables.
    fetchRecentWorkoutLogSummaries(clientId, twoWeeksAgo, { limit: 14 }).catch(err => {
      logger.warn(
        '[ClientIntelligence] Workouts fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
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
      logger.warn(
        '[ClientIntelligence] Equipment profiles fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
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
      logger.warn(
        '[ClientIntelligence] Variation logs fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return [];
    }),

    // 7. Client user record (with fitnessGoal)
    getUser().findByPk(clientId, {
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'role',
        'fitnessGoal',
        'trainingExperience',
        'clientSource',
        'healthConcerns',
      ],
    }).catch(err => {
      logger.warn(
        '[ClientIntelligence] User fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return null;
    }),

    // 8. Active goals
    getGoal().findAll({
      where: { userId: clientId, status: 'active' },
      attributes: ['id', 'title', 'category', 'targetValue', 'currentValue', 'progressPercentage', 'deadline', 'startDate'],
      order: [['createdAt', 'DESC']],
      limit: 10,
    }).catch(err => {
      logger.warn(
        '[ClientIntelligence] Goals fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return [];
    }),

    // 9. Client progress levels (NASM body-part-specific)
    getClientProgress().findOne({
      where: { userId: clientId },
    }).catch(err => {
      logger.warn(
        '[ClientIntelligence] ClientProgress fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return null;
    }),

    // 10. Latest body measurements (most recent 3)
    getBodyMeasurement().findAll({
      where: { userId: clientId },
      order: [['measurementDate', 'DESC']],
      limit: 3,
    }).catch(err => {
      logger.warn(
        '[ClientIntelligence] BodyMeasurement fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return [];
    }),

    // 11. Active long-term program plan
    getLongTermProgramPlan().findOne({
      where: { userId: clientId, status: 'active' },
      order: [['createdAt', 'DESC']],
    }).catch(err => {
      logger.warn(
        '[ClientIntelligence] LongTermProgramPlan fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return null;
    }),

    // 12. Client baseline measurements (1RM, NASM assessment, PAR-Q+)
    (safeGetModel('ClientBaselineMeasurements')?.findOne({
      where: { userId: clientId },
      order: [['createdAt', 'DESC']],
    }) ?? Promise.resolve(null)).catch(err => {
      logger.warn(
        '[ClientIntelligence] Baseline fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return null;
    }),

    // 13. Active nutrition plan
    (safeGetModel('ClientNutritionPlan')?.findOne({
      where: { clientId, isActive: true },
      order: [['createdAt', 'DESC']],
    }) ?? Promise.resolve(null)).catch(err => {
      logger.warn(
        '[ClientIntelligence] NutritionPlan fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return null;
    }),

    // 14. Onboarding questionnaire (initial intake goals)
    (safeGetModel('ClientOnboardingQuestionnaire')?.findOne({
      where: { userId: clientId },
      order: [['createdAt', 'DESC']],
    }) ?? Promise.resolve(null)).catch(err => {
      logger.warn(
        '[ClientIntelligence] Onboarding questionnaire fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return null;
    }),

    // 15. Current workout streak
    (safeGetModel('Streak')?.findOne({
      where: { userId: clientId, streakType: 'workout', isActive: true },
      order: [['currentCount', 'DESC']],
    }) ?? Promise.resolve(null)).catch(err => {
      logger.warn(
        '[ClientIntelligence] Streak fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return null;
    }),

    buildClientTrainingVaultContext({
      clientId,
      WorkoutPlan: safeGetModel('WorkoutPlan'),
      DailyWorkoutForm: safeGetModel('DailyWorkoutForm'),
      Op,
      today: now,
    }).catch(err => {
      logger.warn(
        '[ClientIntelligence] Training vault context fetch failed:',
        toClientIntelligenceErrorMetadata(err),
      );
      return null;
    }),

    // 17. Lifetime pain-entry count (Cortex P0 §5.2): distinguishes a client whose
    // pain intake was NEVER collected from one with a clean/resolved history.
    Promise.resolve()
      .then(() => getClientPainEntry().count({ where: { userId: clientId } }))
      .catch(() => null),
  ]);

  // ── Critical Data Failure Tracking ─────────────────────────────
  // If pain data fetch failed, we track it so the workout builder
  // can warn the trainer rather than silently generating unsafe workouts
  const criticalFailures = [];
  let safePainEntries = painEntries;
  if (painEntries && painEntries.__failed) {
    criticalFailures.push('pain_entries');
    safePainEntries = painEntries.data;
  }

  // ── Process Pain Data ──────────────────────────────────────────

  const painExclusions = [];
  const painWarnings = [];
  const staleActiveIssues = [];
  const painUnmappedRegions = [];
  const excludedMuscles = new Set();
  let lastPainTouchMs = null;

  // Staleness + last-touch run over ALL active entries. Slice 1 (C8 fix):
  // the confirmation anchor is lastConfirmedAt (trainer/human confirm
  // refreshes it) with updatedAt→createdAt fallback for pre-migration rows.
  for (const entry of safePainEntries) {
    const severity = entry.painLevel || 0;
    const lastTouched = entry.lastConfirmedAt || entry.updatedAt || entry.createdAt;

    if (lastTouched) {
      const touchedMs = new Date(lastTouched).getTime();
      if (Number.isFinite(touchedMs) && (lastPainTouchMs === null || touchedMs > lastPainTouchMs)) {
        lastPainTouchMs = touchedMs;
      }
    }

    // Cortex P0 (§5.1): active issue unconfirmed past the review window —
    // flag for reassessment. It STILL flows through exclusion processing.
    if (lastTouched && new Date(lastTouched) < painStaleCutoff) {
      staleActiveIssues.push({
        entryId: entry.id,
        bodyRegion: entry.bodyRegion,
        painLevel: severity,
        lastReviewedAt: new Date(lastTouched).toISOString(),
        reason: `Active issue not confirmed in ${PAIN_STALE_REVIEW_DAYS}+ days -- reassess`,
      });
    }
  }

  // Slice 1 (F4): gate input is DETERMINISTIC — one representative per
  // (region, side), the max-severity entry. Five duplicate "left shoulder"
  // rows no longer multiply warnings or randomize which entry explains the
  // exclusion. (Muscle exclusion was already order-independent set-union;
  // this fixes the warning/explanation noise and pins the cited entryId.)
  const gateRepresentatives = new Map();
  for (const entry of safePainEntries) {
    const key = `${entry.bodyRegion}|${entry.side || 'center'}`;
    const prev = gateRepresentatives.get(key);
    if (!prev || (entry.painLevel || 0) > (prev.painLevel || 0)) {
      gateRepresentatives.set(key, entry);
    }
  }

  for (const entry of gateRepresentatives.values()) {
    const muscles = registryMusclesForRegion(entry.bodyRegion);
    const isRecent = entry.createdAt >= seventyTwoHoursAgo;
    const severity = entry.painLevel || 0;
    // Slice 1 (F5): pain AT REST escalates one tier — it signals irritation
    // that loading decisions must respect even at moderate severity.
    const isRestPain = entry.painContext === 'rest';

    // Slice 1 (C1 parity): a region with no muscle mapping cannot machine-
    // protect the plan — say so VISIBLY (bootcamp side already did).
    if (muscles.length === 0 && severity >= PAIN_WARN_SEVERITY) {
      painUnmappedRegions.push({
        bodyRegion: entry.bodyRegion,
        painLevel: severity,
        entryId: entry.id,
        reason: 'No automatic muscle mapping -- manual exercise review required',
      });
    }

    // Slice 0/1 (F1): an ACTIVE >=7 entry excludes regardless of age — the
    // old `&& isRecent` let chronic severe pain silently age OUT of
    // exclusion after 72h while still active. Stale >=7 additionally warns
    // for trainer re-confirmation.
    if (severity >= PAIN_AUTO_EXCLUDE_SEVERITY || (isRestPain && severity >= PAIN_WARN_SEVERITY)) {
      painExclusions.push({
        bodyRegion: entry.bodyRegion,
        painLevel: severity,
        painType: entry.painType,
        painContext: entry.painContext || 'loaded_movement',
        muscles,
        reason: isRestPain && severity < PAIN_AUTO_EXCLUDE_SEVERITY
          ? `Auto-excluded: pain at REST (${severity}/10) -- contraindication signal, trainer review before loading`
          : isRecent
            ? `Auto-excluded: severity ${severity}/10 within 72h`
            : `Auto-excluded: active severity ${severity}/10 (logged >72h ago -- trainer re-confirmation recommended)`,
        entryId: entry.id,
      });
      muscles.forEach(m => excludedMuscles.add(m));
      if (!isRecent && severity >= PAIN_AUTO_EXCLUDE_SEVERITY) {
        painWarnings.push({
          bodyRegion: entry.bodyRegion,
          painLevel: severity,
          painType: entry.painType,
          muscles,
          reason: `High severity logged >72h ago -- trainer re-confirmation needed`,
          entryId: entry.id,
        });
      }
    } else if (severity >= PAIN_WARN_SEVERITY) {
      painWarnings.push({
        bodyRegion: entry.bodyRegion,
        painLevel: severity,
        painType: entry.painType,
        muscles,
        reason: `Moderate pain (${severity}/10) -- modify load/ROM`,
        entryId: entry.id,
      });
    }
  }

  // ── Pain Source State (Cortex P0 §5.2) ─────────────────────────
  // "No active pain reported" and "pain information unavailable" are different
  // facts; the safety gate keys on this status, never on array shapes.
  let painDataStatus;
  if (painEntries && painEntries.__failed) {
    painDataStatus = 'unavailable';
  } else if (safePainEntries.length > 0) {
    painDataStatus = 'loaded_active_issue';
  } else if (painTotalCount === 0) {
    painDataStatus = 'never_collected';
  } else {
    // Prior entries exist (or the count probe failed after a successful load):
    // the source itself was read successfully and shows zero active issues.
    painDataStatus = 'loaded_no_active_issue';
  }

  // ── Process Movement Profile ───────────────────────────────────

  const compensations = movementProfile?.commonCompensations
    ? analyzeCompensationTrend(safeJsonParse(movementProfile.commonCompensations, []))
    : [];

  const nasmPhaseRecommendation = movementProfile?.nasmPhaseRecommendation ?? null;
  const exerciseScores = movementProfile?.exerciseScores || {};

  // ── Process Recent Workout Data ────────────────────────────────

  const workoutSummary = buildClientWorkoutSummary(recentWorkouts);

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

  const variationHistory = dedupeVariationHistoryRows(recentVariations)
    .map(log => ({
      sessionType: log.sessionType,
      sessionDate: log.sessionDate,
      rotationPattern: log.rotationPattern || 'standard',
      templateCategory: log.templateCategory || null,
    }))
    .filter(entry => entry.sessionType === 'build' || entry.sessionType === 'switch');

  const variationSummary = {
    recentSessions: recentVariations.length,
    lastSessionType: recentVariations[0]?.sessionType ?? null,
    lastSessionDate: recentVariations[0]?.sessionDate ?? null,
    sessionHistory: variationHistory,
    recentlyUsedExercises: [],
    currentPattern: recentVariations[0]?.rotationPattern || 'standard',
  };

  const recentVarExercises = new Set();
  for (const log of recentVariations) {
    const exercises = safeJsonParse(log.exercisesUsed, []);
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
    const findings = safeJsonParse(analysis.findings, {});
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

  // ── Process Goals ──────────────────────────────────────────────

  const goalsSummary = {
    activeCount: activeGoals.length,
    primaryGoal: clientUser?.fitnessGoal || onboardingQuestionnaire?.primaryGoal || null,
    goals: activeGoals.map(g => ({
      id: g.id,
      title: g.title,
      category: g.category,
      progressPercent: g.progressPercentage || 0,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      deadline: g.deadline,
    })),
    onboardingGoal: onboardingQuestionnaire?.primaryGoal || null,
    commitmentLevel: onboardingQuestionnaire?.commitmentLevel || null,
    trainingTier: onboardingQuestionnaire?.trainingTier || null,
    trainingExperience: clientUser?.trainingExperience || null,
  };

  // ── Process Body Composition ─────────────────────────────────

  const latestMeasurement = bodyMeasurements[0] || null;
  const bodySummary = latestMeasurement ? {
    weight: latestMeasurement.weight,
    weightUnit: latestMeasurement.weightUnit || 'lbs',
    bodyFatPercentage: latestMeasurement.bodyFatPercentage,
    bmi: latestMeasurement.bmi,
    measurementDate: latestMeasurement.measurementDate,
    recentTrend: bodyMeasurements.length >= 2
      ? (bodyMeasurements[0].weight - bodyMeasurements[1].weight)
      : null,
  } : null;

  // ── Process Baseline (1RM, NASM Assessment) ──────────────────

  const parqScreening = baselineMeasurements
    ? safeJsonParse(baselineMeasurements.parqScreening, null)
    : null;
  const medicalClearanceRequired = Boolean(
    baselineMeasurements?.medicalClearanceRequired
    || parqScreening?.medicalClearanceRequired,
  );
  const baselineSummary = baselineMeasurements ? {
    benchPress1RM: safeBrzycki1RM(baselineMeasurements.benchPressWeight, baselineMeasurements.benchPressReps),
    squat1RM: safeBrzycki1RM(baselineMeasurements.squatWeight, baselineMeasurements.squatReps),
    deadlift1RM: safeBrzycki1RM(baselineMeasurements.deadliftWeight, baselineMeasurements.deadliftReps),
    overheadPress1RM: safeBrzycki1RM(baselineMeasurements.overheadPressWeight, baselineMeasurements.overheadPressReps),
    pullUps: baselineMeasurements.pullUpsReps || null,
    plankDuration: baselineMeasurements.plankDuration || null,
    nasmAssessmentScore: baselineMeasurements.nasmAssessmentScore || null,
    correctiveStrategy: baselineMeasurements.correctiveExerciseStrategy || null,
    parqCleared: Boolean(parqScreening && !medicalClearanceRequired),
    medicalClearanceRequired,
  } : null;

  // ── Process Nutrition ────────────────────────────────────────

  const nutritionSummary = nutritionPlan ? {
    dailyCalories: nutritionPlan.dailyCalories,
    proteinGrams: nutritionPlan.proteinGrams,
    carbsGrams: nutritionPlan.carbsGrams,
    fatGrams: nutritionPlan.fatGrams,
    dietaryRestrictions: nutritionPlan.dietaryRestrictions || [],
    allergies: nutritionPlan.allergies || [],
  } : null;

  // ── Process Progress Levels ──────────────────────────────────

  const progressLevels = clientProgress ? {
    overallLevel: clientProgress.overallLevel || 0,
    coreLevel: clientProgress.coreLevel || 0,
    balanceLevel: clientProgress.balanceLevel || 0,
    stabilityLevel: clientProgress.stabilityLevel || 0,
    flexibilityLevel: clientProgress.flexibilityLevel || 0,
    squatsLevel: clientProgress.squatsLevel || 0,
    lungesLevel: clientProgress.lungesLevel || 0,
    planksLevel: clientProgress.planksLevel || 0,
    experiencePoints: clientProgress.experiencePoints || 0,
    unlockedExercises: clientProgress.unlockedExercises || [],
  } : null;

  // ── Process Streak ───────────────────────────────────────────

  const streakSummary = workoutStreak ? {
    currentCount: workoutStreak.currentCount || 0,
    longestCount: workoutStreak.longestCount || 0,
    lastActivityDate: workoutStreak.lastActivityDate,
  } : { currentCount: 0, longestCount: 0, lastActivityDate: null };

  // ── Process Active Program ───────────────────────────────────

  const activeProgramSummary = activeProgramPlan ? {
    id: activeProgramPlan.id,
    horizonMonths: activeProgramPlan.horizonMonths,
    goalProfile: activeProgramPlan.goalProfile,
    status: activeProgramPlan.status,
    sourceType: activeProgramPlan.sourceType,
  } : null;

  const sourcePolicy = buildClientSourcePolicy(clientUser?.clientSource);
  const onboardingResponses = safeJsonParse(onboardingQuestionnaire?.responsesJson, {});
  const healthSummary = buildClientHealthReviewContext({
    healthConcerns: clientUser?.healthConcerns,
    healthRisk: onboardingQuestionnaire?.healthRisk,
    onboardingResponses,
    baseline: baselineSummary,
  });
  const safetySummary = {
    medicalClearanceRequired: healthSummary.medicalClearanceRequired,
    referralRecommended: healthSummary.referralRecommended,
    healthReviewRecommended: healthSummary.reviewRequired,
  };

  // ── Build ClientContext ────────────────────────────────────────

  return {
    clientId,
    trainerId,
    clientName: clientUser
      ? `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim()
      : `Client #${clientId}`,
    fetchedAt: now.toISOString(),
    clientSource: sourcePolicy.clientSource,
    sourcePolicy,

    // Safety flag: if critical subsystems failed to load, the workout builder
    // should warn the trainer before generating potentially unsafe workouts
    criticalDataUnavailable: criticalFailures.length > 0,
    criticalFailures,
    safety: safetySummary,
    health: healthSummary,

    pain: {
      status: painDataStatus,
      activeEntries: safePainEntries.length,
      activeIssueCount: safePainEntries.length,
      lastPainReviewAt: lastPainTouchMs !== null ? new Date(lastPainTouchMs).toISOString() : null,
      staleActiveIssues,
      exclusions: painExclusions,
      warnings: painWarnings,
      excludedMuscles: Array.from(excludedMuscles),
      // Slice 1 (C1 parity): regions that could NOT be machine-protected —
      // fail-visible, mirroring bootcamp's unmappedRegion alerts.
      unmappedRegions: painUnmappedRegions,
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

    // New deep intelligence data
    goals: goalsSummary,
    body: bodySummary,
    baseline: baselineSummary,
    nutrition: nutritionSummary,
    progressLevels,
    streak: streakSummary,
    activeProgram: activeProgramSummary,
    trainingVault: trainingVaultContext,

    constraints: {
      excludedMuscles: Array.from(excludedMuscles),
      compensationTypes: compensations.map(c => c.type),
      recentlyUsedExercises: variationSummary.recentlyUsedExercises,
      nasmPhase: nasmPhaseRecommendation,
      // Enhanced constraints from deep data
      primaryGoal: goalsSummary.primaryGoal,
      trainingExperience: goalsSummary.trainingExperience,
      bodyWeight: bodySummary?.weight || null,
      estimated1RMs: baselineSummary ? {
        bench: baselineSummary.benchPress1RM,
        squat: baselineSummary.squat1RM,
        deadlift: baselineSummary.deadlift1RM,
        overheadPress: baselineSummary.overheadPress1RM,
      } : null,
    },
  };
}

// ── Admin Intelligence Overview ──────────────────────────────────────

/**
 * Get admin-level overview across all clients for dashboard widgets.
 *
 * Slice 0 (C12): the signature always advertised trainer scoping but never
 * applied it to pain alerts. The route is admin-only today (admins see the
 * whole platform on purpose); if this ever opens to trainers, named pain
 * alerts are hard-scoped to the caller's ACTIVE roster here — fail-closed
 * (missing roster model or empty roster ⇒ zero alerts, never platform-wide).
 *
 * @param {number} trainerId
 * @param {{ role?: 'admin' | 'trainer' }} [opts]
 * @returns {Promise<Object>} AdminIntelligenceOverview
 */
export async function getAdminIntelligenceOverview(trainerId, { role = 'admin' } = {}) {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let painAlertRosterScope = {};
  if (role !== 'admin') {
    // NOTE: Op.in with an EMPTY array matches nothing (safe), but the [-1]
    // sentinel makes the fail-closed intent explicit and survives refactors
    // (Op.notIn with [] would match EVERYTHING — see 61f98a585 lesson).
    const ClientTrainerAssignment = safeGetModel('ClientTrainerAssignment');
    const roster = ClientTrainerAssignment
      ? await ClientTrainerAssignment.findAll({
          where: { trainerId, status: 'active' },
          attributes: ['clientId'],
        }).catch(() => [])
      : [];
    const rosterIds = roster.map((a) => a.clientId).filter(Boolean);
    painAlertRosterScope = { userId: { [Op.in]: rosterIds.length ? rosterIds : [-1] } };
  }

  const [
    highPainAlerts,
    pendingApprovals,
    recentFormAnalyses,
    recentVariations,
    recentWorkouts,
  ] = await Promise.all([
    // Pain alerts: severity >= 7 in last 24h (roster-scoped for non-admins)
    getClientPainEntry().findAll({
      where: {
        isActive: true,
        painLevel: { [Op.gte]: PAIN_AUTO_EXCLUDE_SEVERITY },
        createdAt: { [Op.gte]: twentyFourHoursAgo },
        ...painAlertRosterScope,
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
