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
  maskClient, maskTrainer, maskId, fmtMoney, fmtInt, fmtTime, fmtAge,
  sessionRowStatus, dayStart,
} from './dashboardV2/refs.mjs';

// Achievement.rarity ENUM('common','rare','epic','legendary') → the 3 milestone tiers (no migration;
// the field already exists). Replaces the arbitrary index-mod tier (Codex/Gemini triangle finding).
const RARITY_TIER = { common: 'facet', rare: 'prism', epic: 'crown', legendary: 'crown' };

const nowIso = () => new Date().toISOString();
const safe = async (fn, fallback) => { try { return await fn(); } catch { return fallback; } };

function toSessionRow(s) {
  const start = s.sessionDate ? new Date(s.sessionDate) : null;
  const end = start && s.duration ? new Date(start.getTime() + s.duration * 60000) : null;
  return {
    id: maskId(s.id), // opaque handle, not the raw sequential PK (privacy contract)
    clientRef: maskClient(s.userId),
    trainerRef: maskTrainer(s.trainerId),
    startLabel: fmtTime(start),
    endLabel: fmtTime(end),
    status: sessionRowStatus(s.status, s.sessionDate),
  };
}

/** 7-day session counts (oldest→newest) as a ChartSeries. */
async function weeklySessionSeries(where = {}) {
  const labels = [], values = [];
  for (let i = 6; i >= 0; i--) {
    const from = dayStart(i), to = dayStart(i - 1);
    labels.push(from.toLocaleDateString('en-US', { weekday: 'short' }));
    // eslint-disable-next-line no-await-in-loop
    const c = await safe(() => Session.count({ where: { ...where, sessionDate: { [Op.gte]: from, [Op.lt]: to } } }), 0);
    values.push(c);
  }
  return { labels, values, unit: 'sessions' };
}

