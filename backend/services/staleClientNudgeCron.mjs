/**
 * Stale-Client Nudge Cron (Workout-OS C6b)
 * ========================================
 * Daily sweep: clients with no COMPLETED workout session in N days get ONE
 * gentle in-app nudge (generic envelope — never pain/body detail). Modeled
 * exactly on automationCron.mjs: default-off env kill switch, pure testable
 * tick, in-flight overlap guard, start/stop pair, lazy startup registration.
 * Consent: honors User.notificationPreferences.workoutReminders === false as
 * a hard opt-out. Cadence: a client is never re-nudged inside the cooldown
 * (one reminder per staleness window), enforced by looking back at the last
 * nudge Notification this cron created.
 */
import { Op } from 'sequelize';
import { getUser, getWorkoutSession, getNotification } from '../models/index.mjs';
import { createNotification } from '../controllers/notificationController.mjs';
import logger from '../utils/logger.mjs';

const START_DELAY_MS = 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const NUDGE_TITLE = 'Your training is waiting';
export const NUDGE_MESSAGE = 'It has been a few days since your last logged session. A short workout today keeps your momentum — open the logger whenever you are ready.';

export function isStaleClientNudgeEnabled(env = process.env) {
  return env.ENABLE_STALE_CLIENT_NUDGES === 'true';
}

export function staleDays(env = process.env) {
  const parsed = Number.parseInt(env.STALE_CLIENT_NUDGE_DAYS ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 2 ? parsed : 4;
}

/** Hard opt-out: workoutReminders === false anywhere in the prefs JSON. */
export function hasWorkoutReminderConsent(user) {
  let prefs = user?.notificationPreferences;
  if (typeof prefs === 'string') {
    try { prefs = JSON.parse(prefs); } catch { prefs = null; }
  }
  return prefs?.workoutReminders !== false;
}

let tickInFlight = false;
let nudgeInterval = null;
let nudgeStartupTimeout = null;

/**
 * Pure-ish tick (models injected for tests): finds stale clients, applies
 * consent + cooldown, sends the generic in-app envelope. Never throws.
 */
export async function runStaleClientNudgeTick({
  User = getUser(),
  WorkoutSession = getWorkoutSession(),
  Notification = getNotification(),
  notify = createNotification,
  env = process.env,
  now = new Date(),
} = {}) {
  if (tickInFlight) {
    logger.warn('[StaleClientNudge] previous tick still running - skipping');
    return { nudged: 0, skipped: 'overlap' };
  }
  tickInFlight = true;
  try {
    const days = staleDays(env);
    const cutoff = new Date(now.getTime() - days * DAY_MS);

    const clients = await User.findAll({
      // createdAt < cutoff: a brand-new client who has never logged must not
      // be told "it's been a few days since your last session" (R4 fix).
      where: { role: 'client', isActive: { [Op.not]: false }, createdAt: { [Op.lt]: cutoff } },
      attributes: ['id', 'notificationPreferences'],
      raw: true,
    });

    let nudged = 0;
    for (const client of clients) {
      try {
        if (!hasWorkoutReminderConsent(client)) continue;

        const recentSession = await WorkoutSession.findOne({
          where: { userId: client.id, status: 'completed', completedAt: { [Op.gte]: cutoff } },
          attributes: ['id'],
        });
        if (recentSession) continue;

        // Cooldown: one nudge per staleness window — look back for OUR envelope.
        const recentNudge = await Notification.findOne({
          where: { userId: client.id, type: 'reminder', title: NUDGE_TITLE, createdAt: { [Op.gte]: cutoff } },
          attributes: ['id'],
        });
        if (recentNudge) continue;

        await notify({
          userId: client.id,
          title: NUDGE_TITLE,
          message: NUDGE_MESSAGE,
          type: 'reminder',
        });
        nudged += 1;
      } catch (clientErr) {
        logger.warn('[StaleClientNudge] client sweep step failed', { clientId: client?.id, error: clientErr?.message });
      }
    }

    if (nudged > 0) logger.info(`[StaleClientNudge] nudged ${nudged} stale client(s) (threshold ${days}d)`);
    return { nudged, threshold: days };
  } catch (err) {
    logger.error(`[StaleClientNudge] tick failed: ${err?.message}`);
    return { nudged: 0, error: err?.message };
  } finally {
    tickInFlight = false;
  }
}

const guardTick = (fn) => fn().catch((err) => logger.error(`[StaleClientNudge] tick rejected: ${err?.message}`));

export function startStaleClientNudgeScheduler() {
  if (!isStaleClientNudgeEnabled()) {
    logger.info('[StaleClientNudge] disabled (ENABLE_STALE_CLIENT_NUDGES != "true")');
    return false;
  }
  if (nudgeInterval) return true;
  nudgeStartupTimeout = setTimeout(() => guardTick(() => runStaleClientNudgeTick()), START_DELAY_MS);
  nudgeInterval = setInterval(() => guardTick(() => runStaleClientNudgeTick()), CHECK_INTERVAL_MS);
  logger.info('[StaleClientNudge] scheduler started (daily tick)');
  return true;
}

export function stopStaleClientNudgeScheduler() {
  if (nudgeStartupTimeout) { clearTimeout(nudgeStartupTimeout); nudgeStartupTimeout = null; }
  if (nudgeInterval) { clearInterval(nudgeInterval); nudgeInterval = null; }
}
