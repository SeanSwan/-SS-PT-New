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
 */
import logger from '../utils/logger.mjs';

/**
 * Process an array of data update operations from the AI.
 * @param {number} targetUserId - The client whose data is being updated
 * @param {Array} updates - Array of {type, data} objects
 * @param {number} performedBy - The admin/trainer user who initiated the AI conversation
 * @param {object} sequelize - Sequelize instance for raw queries
 * @returns {object} - { successful: number, errors: Array<{type, message}> }
 */
export async function processAIDataUpdates(targetUserId, updates, performedBy, sequelize) {
  const results = { successful: 0, errors: [] };

  if (!Array.isArray(updates) || updates.length === 0) {
    return results;
  }

  // Safety: limit to 10 updates per AI response to prevent abuse
  const safeUpdates = updates.slice(0, 10);

  for (const update of safeUpdates) {
    try {
      switch (update.type) {
        case 'body_measurement':
          await insertBodyMeasurement(targetUserId, performedBy, update.data, sequelize);
          results.successful++;
          break;

        case 'goal':
          await upsertGoal(targetUserId, update.data, sequelize);
          results.successful++;
          break;

        case 'client_note':
          await insertClientNote(targetUserId, performedBy, update.data, sequelize);
          results.successful++;
          break;

        case 'macro_log':
          await insertMacroLog(targetUserId, update.data, sequelize);
          results.successful++;
          break;

        case 'progress_level':
          await updateProgressLevel(targetUserId, update.data, sequelize);
          results.successful++;
          break;

        default:
          results.errors.push({ type: update.type, message: `Unknown update type: ${update.type}` });
      }
    } catch (err) {
      logger.error('[AIDataWrite] Failed to process %s for user %d: %s', update.type, targetUserId, err.message);
      results.errors.push({ type: update.type, message: err.message });
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

  const replacements = {
    userId,
    date: data.date || new Date().toISOString().split('T')[0],
    mealType: data.mealType || 'snack',
    description: data.description,
    calories: data.calories || 0,
    protein: data.protein || 0,
    carbs: data.carbs || 0,
    fat: data.fat || 0,
    fiber: data.fiber || 0,
    sugar: data.sugar || 0,
    sodium: data.sodium || 0,
    source: 'ai_chat',
    verified: false,
  };

  await sequelize.query(
    `INSERT INTO daily_macro_logs ("userId", date, "mealType", description,
                                   calories, protein, carbs, fat, fiber, sugar, sodium,
                                   source, verified, "createdAt", "updatedAt")
     VALUES (:userId, :date, :mealType, :description,
             :calories, :protein, :carbs, :fat, :fiber, :sugar, :sodium,
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
