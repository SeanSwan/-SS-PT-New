/**
 * Day Brief Dispatcher — "how's my day look" (Slice A2)
 * ======================================================
 * Trainer: own sessions today, with de-identified per-client attention flags.
 * Admin: all of today's sessions across trainers.
 * Read-only; rides the F1 audit/kill-switch/rate-limit rails.
 */
import { buildTrainerDayContext } from '../contextEngine/coachContextEngine.mjs';

function formatTime(iso) {
  if (!iso) return '??:??';
  try {
    // Render runs UTC — display in the studio's timezone (env-overridable
    // ahead of full i18n/multi-timezone support).
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: process.env.SWAN_DISPLAY_TZ || 'America/Los_Angeles',
    }).toLowerCase().replace(' ', '');
  } catch {
    return new Date(iso).toISOString().slice(11, 16);
  }
}

function formatDayBrief(day) {
  if (day.sessionCount === 0) {
    return '**Today\'s Day Sheet**\nNo sessions on the books today. Good day for outreach — check stale clients with "brief me on" a client.';
  }

  const lines = [`**Today's Day Sheet** — ${day.sessionCount} session${day.sessionCount === 1 ? '' : 's'}`];
  for (const s of day.sessions) {
    const flagText = s.flags.length ? `  ⚠ ${s.flags.join(', ')}` : '';
    lines.push(`• ${formatTime(s.time)} — ${s.clientAlias || 'unassigned'} (${s.status}${s.durationMinutes ? `, ${s.durationMinutes}min` : ''})${flagText}`);
  }

  const flagged = day.sessions.filter((s) => s.flags.length > 0).length;
  lines.push(flagged ? `${flagged} client${flagged === 1 ? '' : 's'} need${flagged === 1 ? 's' : ''} attention before their session.` : 'All clients clear — no flags.');
  return lines.join('\n');
}

/**
 * Dispatcher for `brief_my_day`. Read-only.
 * @param {Object} params - validated (empty schema)
 * @param {Object} ctx - CommandContext (user, options.sequelize)
 */
export async function dispatchBriefMyDay(params, ctx) {
  const result = await buildTrainerDayContext({
    user: ctx?.user,
    sequelize: ctx?.options?.sequelize,
  });

  if (!result.ok) {
    return { type: 'day_brief_unavailable', message: result.message };
  }

  return {
    type: 'day_brief',
    message: formatDayBrief(result.day),
    day: result.day,
  };
}
