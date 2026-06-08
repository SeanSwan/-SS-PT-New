/**
 * AI Data Write Service
 * =====================
 * Processes data update actions from AI assistant responses.
 * Allows AI to update client stats, measurements, goals, notes,
 * macro logs, and NASM progression levels on behalf of admin/trainer users.
 *
 * Supported update types:
 *   - body_measurement: Record new body measurements
 *   - goal: Create or update client goals
 *   - client_note: Add trainer observations/red flags
 *   - macro_log: Log nutrition entries
 *   - progress_level: Update NASM category levels
 *   - daily_workout_form: Create workout form from AI-transcribed exercise data
 *   - save_workout_plan: Create a multi-week workout program from AI-generated plan
 */
import logger from '../utils/logger.mjs';
import { PLAN_HORIZONS } from './clientTrainingPlanHorizonService.mjs';
import {
  attachGeneratedWorkoutPlanPdf,
  extractInsertedWorkoutPlanId,
} from './workoutPlanAiPdfAttachmentService.mjs';

const DURATION_HORIZONS = PLAN_HORIZONS.filter((slot) => slot.key !== 'one_day');
const AI_DATA_WRITE_FAILED_CODE = 'AI_DATA_WRITE_FAILED';
const AI_DATA_WRITE_FAILED_MESSAGE = 'Swan Coach could not apply that update. No data was changed.';
const AI_DATA_WRITE_UNKNOWN_TYPE_CODE = 'AI_DATA_WRITE_UNKNOWN_TYPE';
const AI_DATA_WRITE_UNKNOWN_TYPE_MESSAGE = 'Swan Coach does not support that update type yet. No data was changed.';

function normalizeUpdateType(type) {
  if (typeof type !== 'string') return 'unknown';
  const trimmed = type.trim();
  return trimmed ? trimmed.slice(0, 64) : 'unknown';
}

function toDataWriteErrorMetadata(err) {
  return {
    errorName: err?.name || 'Error',
    errorCode: err?.code || err?.type || AI_DATA_WRITE_FAILED_CODE,
  };
}

function inferAiPlanHorizonKey(durationWeeks) {
  const exact = DURATION_HORIZONS.find((slot) => slot.durationWeeks === durationWeeks);
  if (exact) return exact.key;

  return DURATION_HORIZONS.reduce((closest, slot) => {
    const score = Math.abs(slot.durationWeeks - durationWeeks);
    const closestScore = Math.abs(closest.durationWeeks - durationWeeks);
    return score < closestScore ? slot : closest;
  }, DURATION_HORIZONS[0]).key;
}

function clampPlanDurationWeeks(value, fallback = 4) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(52, parsed));
}

/**
 * Process an array of data update operations from the AI.
 * @param {number} targetUserId - The client whose data is being updated
 * @param {Array} updates - Array of {type, data} objects
 * @param {number} performedBy - The admin/trainer user who initiated the AI conversation
 * @param {object} sequelize - Sequelize instance for raw queries
 * @returns {object} - { successful: number, errors: Array<{type, code, message}> }
 */
