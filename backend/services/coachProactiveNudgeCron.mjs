/**
 * ============================================================================
 * FILE: coachProactiveNudgeCron.mjs
 * PURPOSE: G10/S10 proactive-nudge WIRING — the slice plan 44 named when it
 *          put "cron registration/wiring into the running worker" out of its
 *          own scope. Mounts the already-reviewed pure engine
 *          (`services/ai/coachProactiveNudge.mjs`) inside the deployed
 *          worker pattern of `nutritionLogNudgeCron.mjs` / `staleClientNudgeCron.mjs`.
 * ADDED: 2026-09-13
 * ============================================================================
 * Modeled on nutritionLogNudgeCron.mjs: default-off env kill switch, pure
 * injectable tick, in-flight overlap guard, start/stop pair, never throws.
 *
 * CONSENT IS EXPLICIT OPT-IN (plan 44): `notificationPreferences.coachProactiveNudges
 * === true` is the ONLY thing that opts a client in — absent, false, "true" or 1
 * all leave the client OUT. The env flag ENABLE_COACH_PROACTIVE_NUDGES is the
 * master disable and is passed to the engine, so a disabled process delivers
 * nothing even if the tick is called directly.
 *
 * DST: the engine never guesses an offset. This caller computes the UTC offset
 * in effect AT the candidate instant from the client's IANA zone and hands it
 * over; quiet hours 20:00-08:00 are then evaluated in real client-local time.
 *
 * DURABLE CAPS (restart behaviour, packet 70's G10 queue row): the one-per-local-day
 * cap and the 7-clear-day per-category dedupe are read from the durable
 * `nudge_dispatches` ledger, and the send gate is the same atomic
 * INSERT ... ON CONFLICT (userId, nudgeType, localDate) DO NOTHING claim the
 * deployed nutrition worker uses. Nothing here lives in an in-memory timer or
 * counter, so a restart cannot reset a cap.
 *
 * T38: consent, target access and evidence freshness are re-read AT the
 * delivery instant and passed to deliverNudge as the recheck; the writer (and
 * therefore the ledger claim and the card) is invoked only when it passes. A
 * client who opts out between plan time and delivery time receives NOTHING.
 *
 * ED-SAFE COPY LAW: an invitation, never a debt — no guilt verbs, no fake
 * urgency, no streak-loss framing. In-app only: no email, no SMS, no push.
 */
import { Op, QueryTypes } from 'sequelize';
import { getUser, getWorkoutSession } from '../models/index.mjs';
import { createNotification } from '../controllers/notificationController.mjs';
import { DEFAULT_CLIENT_TIME_ZONE, formatDateOnlyInTimeZone } from './clientTrainingDateService.mjs';
import { DELIVERY_DECISIONS, deliverNudge, planNudgeDelivery } from './ai/coachProactiveNudge.mjs';
import logger from '../utils/logger.mjs';

const START_DELAY_MS = 60 * 1000;
// Hourly, not daily (same reasoning as the nutrition precedent): a single
// daily server-time tick would land inside quiet hours for whole timezones and
// skip them forever. Hourly ticks retry until a client's window opens; the
// durable ledger caps the result at one per local day.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const COACH_NUDGE_PREFIX = 'coach_proactive:';
export const NUDGE_CATEGORY = 'weekly_briefing';
export const COACH_NUDGE_LINK = '/dashboard/client/progress';
export const NOTIFICATION_TYPE = 'coach_proactive';
export const EVIDENCE_WINDOW_DAYS = 7;
export const NUDGE_TITLE = 'Your week in review';
export const NUDGE_MESSAGE = 'Your recent sessions are ready to look back on. Open Progress whenever it suits you.';

/** Ledger key for a category. Kept under 40 chars (nudge_dispatches.nudgeType). */
export const coachNudgeType = (category) => COACH_NUDGE_PREFIX + String(category);

/** Master disable. OFF unless the process was explicitly switched on. */
export function isCoachProactiveNudgeEnabled(env = process.env) {
  return env.ENABLE_COACH_PROACTIVE_NUDGES === 'true';
}

const parsePreferences = (user) => {
  let prefs = user?.notificationPreferences;
  if (typeof prefs === 'string') {
    try { prefs = JSON.parse(prefs); } catch { prefs = null; }
  }
  return prefs && typeof prefs === 'object' ? prefs : null;
};

