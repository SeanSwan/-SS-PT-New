/**
 * Is anyone actually going to render this?
 * ============================================================================
 *
 * WHY THIS EXISTS. `/api/content-studio/render-job` used to validate a template, write
 * to an unrelated log table, and return `success: true, status: 'waiting'`. Nothing
 * rendered. The operator was told work had started and waited forever.
 *
 * Replacing that with a REAL insert into `video_render_jobs` fixes the write but not the
 * lie — because today no worker exists to lease those rows. "Queued" implies motion. A
 * job queued into a system with no worker is the same false promise wearing a better
 * schema, and it is HARDER to detect because the row genuinely exists.
 *
 * So enqueue and expectation ship together: the caller is told, at submit time, whether
 * a worker is actually connected. The job is still created either way — losing the
 * request would be worse — but the response never implies progress that cannot happen.
 *
 * The same rule the marketing publisher learned on 2026-08-12 ("publish reported success
 * when every platform failed"): a success response must describe what the system will
 * really do, not what the endpoint intends.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * A worker is "live" if it checked in this recently. Leases are extended by heartbeat,
 * so an agent that has not spoken in three minutes is not about to pick anything up.
 * Deliberately longer than the heartbeat interval so one missed beat is not an outage.
 */
export const WORKER_STALE_AFTER_SECONDS = 180;

/**
 * @returns {Promise<{live: number, total: number, newestSeenAt: Date|null,
 *                    capabilities: string[]}>}
 */
export async function workerPresence({ requiredCapabilities = [] } = {}) {
  // Raw SQL rather than the model: this must not depend on a Sequelize model existing
  // for a table the agent subsystem owns, and it is a single aggregate read.
  //
  // COUNTS AND CAPABILITIES ARE AGGREGATED SEPARATELY, DELIBERATELY. The first version
  // did `COUNT(*) ... FROM render_agents LEFT JOIN LATERAL jsonb_array_elements_text(
  // capabilities)`, which counts JOINED ROWS, not agents — an agent with three
  // capabilities was counted three times. Verified against synthetic rows: 3 agents / 2
  // live reported as total 5 / live 4.
  //
  // It read correctly against production only because zero agents are enrolled, so the
  // bug was invisible until the first worker connects — the moment the number starts
  // being used for anything. An inflated `live` makes `startable` true when no capable
  // worker exists, which defeats the entire purpose of this module.
  const rows = await sequelize.query(
    `WITH live_agents AS (
       SELECT id, capabilities
       FROM render_agents
       WHERE revoked_at IS NULL
         AND last_seen_at IS NOT NULL
         AND last_seen_at > now() - (:staleSeconds * INTERVAL '1 second')
     )
     SELECT
       (SELECT COUNT(*) FROM render_agents)                                   AS total,
       (SELECT COUNT(*) FROM live_agents)                                     AS live,
       (SELECT MAX(last_seen_at) FROM render_agents WHERE revoked_at IS NULL) AS newest_seen_at,
       COALESCE((
         SELECT jsonb_agg(DISTINCT c)
         FROM live_agents, jsonb_array_elements_text(live_agents.capabilities) AS c
       ), '[]'::jsonb)                                                        AS capabilities`,
    { replacements: { staleSeconds: WORKER_STALE_AFTER_SECONDS }, type: QueryTypes.SELECT },
  );

  const row = rows?.[0] ?? {};
  const caps = Array.isArray(row.capabilities) ? row.capabilities.filter(Boolean) : [];
  const live = Number(row.live ?? 0);

  // A capability the fleet cannot satisfy is its own kind of forever-queued. Report it
  // separately from "nobody is home" because the operator fix is different: enrol a
  // worker vs enrol a worker that can do THIS.
  const missing = requiredCapabilities.filter((c) => !caps.includes(c));

  return {
    live,
    total: Number(row.total ?? 0),
    newestSeenAt: row.newest_seen_at ? new Date(row.newest_seen_at) : null,
    capabilities: caps,
    missingCapabilities: missing,
  };
}

/**
 * Turn presence into something a UI can say out loud without lying.
 * `startable` is the honest answer to "will this move?".
 */
export function describePresence(presence) {
  // FAIL CLOSED on anything that is not a positive count.
  //
  // The first version tested `presence.live === 0`, which is FALSE for `undefined` — so
  // a malformed or partial presence object fell through and returned
  // `startable: true, WORKER_ONLINE`. That is fail-OPEN inside the one function whose
  // entire job is to refuse to promise motion, and it would have claimed progress in
  // precisely the degraded conditions (query error, shape drift) where the claim is
  // least likely to be true. Caught by its own unit test.
  const live = Number(presence?.live);
  const total = Number(presence?.total);
  if (!Number.isFinite(live) || live <= 0) {
    const enrolled = Number.isFinite(total) && total > 0;
    return {
      startable: false,
      code: enrolled ? 'NO_WORKER_ONLINE' : 'NO_WORKER_ENROLLED',
      message: enrolled
        ? 'Queued, but no render worker is online — it will start when one connects.'
        : 'Queued, but no render worker has been set up yet — nothing will pick this up.',
    };
  }
  if (presence.missingCapabilities?.length) {
    return {
      startable: false,
      code: 'NO_WORKER_WITH_CAPABILITY',
      message: `Queued, but no online worker supports: ${presence.missingCapabilities.join(', ')}.`,
    };
  }
  return {
    startable: true,
    code: 'WORKER_ONLINE',
    message: `Queued — ${live} worker${live === 1 ? '' : 's'} online.`,
  };
}

export default { workerPresence, describePresence, WORKER_STALE_AFTER_SECONDS };