export async function processAIDataUpdates(targetUserId, updates, performedBy, sequelize) {
  const results = { successful: 0, errors: [] };

  if (!Array.isArray(updates) || updates.length === 0) {
    return results;
  }

  // Safety: limit to 10 updates per AI response to prevent abuse
  const safeUpdates = updates.slice(0, 10);

  for (const update of safeUpdates) {
    const updateType = normalizeUpdateType(update?.type);
    const updateData = update?.data || {};

    try {
      switch (updateType) {
        case 'body_measurement':
          await insertBodyMeasurement(targetUserId, performedBy, updateData, sequelize);
          results.successful++;
          break;

        case 'goal':
          await upsertGoal(targetUserId, updateData, sequelize);
          results.successful++;
          break;

        case 'client_note':
          await insertClientNote(targetUserId, performedBy, updateData, sequelize);
          results.successful++;
          break;

        case 'macro_log':
          await insertMacroLog(targetUserId, updateData, sequelize);
          results.successful++;
          break;

        case 'progress_level':
          await updateProgressLevel(targetUserId, updateData, sequelize);
          results.successful++;
          break;

        case 'daily_workout_form':
          await insertDailyWorkoutForm(targetUserId, performedBy, updateData, sequelize);
          results.successful++;
          break;

        case 'save_workout_plan':
          await saveWorkoutPlan(targetUserId, performedBy, updateData, sequelize);
          results.successful++;
          break;

        // ─────────────────────────────────────────────────────────────
        // AI Village CRITICAL: Draft-and-approve pattern for communications
        // AI creates drafts — trainer must approve before sending
        // ─────────────────────────────────────────────────────────────
        case 'draft_email':
          await createCommunicationDraft(targetUserId, performedBy, 'email', updateData, sequelize);
          results.successful++;
          break;

        case 'draft_sms':
          await createCommunicationDraft(targetUserId, performedBy, 'sms', updateData, sequelize);
          results.successful++;
          break;

        default:
          results.errors.push({
            type: updateType,
            code: AI_DATA_WRITE_UNKNOWN_TYPE_CODE,
            message: AI_DATA_WRITE_UNKNOWN_TYPE_MESSAGE,
          });
      }
    } catch (err) {
      logger.error('[AIDataWrite] Failed to process update', {
        updateType,
        targetUserId,
        performedBy,
        ...toDataWriteErrorMetadata(err),
      });
      results.errors.push({
        type: updateType,
        code: AI_DATA_WRITE_FAILED_CODE,
        message: AI_DATA_WRITE_FAILED_MESSAGE,
      });
    }
  }

  return results;
}

async function insertBodyMeasurement(userId, recordedBy, data, sequelize) {
  const fields = [];
  const values = [];
  const replacements = { userId, recordedBy };

  // Whitelist allowed fields to prevent injection
  const allowed = [
    'weight', 'weightUnit', 'bodyFatPercentage', 'muscleMassPercentage', 'bmi',
    'neck', 'shoulders', 'chest', 'upperChest', 'underChest',
    'rightBicep', 'leftBicep', 'rightForearm', 'leftForearm',
    'naturalWaist', 'umbilicus', 'lowerWaist', 'hips',
    'rightThigh', 'leftThigh', 'rightCalf', 'leftCalf',
    'visceralFatLevel', 'metabolicAge', 'boneMass', 'waterPercentage',
    'notes', 'measurementMethod',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined && data[key] !== null) {
      fields.push(`"${key}"`);
      const paramName = `p_${key}`;
      values.push(`:${paramName}`);
      replacements[paramName] = data[key];
    }
  }

  if (fields.length === 0) {
    throw new Error('No valid measurement fields provided');
  }

  fields.push('"userId"', '"recordedBy"', '"measurementDate"', '"circumferenceUnit"');
  values.push(':userId', ':recordedBy', ':measurementDate', ':circumferenceUnit');
  replacements.measurementDate = data.measurementDate || new Date().toISOString().split('T')[0];
  replacements.circumferenceUnit = data.circumferenceUnit || 'inches';

  await sequelize.query(
    `INSERT INTO body_measurements (${fields.join(', ')}, "createdAt", "updatedAt")
     VALUES (${values.join(', ')}, NOW(), NOW())`,
    { replacements, type: sequelize.QueryTypes.INSERT }
  );

  logger.info('[AIDataWrite] Body measurement recorded for user %d by %d', userId, recordedBy);
}

async function upsertGoal(userId, data, sequelize) {
  if (!data.title) throw new Error('Goal title is required');

  const replacements = {
    userId,
    title: data.title,
    description: data.description || null,
    category: data.category || 'fitness',
    status: data.status || 'active',
    priority: data.priority || 'medium',
    targetValue: data.targetValue || null,
    currentValue: data.currentValue || 0,
    unit: data.unit || null,
    progressPercentage: data.progressPercentage || 0,
    deadline: data.deadline || null,
  };

  await sequelize.query(
    `INSERT INTO goals ("userId", title, description, category, status, priority,
                        "targetValue", "currentValue", unit, "progressPercentage", deadline,
                        "createdAt", "updatedAt")
     VALUES (:userId, :title, :description, :category, :status, :priority,
             :targetValue, :currentValue, :unit, :progressPercentage, :deadline,
             NOW(), NOW())`,
    { replacements, type: sequelize.QueryTypes.INSERT }
  );

  logger.info('[AIDataWrite] Goal created for user %d: %s', userId, data.title);
}

