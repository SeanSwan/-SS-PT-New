/**
 * Coach Context Engine — The Hive-Mind Read Layer (Slice A1)
 * ===========================================================
 * Given WHO is asking (role) and WHICH client, aggregates every relevant
 * data domain through the fail-closed client-access gate, de-identifies the
 * result, and returns ONE structured context block safe to hand to any model
 * (including future BYOM models).
 *
 * Generalizes the proven debateClientContextService pattern:
 *   - Promise.allSettled per domain — a failing domain degrades, never throws
 *   - deIdentifyClient() output — IDs/aliases only, zero PII
 *   - authorization FIRST — denied access loads ZERO domains
 *
 * Domains v1 (all schema-verified 2026-06-10): profile + session credits,
 * last-5 workouts, active pain, 7-day macros, active goals, upcoming schedule.
 * Gamification is DEFERRED to A2 (schema unverified — reported in dataQuality).
 */
import { deIdentifyClient } from '../deIdentifier.mjs';
import { checkClientAccess, CLIENT_ACCESS_DENIED_MESSAGE } from './clientAccess.mjs';

function selectType(sequelize) {
  return sequelize?.QueryTypes?.SELECT || 'SELECT';
}

async function safeQuery(sequelize, sql, replacements) {
  return sequelize.query(sql, { replacements, type: selectType(sequelize) });
}

const DOMAIN_LOADERS = {
  profile: (sequelize, replacements) => safeQuery(
    sequelize,
    `SELECT id, "firstName", "lastName", age, gender, "nasmPhase",
            "trainingExperience", "fitnessGoals", "clientSource", "isActive",
            "availableSessions"
     FROM "Users"
     WHERE id = :clientId
     LIMIT 1`,
    replacements,
  ),
  workouts: (sequelize, replacements) => safeQuery(
    sequelize,
    `SELECT
       ws.id, ws.title, ws.date AS "createdAt", ws.duration, ws.intensity,
       json_agg(json_build_object(
         'exerciseName', wl."exerciseName",
         'setNumber', wl."setNumber",
         'reps', wl.reps,
         'weight', wl.weight
       ) ORDER BY wl."exerciseName", wl."setNumber") AS exercises
     FROM workout_sessions ws
     JOIN workout_logs wl ON wl."sessionId" = ws.id
     WHERE ws."userId" = :clientId AND ws.status = 'completed'
     GROUP BY ws.id, ws.title, ws.date, ws.duration, ws.intensity
     ORDER BY ws.date DESC
     LIMIT 5`,
    replacements,
  ),
  pain: (sequelize, replacements) => safeQuery(
    sequelize,
    `SELECT "bodyPart", "painLevel" as level, "isActive"
     FROM "PainEntries"
     WHERE "userId" = :clientId AND "isActive" = true
     ORDER BY "createdAt" DESC
     LIMIT 10`,
    replacements,
  ),
  macros: (sequelize, replacements) => safeQuery(
    sequelize,
    `SELECT calories, protein, carbs, fat
     FROM "MacroLogs"
     WHERE "userId" = :clientId
     ORDER BY "createdAt" DESC
     LIMIT 7`,
    replacements,
  ),
  goals: (sequelize, replacements) => safeQuery(
    sequelize,
    `SELECT title, description, progress, status
     FROM "Goals"
     WHERE "userId" = :clientId AND status = 'active'
     LIMIT 10`,
    replacements,
  ),
  schedule: (sequelize, replacements) => safeQuery(
    sequelize,
    `SELECT id, "sessionDate", duration, status
     FROM sessions
     WHERE "userId" = :clientId
       AND "sessionDate" >= NOW()
       AND status IN ('scheduled', 'confirmed')
     ORDER BY "sessionDate" ASC
     LIMIT 5`,
    replacements,
  ),
};

const DOMAIN_NAMES = Object.keys(DOMAIN_LOADERS);

/** Schedule rows → PII-free summary (dates/status only, by construction). */
function summarizeSchedule(rows) {
  const sessions = Array.isArray(rows) ? rows : [];
  return {
    upcomingCount: sessions.length,
    nextSessionDate: sessions[0]?.sessionDate
      ? new Date(sessions[0].sessionDate).toISOString()
      : null,
    statuses: sessions.map((s) => s.status),
  };
}

/**
 * Build the de-identified cross-domain context block for one client.
 *
 * @param {Object} args
 * @param {Object} args.user            { id, role } — the requester
 * @param {number} args.targetClientId  client whose context to assemble
 * @param {Object} args.sequelize       live Sequelize instance
 * @returns {Promise<{
 *   ok: boolean,
 *   deniedReason?: string,
 *   message?: string,
 *   context?: Object,
 *   aliasMap?: Object,
 *   dataQuality?: Array<{domain: string, status: 'ok'|'degraded'|'deferred'}>,
 *   accessVia?: string,
 * }>}
 */
export async function buildCoachContext({ user, targetClientId, sequelize }) {
  // 1. AUTHORIZATION FIRST — denied access loads zero domains.
  const access = await checkClientAccess(user, targetClientId, sequelize);
  if (!access.allowed) {
    return {
      ok: false,
      deniedReason: access.reason,
      message: CLIENT_ACCESS_DENIED_MESSAGE,
    };
  }

  if (!sequelize?.query) {
    return { ok: false, deniedReason: 'no_database', message: 'Database connection not available.' };
  }

  const clientId = Number(targetClientId);
  const replacements = { clientId };

  // 2. Load all domains in parallel; per-domain failure degrades, never throws.
  const settled = await Promise.allSettled(
    DOMAIN_NAMES.map((domain) => DOMAIN_LOADERS[domain](sequelize, replacements)),
  );

  const results = {};
  const dataQuality = [];
  DOMAIN_NAMES.forEach((domain, i) => {
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      results[domain] = outcome.value;
      dataQuality.push({ domain, status: 'ok' });
    } else {
      results[domain] = [];
      dataQuality.push({ domain, status: 'degraded' });
    }
  });
  dataQuality.push({ domain: 'gamification', status: 'deferred' }); // A2 — schema unverified

  // 3. De-identify. Names/emails never leave this function.
  const clientRow = (results.profile && results.profile[0]) || {};
  const { deIdentified, aliasMap } = deIdentifyClient(
    { id: clientId, ...clientRow },
    {
      painEntries: results.pain,
      workouts: results.workouts,
      macroLogs: results.macros,
      goals: results.goals,
    },
  );

  // 4. Attach PII-free extras the de-identifier doesn't model.
  const context = {
    ...deIdentified,
    sessionCredits: Number.isFinite(Number(clientRow.availableSessions))
      ? Number(clientRow.availableSessions)
      : null,
    schedule: summarizeSchedule(results.schedule),
    workoutCount: Array.isArray(results.workouts) ? results.workouts.length : 0,
    lastWorkoutDate: results.workouts?.[0]?.createdAt
      ? new Date(results.workouts[0].createdAt).toISOString().slice(0, 10)
      : null,
  };

  return { ok: true, context, aliasMap, dataQuality, accessVia: access.via };
}

export { DOMAIN_NAMES as CONTEXT_DOMAINS };
