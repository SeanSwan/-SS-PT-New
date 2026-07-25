/**
 * Brief Client Dispatcher — first consumer of the Coach Context Engine
 * =====================================================================
 * "Brief me on client X" → cross-domain, de-identified, next-best-action
 * oriented client brief for admin/trainer.
 *
 * Authorization is enforced INSIDE buildCoachContext (fail-closed gate) —
 * defense-in-depth on top of the pipeline's RBAC + client resolution.
 *
 * Slice A1 — Coach Context Engine (2026-06-10)
 */
import { buildCoachContext } from '../contextEngine/coachContextEngine.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const STALE_DAYS = 7;

function daysSince(isoDate) {
  if (!isoDate) return null;
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

/** Build attention flags — the next-best-action heart of the brief. */
function buildFlags(context) {
  const flags = [];

  const staleness = daysSince(context.lastWorkoutDate);
  if (context.lastWorkoutDate === null) {
    flags.push('no workouts logged yet');
  } else if (staleness !== null && staleness > STALE_DAYS) {
    flags.push(`no workout logged in ${staleness} days`);
  }

  const activePain = (context.painEntries || []).filter((p) => p.isActive !== false);
  if (activePain.length > 0) {
    const worst = activePain.find((p) => p.level === 'high') || activePain[0];
    flags.push(`active pain: ${worst.bodyPart} (${worst.level})`);
  }

  if (context.sessionCredits !== null && context.sessionCredits <= 2) {
    flags.push(`session credits low (${context.sessionCredits} left)`);
  }

  if (context.schedule?.upcomingCount === 0) {
    flags.push('no upcoming sessions booked');
  }

  return flags;
}

function formatBadgeSummary(context) {
  const badges = context.gamification?.badges;
  const displayedCount = Number(badges?.displayedCount || 0);
  if (!Number.isFinite(displayedCount) || displayedCount <= 0) return null;
  const recentNames = Array.isArray(badges.recent)
    ? badges.recent.map((badge) => String(badge?.name || '').trim()).filter(Boolean).slice(0, 3)
    : [];
  return recentNames.length > 0
    ? `Badges: ${displayedCount} displayed; recent: ${recentNames.join(', ')}`
    : `Badges: ${displayedCount} displayed`;
}

function formatBrief(context, dataQuality) {
  const lines = [];
  lines.push(`**${context.clientAlias} — Client Brief**`);

  const facts = [];
  if (context.nasmPhase) facts.push(`NASM phase ${context.nasmPhase}`);
  if (context.gamification?.level && context.gamification?.rankTitle) {
    facts.push(`Lv ${context.gamification.level} ${context.gamification.rankTitle}`);
  }
  if (context.sessionCredits !== null) facts.push(`${context.sessionCredits} session credits`);
  facts.push(
    context.lastWorkoutDate
      ? `last workout ${context.lastWorkoutDate}`
      : 'no workouts logged',
  );
  if (context.schedule?.nextSessionDate) {
    facts.push(`next session ${context.schedule.nextSessionDate.slice(0, 10)}`);
  }
  lines.push(facts.join(' · '));

  if (Array.isArray(context.recentExercises) && context.recentExercises.length > 0) {
    lines.push(`Recent training: ${context.recentExercises.slice(0, 6).join(', ')}`);
  }

  if (Array.isArray(context.goals) && context.goals.length > 0) {
    const goalTitles = context.goals.map((g) => g.title).filter(Boolean).slice(0, 3);
    if (goalTitles.length) lines.push(`Active goals: ${goalTitles.join('; ')}`);
  }

  const badgeSummary = formatBadgeSummary(context);
  if (badgeSummary) lines.push(badgeSummary);

  const flags = buildFlags(context);
  lines.push(flags.length ? `⚠ Needs attention: ${flags.join(' · ')}` : '✓ Nothing urgent flagged.');

  const degraded = (dataQuality || []).filter((d) => d.status === 'degraded').map((d) => d.domain);
  if (degraded.length) {
    lines.push(`(Note: ${degraded.join(', ')} data unavailable right now.)`);
  }

  return lines.join('\n');
}

/**
 * Dispatcher for `brief_client`. Read-only.
 * @param {Object} params - validated { clientId }
 * @param {Object} ctx - CommandContext (user, resolvedClient, options.sequelize)
 */
export async function dispatchBriefClient(params, ctx) {
  const targetClientId = resolveCommandClientId(params, ctx);

  const result = await buildCoachContext({
    user: ctx?.user,
    targetClientId,
    sequelize: ctx?.options?.sequelize,
  });

  if (!result.ok) {
    return {
      type: 'client_brief_denied',
      deniedReason: result.deniedReason,
      message: result.message,
    };
  }

  return {
    type: 'client_brief',
    message: formatBrief(result.context, result.dataQuality),
    brief: {
      clientAlias: result.context.clientAlias,
      sessionCredits: result.context.sessionCredits,
      lastWorkoutDate: result.context.lastWorkoutDate,
      schedule: result.context.schedule,
      flags: buildFlags(result.context),
      gamification: result.context.gamification ?? null,
      dataQuality: result.dataQuality,
    },
  };
}