async function insertClientNote(userId, trainerId, data, sequelize) {
  if (!data.content) throw new Error('Note content is required');

  const replacements = {
    userId,
    trainerId,
    noteType: data.noteType || 'general',
    severity: data.severity || 'low',
    content: data.content,
    followUpDate: data.followUpDate || null,
    visibility: data.visibility || 'trainer_only',
  };

  await sequelize.query(
    `INSERT INTO client_notes ("userId", "trainerId", "noteType", severity, content,
                               "followUpDate", visibility, "isResolved", "createdAt", "updatedAt")
     VALUES (:userId, :trainerId, :noteType, :severity, :content,
             :followUpDate, :visibility, false, NOW(), NOW())`,
    { replacements, type: sequelize.QueryTypes.INSERT }
  );

  logger.info('[AIDataWrite] Client note added for user %d by trainer %d', userId, trainerId);
}

async function insertMacroLog(userId, data, sequelize) {
  if (!data.description) throw new Error('Food description is required');

  const sodium = parseFloat(data.sodium) || 0;
  const addedSugar = parseFloat(data.addedSugar) || 0;
  const cholesterol = parseFloat(data.cholesterol) || 0;
  const saturatedFat = parseFloat(data.saturatedFat) || 0;
  const transFat = parseFloat(data.transFat) || 0;
  const novaGroup = data.novaGroup ? Math.max(1, Math.min(4, parseInt(data.novaGroup))) : null;

  // Auto-calculate FDA warning flags per meal
  const flagSodium = sodium > 800;           // >33% of 2,300mg DV
  const flagSugar = addedSugar > 12;         // >50% AHA women's limit
  const flagCholesterol = cholesterol > 100;  // >33% of 300mg DV
  const flagSaturatedFat = saturatedFat > 7;  // >33% of 20g DV
  const flagTransFat = transFat > 0;          // ANY trans fat
  const flagProcessed = novaGroup === 4;      // Ultra-processed (NOVA 4)

  const replacements = {
    userId,
    date: data.date || new Date().toISOString().split('T')[0],
    mealType: data.mealType || 'snack',
    description: data.description,
    calories: parseFloat(data.calories) || 0,
    protein: parseFloat(data.protein) || 0,
    carbs: parseFloat(data.carbs) || 0,
    fat: parseFloat(data.fat) || 0,
    fiber: parseFloat(data.fiber) || 0,
    sugar: parseFloat(data.sugar) || 0,
    sodium,
    addedSugar: addedSugar || null,
    saturatedFat: saturatedFat || null,
    transFat: transFat || null,
    cholesterol: cholesterol || null,
    novaGroup,
    brandName: data.brandName ? String(data.brandName).slice(0, 200) : null,
    mealSource: data.source || data.mealSource || null,
    flagSodium,
    flagSugar,
    flagCholesterol,
    flagSaturatedFat,
    flagTransFat,
    flagProcessed,
    source: 'ai_chat',
    verified: false,
  };

  await sequelize.query(
    `INSERT INTO daily_macro_logs ("userId", date, "mealType", description,
                                   calories, protein, carbs, fat, fiber, sugar, sodium,
                                   "addedSugar", "saturatedFat", "transFat", cholesterol,
                                   "novaGroup", "brandName", "mealSource",
                                   "flagSodium", "flagSugar", "flagCholesterol",
                                   "flagSaturatedFat", "flagTransFat", "flagProcessed",
                                   source, verified, "createdAt", "updatedAt")
     VALUES (:userId, :date, :mealType, :description,
             :calories, :protein, :carbs, :fat, :fiber, :sugar, :sodium,
             :addedSugar, :saturatedFat, :transFat, :cholesterol,
             :novaGroup, :brandName, :mealSource,
             :flagSodium, :flagSugar, :flagCholesterol,
             :flagSaturatedFat, :flagTransFat, :flagProcessed,
             :source, :verified, NOW(), NOW())`,
    { replacements, type: sequelize.QueryTypes.INSERT }
  );

  logger.info('[AIDataWrite] Macro log added for user %d: %s', userId, data.description);
}

