import { deIdentifyClient } from '../deIdentifier.mjs';

function selectType(sequelize) {
  return sequelize?.QueryTypes?.SELECT || 'SELECT';
}

const CONTEXT_UNAVAILABLE = 'AI_CONTEXT_UNAVAILABLE';

async function requiredQuery(sequelize, sql, replacements) {
  try {
    const rows = await sequelize.query(sql, {
      replacements,
      type: selectType(sequelize),
    });
    if (!Array.isArray(rows)) throw new Error('invalid query response');
    return rows;
  } catch {
    const error = new Error('Required client health data is temporarily unavailable.');
    error.code = CONTEXT_UNAVAILABLE;
    throw error;
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
  const profileRows = await requiredQuery(
    sequelize,
    // "Users" has no age/nasmPhase; the column is singular "fitnessGoal" (SWA-71).
    `SELECT id, "firstName", "lastName", "dateOfBirth", gender,
            "trainingExperience", "fitnessGoal" AS "fitnessGoals", "clientSource", "isActive"
     FROM "Users"
     WHERE id = :clientId
     LIMIT 1`,
    replacements,
  );
  const clientRow = profileRows[0];

  const [painEntries, recentWorkouts, macroLogs, goals] = await Promise.all([
    requiredQuery(
      sequelize,
      // client_pain_entries / "bodyRegion" (SWA-71); aliased to keep the output shape.
      `SELECT "bodyRegion" AS "bodyPart", "painLevel" as level, "isActive"
       FROM client_pain_entries
       WHERE "userId" = :clientId AND "isActive" = true
       ORDER BY "createdAt" DESC
       LIMIT 10`,
      replacements,
    ),
    requiredQuery(
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
    requiredQuery(
      sequelize,
      `SELECT calories, protein, carbs, fat
       FROM daily_macro_logs
       WHERE "userId" = :clientId
       ORDER BY "createdAt" DESC
       LIMIT 7`,
      replacements,
    ),
    requiredQuery(
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
    painEntries,
    workouts: recentWorkouts,
    macroLogs,
    goals,
  });
}

export default buildDebateClientContext;