/** Explicit opt-in: only a real boolean `true` counts. Default OFF. */
export function hasCoachProactiveNudgeConsent(user) {
  return parsePreferences(user)?.coachProactiveNudges === true;
}

/**
 * Snooze is durable user state. A malformed timestamp is passed through
 * unchanged so the engine's fail-closed INVALID branch rejects it rather than
 * this caller silently dropping the snooze and delivering.
 */
export function coachNudgeSnoozeUntil(user) {
  const value = parsePreferences(user)?.coachNudgeSnoozedUntil;
  if (value instanceof Date) return value;
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

const resolveZone = (timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: timeZone || DEFAULT_CLIENT_TIME_ZONE })
      .resolvedOptions().timeZone;
  } catch {
    return DEFAULT_CLIENT_TIME_ZONE;
  }
};

/** UTC offset (minutes) in effect AT `instant` for an IANA zone — DST resolved here. */
export function timeZoneOffsetMinutesAt(instant, timeZone) {
  const date = instant instanceof Date ? instant : new Date(instant);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolveZone(timeZone),
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const at = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Math.round((Date.UTC(
    Number(at.year), Number(at.month) - 1, Number(at.day),
    Number(at.hour), Number(at.minute), Number(at.second),
  ) - date.getTime()) / 60000);
}

const localDateFor = (now, timeZone) => {
  try { return formatDateOnlyInTimeZone(now, timeZone); } catch { return formatDateOnlyInTimeZone(now, DEFAULT_CLIENT_TIME_ZONE); }
};

/**
 * Durable caps/dedupe source: the last dispatch instant per coach category.
 * A malformed stored timestamp is passed through as an Invalid Date so the
 * engine fails closed instead of treating the history as empty.
 */
export async function readCoachNudgeHistory({ sequelize, userId }) {
  const rows = await sequelize.query(
    `SELECT "nudgeType", MAX("createdAt") AS "lastAt"
       FROM nudge_dispatches
      WHERE "userId" = $1 AND "nudgeType" LIKE $2
      GROUP BY "nudgeType"`,
    { bind: [userId, `${COACH_NUDGE_PREFIX}%`], type: QueryTypes.SELECT },
  );
  const lastCategoryAt = {};
  let lastDeliveredAt = null;
  for (const row of rows ?? []) {
    const at = row.lastAt instanceof Date ? row.lastAt : new Date(row.lastAt);
    lastCategoryAt[String(row.nudgeType).slice(COACH_NUDGE_PREFIX.length)] = at;
    if (!(at <= lastDeliveredAt)) lastDeliveredAt = at; // NaN-aware: corruption propagates
  }
  return { lastDeliveredAt, lastCategoryAt };
}

/** Atomic per-category claim — the multi-instance send gate (see file header). */
export async function claimCoachNudgeDispatch({ sequelize, userId, localDate, category = NUDGE_CATEGORY }) {
  const rows = await sequelize.query(
    `INSERT INTO nudge_dispatches ("userId", "nudgeType", "localDate")
     VALUES ($1, $2, $3)
     ON CONFLICT ("userId", "nudgeType", "localDate") DO NOTHING
     RETURNING id`,
    { bind: [userId, coachNudgeType(category), localDate], type: QueryTypes.SELECT },
  );
  return Array.isArray(rows) && rows.length > 0;
}

/** Evidence = the client actually trained inside the freshness window. */
const readFreshEvidence = (WorkoutSession, userId, now) => WorkoutSession.findOne({
  where: {
    userId,
    status: 'completed',
    completedAt: { [Op.gte]: new Date(now.getTime() - EVIDENCE_WINDOW_DAYS * DAY_MS) },
  },
  attributes: ['id'],
});

const hasDeliveryAccess = (user) => Boolean(user) && user.isActive !== false && user.role === 'client';

const nudgeEnvelope = (userId) => ({
  userId,
  title: NUDGE_TITLE,
  message: NUDGE_MESSAGE,
  type: NOTIFICATION_TYPE,
  link: COACH_NUDGE_LINK,
});

let tickInFlight = false;
let nudgeInterval = null;
let nudgeStartupTimeout = null;

/**
 * Pure-ish tick (deps injected for tests): plans consent-gated delivery with
 * the engine, rechecks at the delivery instant, claims the durable ledger row,
 * then writes the in-app card. Never throws.
 */