async function updateProgressLevel(userId, data, sequelize) {
  if (!data.category || data.value === undefined) {
    throw new Error('Progress level requires category and value');
  }

  // Whitelist allowed NASM category columns
  const allowedCategories = [
    'overallLevel', 'experiencePoints',
    'coreLevel', 'balanceLevel', 'stabilityLevel', 'flexibilityLevel',
    'calisthenicsLevel', 'isolationLevel', 'stabilizersLevel',
    'injuryPreventionLevel', 'injuryRecoveryLevel',
    'glutesLevel', 'calfsLevel', 'shouldersLevel', 'hamstringsLevel',
    'absLevel', 'chestLevel', 'bicepsLevel', 'tricepsLevel',
    'tibialisAnteriorLevel', 'serratusAnteriorLevel', 'latissimusDorsiLevel',
    'hipsLevel', 'lowerBackLevel', 'wristsForearmLevel', 'neckLevel',
    'squatsLevel', 'lungesLevel', 'planksLevel', 'reversePlanksLevel',
  ];

  if (!allowedCategories.includes(data.category)) {
    throw new Error(`Invalid progress category: ${data.category}. Allowed: ${allowedCategories.join(', ')}`);
  }

  const value = Math.max(0, Math.min(1000, parseInt(data.value, 10) || 0));

  // Upsert: create row if doesn't exist, update if it does
  await sequelize.query(
    `INSERT INTO client_progress ("userId", "${data.category}", "createdAt", "updatedAt")
     VALUES (:userId, :value, NOW(), NOW())
     ON CONFLICT ("userId") DO UPDATE SET "${data.category}" = :value, "updatedAt" = NOW()`,
    { replacements: { userId, value }, type: sequelize.QueryTypes.INSERT }
  );

  logger.info('[AIDataWrite] Progress level updated for user %d: %s = %d', userId, data.category, value);
}

/**
 * Insert a daily workout form from AI-transcribed workout data.
 * Validates exercise structure and creates the form with proper formData JSONB.
 */
