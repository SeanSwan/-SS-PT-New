/**
 * ============================================================================
 * FILE: nutritionLogNudgeCron.mjs
 * PURPOSE: Gentle in-app nudge for established nutrition loggers who paused.
 * ADDED: 2026-08-04 (nutrition blueprint Phase 3, S3.3)
 * ============================================================================
 * Modeled exactly on staleClientNudgeCron.mjs: default-off env kill switch,
 * pure injectable tick, in-flight overlap guard, start/stop pair, never throws.
 *
 * WHO GETS NUDGED: an ACTIVE client with >=1 macro log in the last 30 days but
 * none in the last N days (NUTRITION_NUDGE_DAYS, default 3). Never-loggers are
 * never nudged — you cannot "get back to" a habit you never started.
 *
 * MULTI-INSTANCE IDEMPOTENCY (Kimi P0-5): the send gate is an atomic
 * INSERT ... ON CONFLICT DO NOTHING claim on nudge_dispatches
 * (userId, nudgeType, localDate) — only the instance that wins the row sends.
 * This is also the 1-per-user-local-day cap, which is why the tick runs HOURLY
 * (not daily like the workout template): a single daily server-time tick would
 * land inside quiet hours for whole timezones and skip them forever; hourly
 * ticks retry until a user's send window opens, and the ledger caps at one.
 *
 * ED-SAFE LAW (S3.4, launch blocker): copy pools carry NO guilt verbs, NO fake
 * urgency, NO streak-loss framing. A nudge is an invitation, never a debt.
 * Consent: notificationPreferences.nutritionReminders !== false (opt-out
 * semantics, mirroring hasWorkoutReminderConsent). Quiet hours: 21:00-08:00
 * user-local (User.timeZone via Intl). In-app only — no email, no SMS.
 */
import { Op, QueryTypes } from 'sequelize';
import { getUser, getModel } from '../models/index.mjs';
import { createNotification } from '../controllers/notificationController.mjs';
import { DEFAULT_CLIENT_TIME_ZONE, formatDateOnlyInTimeZone } from './clientTrainingDateService.mjs';
import logger from '../utils/logger.mjs';

const START_DELAY_MS = 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly — see header (quiet hours × ledger cap)
const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_WINDOW_DAYS = 30;

export const NUDGE_TYPE = 'nutrition_log';
export const NUDGE_LINK = '/dashboard/client/meal-planner';
export const QUIET_HOUR_START = 21; // user-local, inclusive
export const QUIET_HOUR_END = 8;    // user-local, exclusive

/** 4 rotating pools (S3.5) — celebration / gentle-restart / curiosity / recipe-tease. */
export const NUDGE_COPY_POOLS = [
  { pool: 'celebration', title: 'Your food log tells a good story', messages: [
    'Every meal you have logged adds to a clearer picture of your nutrition. Add today\'s whenever it suits you.',
    'Your logged meals are powering real insights. A quick entry today keeps the picture fresh.',
  ] },
  { pool: 'gentle-restart', title: 'Whenever you are ready', messages: [
    'Your meal log is one tap away whenever you are ready. Any entry counts, even a small snack.',
    'A new day is a fresh page. If it feels right, log one meal today and see where it takes you.',
  ] },
  { pool: 'curiosity', title: 'Curious how your week looks?', messages: [
    'Logging today unlocks a fuller view of your weekly trends. Take a peek after your next entry.',
    'Your charts get sharper with every logged day. See what today\'s meals add to the picture.',
  ] },
  { pool: 'recipe-tease', title: 'A little meal inspiration', messages: [
    'Looking for your next meal idea? Open the meal planner for inspiration and log what you enjoy.',
    'There are fresh ideas waiting in your meal planner. Browse an idea, then log today\'s plate.',
  ] },
];

/** Rotation state lives implicitly in the dispatch ledger: pick by prior-send count. */
export function pickNudgeCopy(priorDispatchCount) {
  const n = Number.isInteger(priorDispatchCount) && priorDispatchCount >= 0 ? priorDispatchCount : 0;
  const pool = NUDGE_COPY_POOLS[n % NUDGE_COPY_POOLS.length];
  const message = pool.messages[Math.floor(n / NUDGE_COPY_POOLS.length) % pool.messages.length];
  return { title: pool.title, message, pool: pool.pool };
}

export function isNutritionLogNudgeEnabled(env = process.env) {
  return env.ENABLE_NUTRITION_LOG_NUDGES === 'true';
}

export function nudgeDays(env = process.env) {
  const parsed = Number.parseInt(env.NUTRITION_NUDGE_DAYS ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 2 ? parsed : 3;
}

/** Hard opt-out: nutritionReminders === false anywhere in the prefs JSON. */
export function hasNutritionReminderConsent(user) {
  let prefs = user?.notificationPreferences;
  if (typeof prefs === 'string') {
    try { prefs = JSON.parse(prefs); } catch { prefs = null; }
  }
  return prefs?.nutritionReminders !== false;
}

/** User-local hour must fall inside [08:00, 21:00). Bad zones fall back to the default. */
export function isWithinSendWindow(now, timeZone) {
  const hourIn = (zone) => Number.parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' }).format(now),
    10,
  );
  let hour;
  try { hour = hourIn(timeZone || DEFAULT_CLIENT_TIME_ZONE); } catch { hour = hourIn(DEFAULT_CLIENT_TIME_ZONE); }
  return Number.isInteger(hour) && hour >= QUIET_HOUR_END && hour < QUIET_HOUR_START;
}