export async function runCoachProactiveNudgeTick({
  User = getUser(),
  WorkoutSession = getWorkoutSession(),
  sequelize = null,
  notify = createNotification,
  env = process.env,
  now = new Date(),
} = {}) {
  if (tickInFlight) {
    logger.warn('[CoachProactiveNudge] previous tick still running - skipping');
    return { nudged: 0, skipped: 'overlap' };
  }
  tickInFlight = true;
  try {
    const db = sequelize ?? User?.sequelize;
    const enabled = isCoachProactiveNudgeEnabled(env);

    const clients = await User.findAll({
      where: { role: 'client', isActive: { [Op.not]: false } },
      attributes: ['id', 'notificationPreferences', 'timeZone'],
      raw: true,
    });

    let nudged = 0;
    for (const client of clients) {
      try {
        if (!hasCoachProactiveNudgeConsent(client)) continue;
        if (!(await readFreshEvidence(WorkoutSession, client.id, now))) continue;

        const timeZone = client.timeZone || DEFAULT_CLIENT_TIME_ZONE;
        const history = await readCoachNudgeHistory({ sequelize: db, userId: client.id });
        const plan = planNudgeDelivery({
          now,
          timezoneOffsetMinutes: timeZoneOffsetMinutesAt(now, timeZone),
          enabled,
          consented: hasCoachProactiveNudgeConsent(client),
          snoozedUntil: coachNudgeSnoozeUntil(client),
          lastDeliveredAt: history.lastDeliveredAt,
          lastCategoryAt: history.lastCategoryAt,
          category: NUDGE_CATEGORY,
        });
        if (plan.decision !== DELIVERY_DECISIONS.DUE) continue;

        // T38 delivery-time recheck: consent, access and evidence are re-read
        // here, at the delivery instant, not trusted from the planning read.
        const atDelivery = await User.findByPk(client.id, {
          attributes: ['id', 'role', 'isActive', 'notificationPreferences'],
          raw: true,
        });
        const recheck = {
          consented: hasCoachProactiveNudgeConsent(atDelivery),
          accessValid: hasDeliveryAccess(atDelivery),
          evidenceFresh: Boolean(await readFreshEvidence(WorkoutSession, client.id, now)),
        };

        const localDate = localDateFor(now, timeZone);
        let claimWon = false;
        const outcome = await deliverNudge({
          plan,
          nudge: nudgeEnvelope(client.id),
          recheck,
          // Invoked only after the recheck passes; the claim gates the write so
          // two instances can never both deliver the same category-day.
          writer: async (payload) => {
            claimWon = await claimCoachNudgeDispatch({ sequelize: db, userId: client.id, localDate });
            return claimWon ? notify(payload) : null;
          },
        });
        if (outcome.delivered && claimWon) nudged += 1;
      } catch (clientErr) {
        logger.warn('[CoachProactiveNudge] client sweep step failed', { clientId: client?.id, error: clientErr?.message });
      }
    }

    if (nudged > 0) logger.info(`[CoachProactiveNudge] delivered ${nudged} opt-in nudge(s)`);
    return { nudged, enabled };
  } catch (err) {
    logger.error(`[CoachProactiveNudge] tick failed: ${err?.message}`);
    return { nudged: 0, error: err?.message };
  } finally {
    tickInFlight = false;
  }
}

const guardTick = (fn) => fn().catch((err) => logger.error(`[CoachProactiveNudge] tick rejected: ${err?.message}`));

export function startCoachProactiveNudgeScheduler() {
  if (!isCoachProactiveNudgeEnabled()) {
    logger.info('[CoachProactiveNudge] disabled (ENABLE_COACH_PROACTIVE_NUDGES != "true")');
    return false;
  }
  if (nudgeInterval) return true;
  nudgeStartupTimeout = setTimeout(() => guardTick(() => runCoachProactiveNudgeTick()), START_DELAY_MS);
  nudgeInterval = setInterval(() => guardTick(() => runCoachProactiveNudgeTick()), CHECK_INTERVAL_MS);
  logger.info('[CoachProactiveNudge] scheduler started (hourly tick, ledger-capped 1/local day)');
  return true;
}

export function stopCoachProactiveNudgeScheduler() {
  if (nudgeStartupTimeout) { clearTimeout(nudgeStartupTimeout); nudgeStartupTimeout = null; }
  if (nudgeInterval) { clearInterval(nudgeInterval); nudgeInterval = null; }
}
