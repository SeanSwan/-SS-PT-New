/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  nextBestActionResolverService.mjs — Post-Save Handoff · NEXT BEST ACTION      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  PURPOSE: Decide the single next-best-action shown after a workout save.        ║
 * ║  SOURCE : Kimi 4.2 blueprint §(g) A3 + §(d) resolver + Fable ruling §1.5.       ║
 * ║  DOCTRINE: Trainer-indispensability (CLAUDE.md) — a CLIENT may never be handed  ║
 * ║           a plan-decision. The server double-guards: it refuses to emit any     ║
 * ║           trainerOnly action for role 'client'. Clients get read + do.          ║
 * ║  ISOLATION: pure resolver + a read-only, defensive loader. Touches NO save      ║
 * ║             gate, NO deduction, NO write. Slice-1 safe (Fable R5).              ║
 * ║  LEXICON: "flexibility"/"stretching" only — never "yoga"/"meditation".          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';

export const NBA_KINDS = Object.freeze({
  ADJUST_PLAN: 'ADJUST_PLAN',
  DO_NEXT_WORKOUT: 'DO_NEXT_WORKOUT',
  RECOVERY_FLEXIBILITY: 'RECOVERY_FLEXIBILITY',
  VIEW_PROGRESS: 'VIEW_PROGRESS',
});

const TRAINER_ROLES = new Set(['trainer', 'admin']);
const ADHERENCE_FLOOR = 0.6; // < 60% 14-day adherence flags a plan adjustment

// Fail-CLOSED role check — anything not provably trainer/admin is treated as a non-trainer
// (guards against 'CLIENT'/casing/undefined role drift, a documented bug class in this repo).
const isTrainerRole = (role) => TRAINER_ROLES.has(String(role ?? '').toLowerCase());

/**
 * Pure resolver. `ctx` carries already-gathered signals so this is unit-testable with no DB:
 *   { viewerRole, viewerUserId, targetClientId,
 *     hasActivePlan, missedPrescribedTopSet, adherence14d (0..1|null),
 *     nextSessionWithin48h (bool), nextSessionDayName (string|null),
 *     sessionsThisWeek (int), planFrequency (int|null) }
 * Rules evaluate IN ORDER, first match wins (blueprint §d).
 */
export function resolveNextBestActionFromContext(ctx = {}) {
  const {
    viewerRole,
    targetClientId,
    hasActivePlan = false,
    missedPrescribedTopSet = false,
    adherence14d = null,
    nextSessionWithin48h = false,
    nextSessionDayName = null,
    sessionsThisWeek = 0,
    planFrequency = null,
  } = ctx;

  const isTrainerViewer = isTrainerRole(viewerRole);

  // Rule 1 — trainer/admin viewing a specific client whose plan needs a human decision.
  // Skipped when there is no active plan (can't honestly evaluate adherence/prescription).
  if (isTrainerViewer && targetClientId != null && hasActivePlan) {
    const belowAdherence = typeof adherence14d === 'number' && adherence14d < ADHERENCE_FLOOR;
    if (missedPrescribedTopSet || belowAdherence) {
      return enforceClientSafety(viewerRole, {
        kind: NBA_KINDS.ADJUST_PLAN,
        title: `Client #${targetClientId} needs a plan adjustment`,
        ctaLabel: 'Open planner',
        href: `/workout-planner?client=${targetClientId}`,
        trainerOnly: true,
      });
    }
  }

  // Rule 2 — the viewer has a session on the calendar within 48h.
  if (nextSessionWithin48h) {
    return enforceClientSafety(viewerRole, {
      kind: NBA_KINDS.DO_NEXT_WORKOUT,
      title: nextSessionDayName ? `Next up: ${nextSessionDayName}` : 'Next up: your next session',
      ctaLabel: 'View next workout',
      href: '/schedule',
      trainerOnly: false,
    });
  }

  // Rule 3 — hit or exceeded the plan's weekly frequency → earn a recovery/flexibility day.
  if (typeof planFrequency === 'number' && planFrequency > 0 && sessionsThisWeek >= planFrequency) {
    return enforceClientSafety(viewerRole, {
      kind: NBA_KINDS.RECOVERY_FLEXIBILITY,
      title: 'Recovery day tomorrow',
      body: '10-minute flexibility flow — your joints earned it.',
      ctaLabel: 'Open flexibility flow',
      href: '/stretching',
      trainerOnly: false,
    });
  }

  // Rule 4 — fallback: always give an arrow, never a dead end.
  return enforceClientSafety(viewerRole, {
    kind: NBA_KINDS.VIEW_PROGRESS,
    title: 'See your progress',
    ctaLabel: 'Open progress',
    href: '/user-dashboard?tab=progress',
    trainerOnly: false,
  });
}

// Trainer-indispensability invariant: a client can never receive a trainerOnly action.
// If logic ever tries to, we DROP to the safe fallback rather than leak a plan decision.
export function enforceClientSafety(viewerRole, action) {
  // Fail-CLOSED: a trainerOnly action is allowed only for a PROVABLY trainer/admin viewer.
  // Any other role (client, 'CLIENT', undefined, '', a new role) drops to the safe fallback.
  if (action.trainerOnly && !isTrainerRole(viewerRole)) {
    return {
      kind: NBA_KINDS.VIEW_PROGRESS,
      title: 'See your progress',
      ctaLabel: 'Open progress',
      href: '/user-dashboard?tab=progress',
      trainerOnly: false,
    };
  }
  return action;
}

/**
 * Read-only, defensive DB loader. Gathers what's cheap and safe in Slice 1; the harder
 * plan-adherence / prescribed-top-set signals are Slice-2 enrichment and default to false here
 * (fail-safe: absence of a signal never fabricates an ADJUST_PLAN). Never writes, never throws
 * out — any query failure degrades to the safe fallback.
 */
export async function resolveNextBestAction({
  viewerRole,
  viewerUserId,
  targetClientId,
  models,
  proofSeries = null,
} = {}) {
  const ctx = {
    viewerRole,
    viewerUserId,
    targetClientId,
    hasActivePlan: false,
    missedPrescribedTopSet: false,
    adherence14d: null,
    nextSessionWithin48h: false,
    nextSessionDayName: null,
    sessionsThisWeek: proofSeries?.sessionsThisWeek ?? 0,
    planFrequency: null,
  };

  try {
    const { Session } = models || {};
    // The handoff describes the SUBJECT of the save. Scope the next-session lookup to that subject's
    // calendar: for a trainer logging FOR a client, that's the CLIENT's calendar (targetClientId), not the
    // trainer's — else "Next up: <day>" would describe the wrong person's session next to the client's proof.
    const calendarUserId = targetClientId ?? viewerUserId;
    if (Session && calendarUserId != null) {
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 3600 * 1000);
      const next = await Session.findOne({
        where: {
          userId: calendarUserId,
          status: ['scheduled', 'confirmed'],
          sessionDate: { [Op.between]: [now, in48h] },
        },
        order: [['sessionDate', 'ASC']],
        attributes: ['sessionDate'],
      });
      if (next?.sessionDate) {
        ctx.nextSessionWithin48h = true;
        ctx.nextSessionDayName = new Date(next.sessionDate).toLocaleDateString('en-US', { weekday: 'long' });
      }
    }
  } catch (err) {
    // Read failure → leave nextSessionWithin48h false; resolver falls through safely.
    // Logged so a FUTURE schema drift here stays observable (a silent fallback would hide it).
    logger?.warn?.('[nba] session lookup failed; using safe fallback', err?.message);
  }

  return resolveNextBestActionFromContext(ctx);
}