const isoDaysAgo = (now, days) => new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10);

/**
 * Atomic multi-instance claim — send ONLY if the insert won (Kimi P0-5).
 * `type: SELECT` makes sequelize hand back the RETURNING rows directly
 * (house pattern: stripeWebhook.mjs processed_stripe_sessions guard).
 */
export async function claimNudgeDispatch({ sequelize, userId, localDate }) {
  const rows = await sequelize.query(
    `INSERT INTO nudge_dispatches ("userId", "nudgeType", "localDate")
     VALUES ($1, $2, $3)
     ON CONFLICT ("userId", "nudgeType", "localDate") DO NOTHING
     RETURNING id`,
    { bind: [userId, NUDGE_TYPE, localDate], type: QueryTypes.SELECT },
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function countPriorDispatches({ sequelize, userId }) {
  const rows = await sequelize.query(
    'SELECT COUNT(*)::int AS count FROM nudge_dispatches WHERE "userId" = $1 AND "nudgeType" = $2',
    { bind: [userId, NUDGE_TYPE], type: QueryTypes.SELECT },
  );
  return Number(rows?.[0]?.count) || 0;
}

let tickInFlight = false;
let nudgeInterval = null;
let nudgeStartupTimeout = null;

/**
 * Pure-ish tick (deps injected for tests): finds lapsed established loggers,
 * applies consent + quiet hours + the atomic dispatch claim, sends the in-app
 * nudge. Never throws.
 */
export async function runNutritionLogNudgeTick({
  User = getUser(),
  DailyMacroLog = getModel('DailyMacroLog'),
  sequelize = null,
  notify = createNotification,
  env = process.env,
  now = new Date(),
} = {}) {
  if (tickInFlight) {
    logger.warn('[NutritionNudge] previous tick still running - skipping');
    return { nudged: 0, skipped: 'overlap' };
  }
  tickInFlight = true;
  try {
    const db = sequelize ?? User?.sequelize;
    const days = nudgeDays(env);
    const recentCutoff = isoDaysAgo(now, days);
    const activityCutoff = isoDaysAgo(now, ACTIVITY_WINDOW_DAYS);

    const clients = await User.findAll({
      where: { role: 'client', isActive: { [Op.not]: false } },
      attributes: ['id', 'notificationPreferences', 'timeZone'],
      raw: true,
    });

    let nudged = 0;
    for (const client of clients) {
      try {
        if (!hasNutritionReminderConsent(client)) continue;
        if (!isWithinSendWindow(now, client.timeZone)) continue;

        // Logged inside the nudge window → nothing to nudge about.
        const recentLog = await DailyMacroLog.findOne({
          where: { userId: client.id, date: { [Op.gte]: recentCutoff } },
          attributes: ['id'],
        });
        if (recentLog) continue;

        // Only nudge ESTABLISHED loggers: at least one log in the last 30 days.
        const priorActivity = await DailyMacroLog.findOne({
          where: { userId: client.id, date: { [Op.gte]: activityCutoff } },
          attributes: ['id'],
        });
        if (!priorActivity) continue;

        const timeZone = client.timeZone || DEFAULT_CLIENT_TIME_ZONE;
        let localDate;
        try { localDate = formatDateOnlyInTimeZone(now, timeZone); } catch { localDate = formatDateOnlyInTimeZone(now, DEFAULT_CLIENT_TIME_ZONE); }

        // Rotation count BEFORE the claim so today's row doesn't shift today's pool.
        const priorCount = await countPriorDispatches({ sequelize: db, userId: client.id });
        const won = await claimNudgeDispatch({ sequelize: db, userId: client.id, localDate });
        if (!won) continue; // another instance (or an earlier hourly tick) already sent today

        const copy = pickNudgeCopy(priorCount);
        await notify({
          userId: client.id,
          title: copy.title,
          message: copy.message,
          type: 'nutrition',
          link: NUDGE_LINK,
        });
        nudged += 1;
      } catch (clientErr) {
        logger.warn('[NutritionNudge] client sweep step failed', { clientId: client?.id, error: clientErr?.message });
      }
    }

    if (nudged > 0) logger.info(`[NutritionNudge] nudged ${nudged} lapsed logger(s) (threshold ${days}d)`);
    return { nudged, threshold: days };
  } catch (err) {
    logger.error(`[NutritionNudge] tick failed: ${err?.message}`);
    return { nudged: 0, error: err?.message };
  } finally {
    tickInFlight = false;
  }
}

const guardTick = (fn) => fn().catch((err) => logger.error(`[NutritionNudge] tick rejected: ${err?.message}`));

export function startNutritionLogNudgeScheduler() {
  if (!isNutritionLogNudgeEnabled()) {
    logger.info('[NutritionNudge] disabled (ENABLE_NUTRITION_LOG_NUDGES != "true")');
    return false;
  }
  if (nudgeInterval) return true;
  nudgeStartupTimeout = setTimeout(() => guardTick(() => runNutritionLogNudgeTick()), START_DELAY_MS);
  nudgeInterval = setInterval(() => guardTick(() => runNutritionLogNudgeTick()), CHECK_INTERVAL_MS);
  logger.info('[NutritionNudge] scheduler started (hourly tick, ledger-capped 1/day)');
  return true;
}

export function stopNutritionLogNudgeScheduler() {
  if (nudgeStartupTimeout) { clearTimeout(nudgeStartupTimeout); nudgeStartupTimeout = null; }
  if (nudgeInterval) { clearInterval(nudgeInterval); nudgeInterval = null; }
}