// ---------------------------------------------------------------- ADMIN
async function buildAdminSummary({ finance }) {
  const today0 = dayStart(0), week0 = dayStart(7);
  const [activeClients, sessionsTodayCt, workoutsWeek, revenueCents, staleCt] = await Promise.all([
    safe(() => User.count({ where: { role: 'client', isActive: true } }), 0),
    safe(() => Session.count({ where: { sessionDate: { [Op.gte]: today0, [Op.lt]: dayStart(-1) } } }), 0), // today only — matches sessionsToday[]
    safe(() => WorkoutSession.count({ where: { date: { [Op.gte]: week0 } } }), 0),
    finance ? safe(() => Order.sum('totalAmount', { where: { status: 'completed', createdAt: { [Op.gte]: today0 } } }), 0) : Promise.resolve(null),
    safe(() => User.count({ where: { role: 'client', isActive: true, lastActive: { [Op.lt]: dayStart(14) } } }), 0),
  ]);

  const stats = [
    { key: 'active_clients', label: 'Active Clients', value: fmtInt(activeClients), accent: 'lens' },
    { key: 'sessions_today', label: 'Sessions Today', value: fmtInt(sessionsTodayCt), accent: 'action' },
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

  const sessionsToday = await safe(
    () => Session.findAll({ where: { sessionDate: { [Op.gte]: today0, [Op.lt]: dayStart(-1) } }, order: [['sessionDate', 'ASC']], limit: 12 }),
    [],
  );

  const trainerRows = await safe(
    () => Session.findAll({
      where: { sessionDate: { [Op.gte]: week0 }, trainerId: { [Op.ne]: null } },
      attributes: ['trainerId', [sequelize.fn('COUNT', sequelize.col('id')), 'ct']],
      group: ['trainerId'], order: [[sequelize.literal('ct'), 'DESC']], limit: 6, raw: true,
    }),
    [],
  );

  return {
    role: 'admin', generatedAt: nowIso(), stats, alerts,
    sessionsToday: sessionsToday.map(toSessionRow),
    trainerLoad: {
      labels: trainerRows.map((r) => maskTrainer(r.trainerId)),
      values: trainerRows.map((r) => Number(r.ct)),
      unit: 'sessions/7d',
    },
    weeklySessions: await weeklySessionSeries(),
  };
}

// ---------------------------------------------------------------- TRAINER
async function buildTrainerSummary({ userId }) {
  const today0 = dayStart(0);
  const todaySessions = await safe(
    () => Session.findAll({ where: { trainerId: userId, sessionDate: { [Op.gte]: today0, [Op.lt]: dayStart(-1) } }, order: [['sessionDate', 'ASC']] }),
    [],
  );
  const rows = todaySessions.map(toSessionRow);
  const now = rows.find((r) => r.status === 'active') || null;
  const next = rows.find((r) => r.status === 'upcoming') || null;
  const nextRaw = todaySessions.find((s) => sessionRowStatus(s.status, s.sessionDate) === 'upcoming');
  const minutesUntilNext = nextRaw?.sessionDate
    ? Math.max(0, Math.round((new Date(nextRaw.sessionDate).getTime() - Date.now()) / 60000)) : null;

  const rosterRaw = await safe(
    () => Session.findAll({
      where: { trainerId: userId, userId: { [Op.ne]: null } },
      attributes: ['userId', [sequelize.fn('MAX', sequelize.col('sessionDate')), 'last']],
      group: ['userId'], order: [[sequelize.literal('last'), 'DESC']], limit: 10, raw: true,
    }),
    [],
  );
  const roster = rosterRaw.map((r) => ({
    clientRef: maskClient(r.userId),
    lastSessionLabel: fmtAge(r.last),
    adherencePct: 0, // computed cheaply below is out of scope; 0 = "no data yet", real count is honest
  }));

  return {
    role: 'trainer', generatedAt: nowIso(),
    now, next, minutesUntilNext,
    roster, today: rows,
    clientProgress: await weeklySessionSeries({ trainerId: userId }),
  };
}

// ---------------------------------------------------------------- milestones (client + user)
async function buildMilestones(userId) {
  const earned = await safe(
    () => UserAchievement.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit: 8, raw: true }),
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
      earnedLabel: e.createdAt ? fmtAge(e.createdAt) : null,
      crystallized: crystalSet.has(String(e.achievementId)),
    };
  });
}

async function progressSeries(userId) {
  const labels = [], values = [];
  for (let i = 6; i >= 0; i--) {
    const from = dayStart(i), to = dayStart(i - 1);
    labels.push(from.toLocaleDateString('en-US', { weekday: 'short' }));
    // eslint-disable-next-line no-await-in-loop
    const c = await safe(() => WorkoutSession.count({ where: { userId, date: { [Op.gte]: from, [Op.lt]: to } } }), 0);
    values.push(c);
  }
  return { labels, values, unit: 'workouts' };
}

// ---------------------------------------------------------------- CLIENT
async function buildClientSummary({ userId }) {
  const week0 = dayStart(7);
  const [scheduled, completed] = await Promise.all([
    safe(() => Session.count({ where: { userId, sessionDate: { [Op.gte]: week0 } } }), 0),
    safe(() => Session.count({ where: { userId, status: 'completed', sessionDate: { [Op.gte]: week0 } } }), 0),
  ]);
  const adherencePct = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

  const doneDays = await safe(
    () => WorkoutSession.findAll({ where: { userId, date: { [Op.gte]: dayStart(new Date().getDay()) } }, attributes: ['date'], raw: true }),
    [],
  );
  const doneSet = new Set(doneDays.map((d) => new Date(d.date).toDateString()));
  const todayStr = new Date().toDateString();
  const planWeek = Array.from({ length: 7 }, (_, i) => {
    const d = dayStart(new Date().getDay() - i);
    return { dayLabel: d.toLocaleDateString('en-US', { weekday: 'narrow' }), done: doneSet.has(d.toDateString()), today: d.toDateString() === todayStr };
  }).reverse();

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
    progress: await progressSeries(userId),
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
