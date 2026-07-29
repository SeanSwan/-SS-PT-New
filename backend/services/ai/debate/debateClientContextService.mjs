import { deIdentifyClient } from '../deIdentifier.mjs';

function selectType(sequelize) {
  return sequelize?.QueryTypes?.SELECT || 'SELECT';
}

async function safeQuery(sequelize, sql, replacements) {
  try {
    return await sequelize.query(sql, {
      replacements,
      type: selectType(sequelize),
    });
  } catch {
    return [];
  }
}

export async function buildDebateClientContext(clientId, sequelize, fallbackClient = {}) {
  if (!clientId) {
    throw new Error('buildDebateClientContext: clientId is required');
  }
  if (!sequelize?.query) {
    throw new Error('buildDebateClientContext: sequelize query interface is required');
  }

  const replacements = { clientId };
  const [clientRow] = await safeQuery(
    sequelize,
    // "Users" has no age/nasmPhase; the column is singular "fitnessGoal" (SWA-71).
    `SELECT id, "firstName", "lastName", "dateOfBirth", gender,
            "trainingExperience", "fitnessGoal" AS "fitnessGoals", "clientSource", "isActive"
     FROM "Users"
     WHERE id = :clientId
     LIMIT 1`,
    replacements,
  );

  const [painEntries, recentWorkouts, macroLogs, goals] = await Promise.allSettled([
    safeQuery(
      sequelize,
      // client_pain_entries / "bodyRegion" (SWA-71); aliased to keep the output shape.
      `SELECT "bodyRegion" AS "bodyPart", "painLevel" as level, "isActive"
       FROM client_pain_entries
       WHERE "userId" = :clientId AND "isActive" = true
       ORDER BY "createdAt" DESC
       LIMIT 10`,
      replacements,
    ),
    safeQuery(
      sequelize,
      `SELECT
         ws.id,
         ws.title,
         ws.date AS "createdAt",
         ws.duration,
         ws.intensity,
         ws.notes,
         json_agg(json_build_object(
           'exerciseName', wl."exerciseName",
           'name', wl."exerciseName",
           'setNumber', wl."setNumber",
           'reps', wl.reps,
           'weight', wl.weight
         ) ORDER BY wl."exerciseName", wl."setNumber") AS exercises
       FROM workout_sessions ws
       JOIN workout_logs wl ON wl."sessionId" = ws.id
       WHERE ws."userId" = :clientId
         AND ws.status = 'completed'
       GROUP BY ws.id, ws.title, ws.date, ws.duration, ws.intensity, ws.notes
       ORDER BY ws.date DESC
       LIMIT 5`,
      replacements,
    ),
    safeQuery(
      sequelize,
      `SELECT calories, protein, carbs, fat
       FROM daily_macro_logs
       WHERE "userId" = :clientId
       ORDER BY "createdAt" DESC
       LIMIT 7`,
      replacements,
    ),
    safeQuery(
      sequelize,
      // lowercase `goals` / "progressPercentage" (SWA-71); ::float since NUMERIC arrives as text.
      `SELECT title, description, "progressPercentage"::float AS progress, status
       FROM goals
       WHERE "userId" = :clientId AND status = 'active'
       LIMIT 10`,
      replacements,
    ),
  ]);

  const client = {
    id: clientId,
    ...fallbackClient,
    ...(clientRow || {}),
  };

  return deIdentifyClient(client, {
    painEntries: painEntries.status === 'fulfilled' ? painEntries.value : [],
    workouts: recentWorkouts.status === 'fulfilled' ? recentWorkouts.value : [],
    macroLogs: macroLogs.status === 'fulfilled' ? macroLogs.value : [],
    goals: goals.status === 'fulfilled' ? goals.value : [],
  });
}

export default buildDebateClientContext;