async function insertDailyWorkoutForm(clientId, trainerId, data, sequelize) {
  if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
    throw new Error('At least one exercise is required');
  }

  // Helper for "only clamp when the caller actually supplied a rating"
  // (Phase 16 null-honest writer contract).
  const clampIfProvided = (raw, min, max) => {
    if (raw === undefined || raw === null || raw === '') return null;
    const n = parseInt(raw);
    if (!Number.isFinite(n)) return null;
    return Math.max(min, Math.min(max, n));
  };

  // Validate and sanitize each exercise.
  //
  // Phase 16 (2026-04-16): stop seeding phantom `rpe: 5`, `formQuality: 3`,
  // `formRating: 3`, `overallIntensity || 5`. When the AI transcription
  // extracts a rating we clamp + keep it; when it doesn't, we omit the
  // field so the persisted row reads as "not rated" rather than a
  // falsely-confident neutral middle value. `painLevel: 0` stays as-is
  // per the Phase 16 scope — null-honest painLevel deferred to Phase 16.1.
  const sanitizedExercises = data.exercises.slice(0, 30).map((ex, i) => {
    const name = String(ex.exerciseName || ex.name || `Exercise ${i + 1}`).slice(0, 200);
    const sets = Math.max(1, Math.min(20, parseInt(ex.sets) || 3));
    const reps = Math.max(1, Math.min(100, parseInt(ex.reps) || 10));
    const weight = Math.max(0, Math.min(2000, parseFloat(ex.weight) || 0));

    const exRpe = clampIfProvided(ex.rpe, 1, 10);
    const exFormRating = clampIfProvided(ex.formRating, 1, 5);
    // formQuality is not currently part of the AI input schema; when
    // callers start rating per-set form via the AI lane, extend the
    // schema and thread it through here. For Phase 16 we omit the
    // field rather than seed 3.

    const entry = {
      exerciseId: `ai-${Date.now()}-${i}`,
      exerciseName: name,
      sets: Array.from({ length: sets }, (_, j) => {
        const setObj = {
          setNumber: j + 1,
          weight,
          reps,
          tempo: String(ex.tempo || '').slice(0, 20),
          restTime: Math.max(0, Math.min(600, parseInt(ex.restTime) || 60)),
          notes: String(ex.notes || '').slice(0, 500),
        };
        if (exRpe !== null) setObj.rpe = exRpe;
        return setObj;
      }),
      painLevel: 0,
      performanceNotes: '',
    };
    if (exFormRating !== null) entry.formRating = exFormRating;
    return entry;
  });

  const formDate = data.date || new Date().toISOString().split('T')[0];
  const sessionNotes = String(data.sessionNotes || 'Logged via AI assistant').slice(0, 2000);
  const overallIntensity = clampIfProvided(data.overallIntensity, 1, 10);

  const formDataObj = {
    exercises: sanitizedExercises,
    sessionNotes,
    submittedBy: trainerId,
    submittedAt: new Date().toISOString(),
    totalSets: sanitizedExercises.reduce((sum, ex) => sum + ex.sets.length, 0),
    source: 'ai_transcription',
  };
  if (overallIntensity !== null) {
    formDataObj.overallIntensity = overallIntensity;
  }
  const formData = JSON.stringify(formDataObj);

  await sequelize.query(
    `INSERT INTO daily_workout_forms ("clientId", "trainerId", date, "sessionDeducted",
                                       "formData", "totalPointsEarned", "mcpProcessed",
                                       "submittedAt", "createdAt", "updatedAt")
     VALUES (:clientId, :trainerId, :formDate, false,
             :formData::jsonb, 0, false,
             NOW(), NOW(), NOW())`,
    {
      replacements: { clientId, trainerId, formDate, formData },
      type: sequelize.QueryTypes.INSERT,
    }
  );

  logger.info('[AIDataWrite] Workout form created for client %d by trainer %d: %d exercises',
    clientId, trainerId, sanitizedExercises.length);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Workout Plan Creator
