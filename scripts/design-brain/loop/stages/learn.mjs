/**
 * stages/learn.mjs — LEARN stage (S1): write the atelier session through the
 * canonical validator; the loop's events land in the SAME ledger Sean's picks do.
 * ===============================================================================
 * One schema, one log (log-atelier-session.mjs is the single writer doctrine —
 * this stage imports its validate() rather than inventing a second shape).
 * A loop run without Sean's pass is a `pending` session: candidates recorded,
 * no verdict claimed. When Sean picks/kills in a later pass, the resolved
 * session appends under the same brief_id and last-line-wins supersedes this
 * one — which read-ledger.mjs (the consumer) then serves back to STRUCTURE.
 * scope fields (domain/project/artifact_type) ride along now because scope
 * can never be retrofitted onto already-recorded events (panel: Kimi F5).
 */
import { appendFileSync } from 'node:fs';

import { validate, LOG_PATH } from '../../log-atelier-session.mjs';

export function learnStage(ctx) {
  const { ir, verify } = ctx.artifacts;
  const session = {
    ts: new Date().toISOString(),
    brief_id: ctx.brief.brief_id,
    archetype_ids: [ctx.brief.archetype],
    plate_pack_id: ctx.artifacts.materials.material_plan_id,
    scope: { domain: ctx.brief.domain, project: ctx.brief.project ?? 'swanstudios', artifact_type: ctx.brief.archetype },
    variants: ir.selection.scores.slice(0, 2).map(({ skeleton_id }, i) => ({
      id: `${ctx.brief.brief_id}-v${i + 1}`,
      skeleton_id,
      outcome: 'survived',
    })),
    null_winner: false,
    pending: true, // no verdict until Sean's pass — the loop never claims his taste
    rounds: 1,
    wave2_used: false,
    cost_usd: 0,
    wall_s: null,
    loop_receipt: { verify_pass: verify.all_meters_pass, roundtrip: verify.skeleton_roundtrip_ok },
  };

  const defects = validate(session);
  if (defects.length) {
    throw new Error(`LEARN produced an invalid session (${defects.length}): ${defects.join('; ')}`);
  }
  const logPath = ctx.ledgerPath ?? LOG_PATH;
  appendFileSync(logPath, JSON.stringify(session) + '\n');
  return { session_appended: true, brief_id: session.brief_id, log_path: logPath, pending: true };
}
