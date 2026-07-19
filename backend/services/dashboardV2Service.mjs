/**
 * dashboardV2Service — Dashboards v2 server data (KIMI-DASHBOARDS §2.3). ONE summary per role.
 *
 * Returns the exact `DashboardSummary` union the frontend types.ts declares — every value
 * pre-formatted, every person masked (refs.mjs). Real data via thin queries over verified models
 * (Session, Order, WorkoutSession, User, Achievement/UserAchievement) — no service re-query where a
 * composable service doesn't cleanly provide the shape. Each query group is wrapped so one missing
 * model degrades to empty/zero rather than 500-ing the whole dashboard (a dashboard must still render).
 *
 * finance: `revenue_today` is added ONLY when the caller passes finance:true (the controller reads the
 * SERVER flag DASHBOARD_V2_FINANCE — the client can never turn money on). PII: numeric ids never leave.
 */
import { Op } from 'sequelize';
import Session from '../models/Session.mjs';
import Order from '../models/Order.mjs';
import User from '../models/User.mjs';
import WorkoutSession from '../models/WorkoutSession.mjs';
import Achievement from '../models/Achievement.mjs';
import UserAchievement from '../models/UserAchievement.mjs';
import sequelize from '../database.mjs';
import {
  maskClient, maskTrainer, fmtMoney, fmtInt, fmtAge, sessionRowStatus, dayStart,
} from './dashboardV2/refs.mjs';

import {
  ADHERENCE_SESSION_STATUSES,
  BOOKED_SESSION_STATUSES,
  dailySeries,
  adherenceByClient,
  sessionEnd,
  toSessionRow,
} from './dashboardV2/projections.mjs';
// Achievement.rarity ENUM('common','rare','epic','legendary') → the 3 milestone tiers (no migration;
// the field already exists). Replaces the arbitrary index-mod tier (Codex/Gemini triangle finding).
const RARITY_TIER = { common: 'facet', rare: 'prism', epic: 'crown', legendary: 'crown' };

const nowIso = () => new Date().toISOString();
const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };

