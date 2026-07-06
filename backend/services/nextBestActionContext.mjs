/**
 * nextBestActionContext.mjs
 * =========================
 * Context fetchers for the Next-Best-Action engine (Phase 1.5a, Fable Vision
 * arc). Gathers the coach-guided inputs the pure decision core consumes:
 * plan cursor (today's assignment), active pain summary, next scheduled
 * session, credit balance, trainer assignment, and recent trained days.
 *
 * Every fetch is a single indexed lookup and every failure degrades to null —
 * the engine must keep answering from the pulse alone if any context source
 * is unavailable (best-effort context, never a 500).
 */
import { Op } from 'sequelize';
import {
  getClientPainEntry,
  getClientTrainerAssignment,
  getSession,
  getUser,
  getWorkoutPlan,
} from '../models/index.mjs';
import { toCurrentWorkoutPlanResponse } from './workoutPlanShapeService.mjs';
import { buildClientTrainingOverview } from './clientTrainingReadModelService.mjs';

export const RECENT_TRAINED_DAYS_SQL = `SELECT DISTINCT ws.date::date::text AS day
  FROM workout_sessions ws
  WHERE ws."userId" = :userId AND ws.status = 'completed'
    AND ws.date >= NOW() - INTERVAL '7 days'
  ORDER BY day DESC`;

const quiet = async (label, fn) => {
  try {
    return await fn();
  } catch (error) {
    console.error(`[NextBestAction Context — ${label}]`, { message: error?.message });
    return null;
  }
};

const fetchPlanNext = (userId) => quiet('plan', async () => {
  const WorkoutPlan = getWorkoutPlan();
  if (!WorkoutPlan?.findOne) return null;
  const plan = await WorkoutPlan.findOne({
    where: { userId, status: 'active' },
    order: [['updatedAt', 'DESC']],
  });
  if (!plan) return null;
  const formatted = toCurrentWorkoutPlanResponse(plan);
  const overview = buildClientTrainingOverview({
    activePlan: plan,
    currentSession: formatted?.currentSession || null,
    today: new Date().toISOString().slice(0, 10),
  });
  return overview?.todayAssignment ?? null;
});

const fetchPain = (userId) => quiet('pain', async () => {
  const ClientPainEntry = getClientPainEntry();
  if (!ClientPainEntry?.findAll) return null;
  const entries = await ClientPainEntry.findAll({
    where: { userId, isActive: true },
    attributes: ['bodyRegion', 'painLevel'],
  });
  if (!entries || entries.length === 0) return { activeCount: 0, maxLevel: null, regions: [] };
  return {
    activeCount: entries.length,
    maxLevel: Math.max(...entries.map((e) => Number(e.painLevel) || 0)),
    regions: [...new Set(entries.map((e) => e.bodyRegion).filter(Boolean))].slice(0, 4),
  };
});

const fetchNextSession = (userId, now) => quiet('nextSession', async () => {
  const Session = getSession();
  if (!Session?.findOne) return null;
  const upcoming = await Session.findOne({
    where: {
      userId,
      status: { [Op.in]: ['scheduled', 'confirmed'] },
      sessionDate: { [Op.gt]: now },
    },
    order: [['sessionDate', 'ASC']],
    attributes: ['id', 'sessionDate'],
  });
  if (!upcoming?.sessionDate) return null;
  const daysUntil = Math.ceil((new Date(upcoming.sessionDate) - now) / (24 * 60 * 60 * 1000));
  return { date: upcoming.sessionDate, daysUntil };
});

const fetchCredits = (userId) => quiet('credits', async () => {
  const User = getUser();
  if (!User?.findByPk) return null;
  const user = await User.findByPk(userId, { attributes: ['availableSessions'] });
  if (!user) return null;
  return { availableSessions: Number(user.availableSessions ?? 0) };
});

const fetchHasTrainer = (userId) => quiet('trainer', async () => {
  const ClientTrainerAssignment = getClientTrainerAssignment();
  if (!ClientTrainerAssignment?.count) return false;
  const count = await ClientTrainerAssignment.count({
    where: { clientId: userId, status: 'active' },
  });
  return count > 0;
});

const fetchRecentDays = (sequelize, userId) => quiet('recentDays', async () => {
  const [rows] = await sequelize.query(RECENT_TRAINED_DAYS_SQL, { replacements: { userId } });
  return (rows || []).map((r) => r.day).filter(Boolean);
});

/**
 * Gather all NBA context inputs in parallel. Every field is null-safe;
 * the engine treats missing context as "no signal", never as an error.
 */
export async function getNextBestActionContext(sequelize, userId, { now = new Date() } = {}) {
  const [plan, pain, nextSession, credits, hasTrainer, recentDays] = await Promise.all([
    fetchPlanNext(userId),
    fetchPain(userId),
    fetchNextSession(userId, now),
    fetchCredits(userId),
    fetchHasTrainer(userId),
    fetchRecentDays(sequelize, userId),
  ]);
  return { plan, pain, nextSession, credits, hasTrainer: Boolean(hasTrainer), recentDays: recentDays || [] };
}

export default getNextBestActionContext;
