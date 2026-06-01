import { NON_DEDUCTING_CLIENT_SOURCES } from '../services/sessionBillingPolicy.mjs';

export function buildAtRiskComplianceQuery({ user, limit = 50 } = {}) {
  const safeLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 50));
  const trainerScoped = user?.role === 'trainer';
  const trainerJoin = trainerScoped
    ? `
        INNER JOIN client_trainer_assignments cta
          ON cta."clientId" = u.id
         AND cta."trainerId" = :trainerId
         AND cta.status = 'active'
      `
    : '';
  const replacements = { limit: safeLimit };
  if (trainerScoped) {
    replacements.trainerId = user.id;
  }

  return {
    sql: `
      SELECT
        u.id,
        u."firstName",
        u."lastName",
        u.photo,
        u."availableSessions",
        u."clientSource",
        MAX(ws.date) AS "lastWorkoutDate",
        COUNT(CASE WHEN ws.date >= NOW() - INTERVAL '7 days' THEN 1 END) AS "workouts7d",
        COUNT(CASE WHEN ws.date >= NOW() - INTERVAL '30 days' THEN 1 END) AS "workouts30d"
      FROM "Users" u
      ${trainerJoin}
      LEFT JOIN workout_sessions ws
        ON ws."userId" = u.id
       AND ws.status = 'completed'
      WHERE u.role = 'client' AND u."isActive" != false
      GROUP BY u.id
      ORDER BY MAX(ws.date) ASC NULLS FIRST
      LIMIT :limit
    `,
    replacements,
  };
}

export function buildAtRiskComplianceClient(c, nowMs = Date.now()) {
  const lastWorkout = c.lastWorkoutDate ? new Date(c.lastWorkoutDate) : null;
  const daysSince = lastWorkout ? Math.floor((nowMs - lastWorkout.getTime()) / 86400000) : 999;
  const w7d = Number(c.workouts7d || 0);
  const w30d = Number(c.workouts30d || 0);
  const compliance7d = Math.min(100, Math.round((w7d / 3) * 100));
  const compliance30d = Math.min(100, Math.round((w30d / 12) * 100));
  const sessions = Number(c.availableSessions || 0);
  const clientSource = c.clientSource || 'swanstudios';
  const isFreeTracking = NON_DEDUCTING_CLIENT_SOURCES.has(clientSource);

  let riskLevel = 'watch';
  let reason = '';
  if (daysSince > 10 || (compliance30d < 30 && w30d < 3)) {
    riskLevel = 'critical';
    reason = daysSince > 10
      ? `No workouts in ${daysSince} days`
      : `Very low compliance (${compliance30d}%) this month`;
    if (!isFreeTracking && sessions <= 2) {
      reason += `, only ${sessions} session${sessions !== 1 ? 's' : ''} remaining`;
    }
  } else if (daysSince > 5 || compliance30d < 50) {
    riskLevel = 'warning';
    reason = `Compliance dropped to ${compliance30d}% (${w30d} workouts in 30 days)`;
  } else if (daysSince > 3 || compliance7d < 66) {
    reason = `Moderate activity - ${w7d} workout${w7d !== 1 ? 's' : ''} this week`;
  } else {
    return null;
  }

  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    photo: c.photo || null,
    clientSource,
    isFreeTracking,
    riskLevel,
    reason,
    daysSinceLastWorkout: daysSince === 999 ? 0 : daysSince,
    complianceRate7d: compliance7d,
    complianceRate30d: compliance30d,
    sessionsRemaining: isFreeTracking ? null : sessions,
  };
}

export function sortAtRiskClients(clients) {
  const order = { critical: 0, warning: 1, watch: 2 };
  return [...clients].sort((a, b) => (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3));
}