// PURPOSE: AI creates a multi-week workout program stored as a WorkoutPlan
// WHY: Enables AI to generate full programs and persist them so it can
//      later answer "what's next?" by reading the stored plan
// ─────────────────────────────────────────────────────────────
async function saveWorkoutPlan(clientId, trainerId, data, sequelize) {
  if (!data.title) throw new Error('Workout plan title is required');

  const title = String(data.title).slice(0, 255);
  const description = data.description ? String(data.description).slice(0, 5000) : null;
  const nasmPhase = data.nasmPhase ? Math.max(1, Math.min(5, parseInt(data.nasmPhase))) : null;
  const durationWeeks = clampPlanDurationWeeks(data.durationWeeks);
  const startDate = data.startDate || null;
  const endDate = data.endDate || null;
  const metadata = data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
    ? { ...data.metadata }
    : {};

  if (!metadata.planHorizon && !metadata.horizonKey && !metadata.planDurationKey) {
    const horizonKey = inferAiPlanHorizonKey(durationWeeks);
    metadata.planHorizon = horizonKey;
    metadata.horizonKey = horizonKey;
    metadata.planDurationKey = horizonKey;
  }
  metadata.planSource = metadata.planSource || 'swan_coach_planning';

  // Validate planData structure if provided
  let planData = { weeks: [] };
  if (data.planData && typeof data.planData === 'object') {
    planData = data.planData;
    // Ensure weeks array exists
    if (!Array.isArray(planData.weeks)) {
      planData.weeks = [];
    }
    // Cap at 52 weeks to prevent abuse
    planData.weeks = planData.weeks.slice(0, 52);
  }

  const replacements = {
    clientId,
    trainerId,
    title,
    description,
    nasmPhase,
    startDate,
    endDate,
    durationWeeks,
    planData: JSON.stringify(planData),
    createdBy: 'swan_coach_planning',
    metadata: JSON.stringify(metadata),
  };

  const insertResult = await sequelize.query(
    `INSERT INTO workout_plans ("userId", trainer_id, title, description,
                                nasm_phase, start_date, end_date, "durationWeeks",
                                status, current_week, current_day,
                                plan_data, progress_notes, created_by, metadata,
                                "createdAt", "updatedAt")
     VALUES (:clientId, :trainerId, :title, :description,
             :nasmPhase, :startDate, :endDate, :durationWeeks,
             'active', 1, 1,
             :planData::jsonb, '[]'::jsonb, :createdBy, :metadata::jsonb,
             NOW(), NOW())
     RETURNING id`,
    { replacements, type: sequelize.QueryTypes.INSERT }
  );

  await attachGeneratedWorkoutPlanPdf({
    sequelize,
    planId: extractInsertedWorkoutPlanId(insertResult),
    clientId,
    trainerId,
    title,
    description,
    durationWeeks,
    nasmPhase,
    planData,
    metadata,
  });

  logger.info('[AIDataWrite] Workout plan created for client %d by trainer %d: %s (%d weeks, phase %s)',
    clientId, trainerId, title, durationWeeks, nasmPhase || 'unset');
}

// ─────────────────────────────────────────────────────────────
// SECTION: Communication Draft Creator
// PURPOSE: AI creates draft email/SMS — trainer must approve before sending
// WHY: AI Village CRITICAL security mandate — prevents AI prompt injection
//      from sending spam/phishing via email or racking up Twilio costs
// ─────────────────────────────────────────────────────────────
async function createCommunicationDraft(clientId, trainerId, type, data, sequelize) {
  // Rate limit: max 10 drafts per client per day
  const [countResult] = await sequelize.query(
    `SELECT COUNT(*) as count FROM "CommunicationDrafts"
     WHERE "clientId" = :clientId AND "createdAt" > NOW() - INTERVAL '24 hours'`,
    { replacements: { clientId }, type: sequelize.QueryTypes.SELECT }
  ).catch(() => [{ count: 0 }]);

  if (parseInt(countResult?.count || 0) >= 10) {
    throw new Error('Daily draft limit reached for this client (max 10 per day)');
  }

  // Get client contact info — AI cannot override recipient address
  const [client] = await sequelize.query(
    `SELECT email, phone FROM "Users" WHERE id = :clientId`,
    { replacements: { clientId }, type: sequelize.QueryTypes.SELECT }
  );

  if (!client) {
    throw new Error('Client not found');
  }

  const recipientAddress = type === 'email' ? client.email : client.phone;
  if (!recipientAddress) {
    throw new Error(`Client has no ${type === 'email' ? 'email' : 'phone number'} on file`);
  }

  // Sanitize content — strip HTML tags from SMS, limit lengths
  const subject = type === 'email'
    ? String(data.subject || 'Message from SwanStudios').slice(0, 200)
    : null;

  const body = String(data.body || data.html || data.message || '').slice(0, type === 'sms' ? 160 : 5000);

  if (!body.trim()) {
    throw new Error('Draft body cannot be empty');
  }

  await sequelize.query(
    `INSERT INTO "CommunicationDrafts" (type, "clientId", "trainerId", subject, body, "recipientAddress", status, "createdAt", "updatedAt")
     VALUES (:type, :clientId, :trainerId, :subject, :body, :recipientAddress, 'pending_approval', NOW(), NOW())`,
    {
      replacements: { type, clientId, trainerId, subject, body, recipientAddress },
      type: sequelize.QueryTypes.INSERT,
    }
  );

  logger.info('[AIDataWrite] Communication draft created: %s for client %d by trainer %d', type, clientId, trainerId);
}