// ---------------------------------------------------------------- ADMIN
async function buildAdminSummary({ finance }) {
  const today0 = dayStart(0), chartStart = dayStart(6), tomorrow = dayStart(-1);
  const [activeClients, workoutsWeek, revenueCents, staleCt, recentSessionsRaw] = await Promise.all([
    safe(() => User.count({ where: { role: 'client', isActive: true } }), 0),
    safe(() => WorkoutSession.count({ where: { date: { [Op.gte]: chartStart, [Op.lt]: tomorrow } } }), 0),
    finance ? safe(() => Order.sum('totalAmount', { where: { status: 'completed', createdAt: { [Op.gte]: today0 } } }), 0) : Promise.resolve(null),
    safe(() => User.count({ where: { role: 'client', isActive: true, lastActive: { [Op.lt]: dayStart(14) } } }), 0),
    safe(() => Session.findAll({
      where: {
        status: { [Op.in]: BOOKED_SESSION_STATUSES },
        sessionDate: { [Op.gte]: chartStart, [Op.lt]: tomorrow },
      },
      order: [['sessionDate', 'ASC']],
    }), []),
  ]);

  const recentSessions = Array.isArray(recentSessionsRaw) ? recentSessionsRaw : [];
  const sessionsToday = recentSessions.filter((session) => {
    const at = new Date(session.sessionDate).getTime();
    return at >= today0.getTime() && at < tomorrow.getTime();
  });
  const trainerCounts = new Map();
  recentSessions.forEach((session) => {
    if (session.trainerId === null || session.trainerId === undefined) return;
    trainerCounts.set(session.trainerId, (trainerCounts.get(session.trainerId) || 0) + 1);
  });
  const trainerRows = [...trainerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const stats = [
    { key: 'active_clients', label: 'Active Clients', value: fmtInt(activeClients), accent: 'lens' },
    { key: 'sessions_today', label: 'Sessions Today', value: fmtInt(sessionsToday.length), accent: 'action' },
    { key: 'workouts_week', label: 'Workouts / 7d', value: fmtInt(workoutsWeek), accent: 'good' },
  ];
  if (finance) {
    stats.push({ key: 'revenue_today', label: 'Revenue Today', value: fmtMoney(revenueCents), accent: 'good' });
  }

  const alerts = [];
  if (staleCt > 0) {
    alerts.push({
      id: 'stale-clients', severity: staleCt > 5 ? 'critical' : 'warn',
      title: `${fmtInt(staleCt)} client${staleCt === 1 ? '' : 's'} inactive 14d+`,
      ageLabel: 'now', action: { label: 'Review', href: '/dashboard/admin/clients' },
    });
  }

  return {
    role: 'admin', generatedAt: nowIso(), stats, alerts,
    sessionsToday: sessionsToday.slice(0, 12).map(toSessionRow),
    trainerLoad: {
      labels: trainerRows.map(([trainerId]) => maskTrainer(trainerId)),
      values: trainerRows.map(([, count]) => count),
      unit: 'sessions/7d',
    },
    weeklySessions: dailySeries(recentSessions, 'sessionDate', 'sessions'),
  };
}

// ---------------------------------------------------------------- TRAINER
async function buildTrainerSummary({ userId }) {
  const today0 = dayStart(0), chartStart = dayStart(6), tomorrow = dayStart(-1);
  const recentSessionsRaw = await safe(
    () => Session.findAll({
      where: {
        trainerId: userId,
        status: { [Op.in]: BOOKED_SESSION_STATUSES },
        sessionDate: { [Op.gte]: chartStart, [Op.lt]: tomorrow },
      },
      order: [['sessionDate', 'ASC']],
    }),
    [],
  );
  const recentSessions = Array.isArray(recentSessionsRaw) ? recentSessionsRaw : [];
  const todaySessions = recentSessions.filter((session) => {
    const at = new Date(session.sessionDate).getTime();
    return at >= today0.getTime() && at < tomorrow.getTime();
  });
  const rows = todaySessions.map(toSessionRow);
  const now = rows.find((r) => r.status === 'active') || null;
  const next = rows.find((r) => r.status === 'upcoming') || null;
  const nextRaw = todaySessions.find(
    (s) => sessionRowStatus(s.status, s.sessionDate, s.attendanceStatus, sessionEnd(s)) === 'upcoming',
  );
  const minutesUntilNext = nextRaw?.sessionDate
    ? Math.max(0, Math.round((new Date(nextRaw.sessionDate).getTime() - Date.now()) / 60000)) : null;

  const rosterRaw = await safe(
    () => Session.findAll({
      where: {
        trainerId: userId,
        userId: { [Op.ne]: null },
        status: 'completed',
      },
      attributes: ['userId', [sequelize.fn('MAX', sequelize.col('sessionDate')), 'last']],
      group: ['userId'], order: [[sequelize.literal('last'), 'DESC']], limit: 10, raw: true,
    }),
    [],
  );
  const rosterAdherence = adherenceByClient(recentSessions);
  const roster = rosterRaw.map((r) => ({
    clientRef: maskClient(r.userId),
    lastSessionLabel: fmtAge(r.last),
    adherencePct: rosterAdherence.get(String(r.userId)) || 0,
  }));

  return {
    role: 'trainer', generatedAt: nowIso(),
    now, next, minutesUntilNext,
    roster, today: rows,
    clientProgress: dailySeries(recentSessions, 'sessionDate', 'sessions'),
  };
}

// ---------------------------------------------------------------- milestones (client + user)
async function buildMilestones(userId) {
  // only EARNED badges (isCompleted) belong in the trophy case — a UserAchievement row is created at
  // progress-start, so an unfiltered query surfaces in-progress/never-earned badges as if earned.
  const earned = await safe(
    () => UserAchievement.findAll({
      where: { userId, isCompleted: true },
      order: [['earnedAt', 'DESC']],
      limit: 8,
      raw: true,
    }),
    [],
  );
  if (!earned.length) return [];
  const achIds = earned.map((e) => e.achievementId);
  const [achievements, crystals] = await Promise.all([
    safe(() => Achievement.findAll({ where: { id: { [Op.in]: achIds } }, raw: true }), []),
    safe(() => sequelize.query(
      'SELECT "achievementId" FROM achievement_crystallizations WHERE "userId" = :userId AND "achievementId" IN (:ids)',
      { replacements: { userId, ids: achIds }, type: sequelize.QueryTypes.SELECT },
    ), []),
  ]);
  const metaOf = new Map(
    achievements.map((a) => [String(a.id), { title: a.title || a.name || 'Achievement', rarity: a.rarity }]),
  );
  const crystalSet = new Set(crystals.map((c) => String(c.achievementId)));
  return earned.map((e) => {
    const meta = metaOf.get(String(e.achievementId));
    return {
      id: String(e.achievementId),
      tier: RARITY_TIER[meta?.rarity] || 'facet', // real rarity → tier, deterministic per achievement
      title: meta?.title || 'Achievement',
      earnedLabel: e.earnedAt ? fmtAge(e.earnedAt) : null, // the EARN moment, not the progress-start row date

      crystallized: crystalSet.has(String(e.achievementId)),
    };
  });
}

async function progressSeries(userId) {
  const rows = await safe(
    () => WorkoutSession.findAll({
      where: {
        userId,
        date: { [Op.gte]: dayStart(6), [Op.lt]: dayStart(-1) },
      },
      attributes: ['date'],
      raw: true,
    }),
    [],
  );
  return dailySeries(rows, 'date', 'workouts');
}

// ---------------------------------------------------------------- CLIENT
async function buildClientSummary({ userId }) {
  const weekStart = dayStart(new Date().getDay());
  const weekEnd = dayStart(new Date().getDay() - 7);
  const [scheduled, completed] = await Promise.all([
    safe(() => Session.count({
      where: {
        userId,
        status: { [Op.in]: ADHERENCE_SESSION_STATUSES },
        sessionDate: { [Op.gte]: weekStart, [Op.lt]: weekEnd },
      },
    }), 0),
    safe(() => Session.count({ where: { userId, status: 'completed', sessionDate: { [Op.gte]: weekStart, [Op.lt]: weekEnd } } }), 0),
  ]);
  const adherencePct = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

  const chartStart = dayStart(6), chartEnd = dayStart(-1);
  const workoutStart = new Date(Math.min(weekStart.getTime(), chartStart.getTime()));
  const workoutEnd = new Date(Math.max(weekEnd.getTime(), chartEnd.getTime()));
  const workoutRows = await safe(
    () => WorkoutSession.findAll({
      where: { userId, date: { [Op.gte]: workoutStart, [Op.lt]: workoutEnd } },
      attributes: ['date'],
      raw: true,
    }),
    [],
  );
  const doneSet = new Set(
    workoutRows.map((row) => new Date(row.date).toDateString()),
  );
  const todayStr = new Date().toDateString();
  // getDay()-i walks Sun→Sat (i=0 → this week's Sunday … i=6 → Saturday); NO reverse — reversing it
  // rendered the strip Sat-first with future days on the left.
  const planWeek = Array.from({ length: 7 }, (_, i) => {
    const d = dayStart(new Date().getDay() - i);
    return { dayLabel: d.toLocaleDateString('en-US', { weekday: 'narrow' }), done: doneSet.has(d.toDateString()), today: d.toDateString() === todayStr };
  });

  return {
    role: 'client', generatedAt: nowIso(),
    adherencePct,
    planWeek,
    nextBestAction: {
      key: adherencePct >= 80 ? 'stay' : 'log',
      title: adherencePct >= 80 ? 'Keep the streak alive' : 'Log today’s workout',
      body: adherencePct >= 80 ? 'You’re ahead of plan this week. Bank one more session.' : 'One logged session keeps your plan on track.',
      cta: { label: 'Open workout', href: '/dashboard/client/workouts' },
    },
    progress: dailySeries(workoutRows, 'date', 'workouts'),
    milestones: await buildMilestones(userId),
  };
}

// ---------------------------------------------------------------- USER
async function buildUserSummary({ userId }) {
  const week0 = dayStart(7);
  const [workoutsWeek, totalWorkouts] = await Promise.all([
    safe(() => WorkoutSession.count({ where: { userId, date: { [Op.gte]: week0 } } }), 0),
    safe(() => WorkoutSession.count({ where: { userId } }), 0),
  ]);
  return {
    role: 'user', generatedAt: nowIso(),
    stats: [
      { key: 'workouts_week', label: 'This Week', value: fmtInt(workoutsWeek), accent: 'lens' },
      { key: 'workouts_total', label: 'All Time', value: fmtInt(totalWorkouts), accent: 'good' },
    ],
    progress: await progressSeries(userId),
    milestones: await buildMilestones(userId),
    nextBestAction: {
      key: 'log', title: 'Log a workout', body: 'Keep your progress chart moving.',
      cta: { label: 'Start', href: '/dashboard/user/workouts' },
    },
    community: [],
  };
}

/** Dispatch. `role` is already authorization-resolved by the controller; `userId` is the subject. */
export async function getDashboardSummary({ role, userId, finance }) {
  switch (role) {
    case 'admin': return buildAdminSummary({ finance });
    case 'trainer': return buildTrainerSummary({ userId });
    case 'client': return buildClientSummary({ userId });
    case 'user': return buildUserSummary({ userId });
    default: { const e = new Error('Unknown role.'); e.statusCode = 400; throw e; }
  }
}
