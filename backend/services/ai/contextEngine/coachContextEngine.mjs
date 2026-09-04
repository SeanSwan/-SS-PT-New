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
 * Domains v1: profile + session credits, last-5 workouts, active pain,
 * nutrition summary, active goals, upcoming schedule, and displayed Badge Creator
 * rewards. Gamification uses user XP plus badge summary.
 */
import { deIdentifyClient } from '../deIdentifier.mjs';
import { checkClientAccess, CLIENT_ACCESS_DENIED_MESSAGE, parseContextClientId } from './clientAccess.mjs';
import { getTier, getTierDisplay } from '../../../utils/levelingAlgorithm.mjs';
import { summarizeNutritionLogs } from './coachNutritionContext.mjs';
import { loadCoachBadgeRows, summarizeCoachBadges } from './coachGamificationContext.mjs';
import { buildCoachEvidenceEnvelope } from './coachContextEvidence.mjs';

function selectType(sequelize) {
  return sequelize?.QueryTypes?.SELECT || 'SELECT';
}

async function safeQuery(sequelize, sql, replacements) {
  return sequelize.query(sql, { replacements, type: selectType(sequelize) });
}

const DOMAIN_LOADERS = {
  profile: (sequelize, replacements) => safeQuery(
    sequelize,
    // "Users" has no age/nasmPhase, and the column is singular "fitnessGoal" (SWA-71).
    // deIdentifyClient derives age from dateOfBirth and defaults nasmPhase itself.
    `SELECT id, "firstName", "lastName", "dateOfBirth", gender,
            "trainingExperience", "fitnessGoal" AS "fitnessGoals", "clientSource", "isActive",
            "availableSessions", points, level, tier, "streakDays", "totalWorkouts"
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
    // Real table is client_pain_entries and the real column is "bodyRegion" (SWA-71).
    // Aliased back to "bodyPart" so consumers keep their existing shape.
    `SELECT "bodyRegion" AS "bodyPart", "painLevel" as level, "isActive"
     FROM client_pain_entries
     WHERE "userId" = :clientId AND "isActive" = true
     ORDER BY "createdAt" DESC
     LIMIT 10`,
    replacements,
  ),
  nutrition: (sequelize, replacements) => safeQuery(
    sequelize,
    `SELECT date, "mealType", calories, protein, carbs, fat, fiber, sugar,
            sodium, source, verified, "flagSodium", "flagSugar", "flagProcessed",
            "createdAt"
     FROM daily_macro_logs
     WHERE "userId" = :clientId
     ORDER BY "createdAt" DESC
     LIMIT 21`,
    replacements,
  ),
  goals: (sequelize, replacements) => safeQuery(
    sequelize,
    // Real table is lowercase `goals`; real column is "progressPercentage" (SWA-71).
    // ::float because NUMERIC arrives as a STRING from node-postgres.
    `SELECT title, description, "progressPercentage"::float AS progress, status
     FROM goals
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
  badges: (sequelize, replacements) => loadCoachBadgeRows(
    sequelize,
    replacements,
    selectType(sequelize),
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

  const clientId = parseContextClientId(targetClientId);
  if (clientId === null) {
    return {
      ok: false,
      deniedReason: 'invalid_request',
      message: CLIENT_ACCESS_DENIED_MESSAGE,
    };
  }
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
  // Gamification rides the profile row (points/level/tier/streak columns on
  // "Users" — schema verified 2026-06-10 via gamificationCommandDispatchers).
  dataQuality.push({
    domain: 'gamification',
    status: dataQuality.find((d) => d.domain === 'profile')?.status === 'ok' ? 'ok' : 'degraded',
  });

  // 3. De-identify. Names/emails never leave this function.
  const clientRow = (results.profile && results.profile[0]) || {};
  const { deIdentified, aliasMap } = deIdentifyClient(
    { id: clientId, ...clientRow },
    {
      painEntries: results.pain,
      workouts: results.workouts,
      macroLogs: results.nutrition,
      goals: results.goals,
    },
  );

  // 4. Attach PII-free extras the de-identifier doesn't model.
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

  const hasProfileRow = Array.isArray(results.profile) && results.profile.length > 0;
  const clientLevel = toNum(clientRow.level) ?? (hasProfileRow ? 1 : null);
  const context = {
    ...deIdentified,
    sessionCredits: toNum(clientRow.availableSessions),
    schedule: summarizeSchedule(results.schedule),
    nutrition: summarizeNutritionLogs(results.nutrition),
    workoutCount: Array.isArray(results.workouts) ? results.workouts.length : 0,
    lastWorkoutDate: results.workouts?.[0]?.createdAt
      ? new Date(results.workouts[0].createdAt).toISOString().slice(0, 10)
      : null,
    gamification: {
      points: toNum(clientRow.points),
      level: clientLevel,
      tier: clientRow.tier ?? null,
      rankTitle: clientLevel ? getTierDisplay(getTier(clientLevel)).name : null,
      streakDays: toNum(clientRow.streakDays),
      totalWorkouts: toNum(clientRow.totalWorkouts),
      badges: summarizeCoachBadges(results.badges),
    },
  };

  return {
    ok: true,
    context,
    aliasMap,
    dataQuality,
    evidence: buildCoachEvidenceEnvelope({ dataQuality, accessVia: access.via }),
    accessVia: access.via,
  };
}

// ── Trainer Day-Sheet (Slice A2) ────────────────────────────────────────────

/**
 * Build the "how's my day look" context: today's sessions for the requester
 * (trainer = own sessions ONLY; admin = all of today's sessions), with
 * de-identified per-client attention flags. Bounded + batched: 3 queries max.
 *
 * @param {Object} args
 * @param {Object} args.user      { id, role } — trainer or admin
 * @param {Object} args.sequelize live Sequelize instance
 * @returns {Promise<{ ok: boolean, message?: string, day?: Object }>}
 */
export async function buildTrainerDayContext({ user, sequelize }) {
  if (!user?.id || (user.role !== 'trainer' && user.role !== 'admin')) {
    return { ok: false, message: 'Day briefs are available to trainers and admins.' };
  }
  if (!sequelize?.query) {
    return { ok: false, message: 'Database connection not available.' };
  }

  const isAdmin = user.role === 'admin';
  let sessions;
  try {
    sessions = await safeQuery(
      sequelize,
      `SELECT id, "sessionDate", duration, status, "userId", "trainerId"
       FROM sessions
       WHERE "sessionDate" >= CURRENT_DATE
         AND "sessionDate" < CURRENT_DATE + INTERVAL '1 day'
         AND status IN ('scheduled', 'confirmed', 'completed')
         ${isAdmin ? '' : 'AND "trainerId" = :trainerId'}
       ORDER BY "sessionDate" ASC
       LIMIT 20`,
      isAdmin ? {} : { trainerId: user.id },
    );
  } catch (err) {
    return { ok: false, message: 'Could not load today\'s schedule right now. No data was changed.' };
  }

  const clientIds = [...new Set(sessions.map((s) => s.userId).filter(Boolean))];

  let clientRows = [];
  let painRows = [];
  if (clientIds.length > 0) {
    [clientRows, painRows] = await Promise.all([
      safeQuery(
        sequelize,
        `SELECT id, "availableSessions", "streakDays" FROM "Users" WHERE id IN (:clientIds)`,
        { clientIds },
      ).catch(() => []),
      safeQuery(
        sequelize,
        `SELECT "userId", COUNT(*) AS "activePain"
         FROM client_pain_entries
         WHERE "userId" IN (:clientIds) AND "isActive" = true
         GROUP BY "userId"`,
        { clientIds },
      ).catch(() => []),
    ]);
  }

  const clientById = new Map(clientRows.map((r) => [Number(r.id), r]));
  const painByClient = new Map(painRows.map((r) => [Number(r.userId), Number(r.activePain)]));

  const day = {
    sessionCount: sessions.length,
    sessions: sessions.map((s) => {
      const clientId = Number(s.userId);
      const client = clientById.get(clientId) || {};
      const credits = Number.isFinite(Number(client.availableSessions))
        ? Number(client.availableSessions)
        : null;
      const flags = [];
      if ((painByClient.get(clientId) || 0) > 0) flags.push('active pain');
      if (credits !== null && credits <= 2) flags.push(`credits low (${credits})`);
      return {
        time: s.sessionDate ? new Date(s.sessionDate).toISOString() : null,
        durationMinutes: s.duration ?? null,
        status: s.status,
        clientAlias: clientId ? `Client-${clientId}` : null,
        clientId: clientId || null,
        flags,
      };
    }),
  };

  return { ok: true, day };
}

export { DOMAIN_NAMES as CONTEXT_DOMAINS };
