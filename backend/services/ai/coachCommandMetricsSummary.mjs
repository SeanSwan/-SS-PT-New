/**
 * coachCommandMetricsSummary.mjs — v2 P2.2 (Coach command success metrics)
 * ========================================================================
 * Read-side aggregation over the EXISTING AiCommandAuditLog append-only
 * trail (one row per command outcome, PII-redacted at write time by
 * services/ai/commandAudit.mjs). No new ingestion, no new writes — this
 * lane only measures what the audit trail already proves.
 *
 * Spec bind (SWAN-COACH-V1-SPEC "Success Metrics"): command completion
 * rate and fallback rate must be observable. Zero PII: aggregates carry
 * command types, outcomes, counts, and latency only.
 */
import { Op, fn, col } from 'sequelize';
import AiCommandAuditLog from '../../models/AiCommandAuditLog.mjs';
import { shapeApprovalCounts, APPROVAL_EVENT_PREFIX } from './approvalEvents.mjs';

const MAX_WINDOW_DAYS = 90;
const DEFAULT_WINDOW_DAYS = 7;

const SUCCESS_OUTCOMES = new Set(['success', 'debate_started']);
const FAILURE_OUTCOMES = new Set(['failed', 'denied', 'blocked_killswitch', 'not_wired']);

export function clampWindowDays(days) {
  const parsed = Math.trunc(Number(days));
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_WINDOW_DAYS;
  return Math.min(parsed, MAX_WINDOW_DAYS);
}

/**
 * Pure shaping of grouped audit rows into the summary payload.
 * Row shape: { commandType, outcome, count, avgDurationMs }.
 */
export function shapeCommandMetrics(rows) {
  const commands = new Map();
  for (const row of rows) {
    // Card 1.0: approval-lifecycle rows share this table under an `approval:`
    // outcome namespace. They are NOT command attempts — counting them here
    // would inflate `attempts` and deflate `successRate` for the same command
    // type (caught pre-ship: the first version of the guard test only checked
    // that the token was absent from the success/failure SETS, which says
    // nothing about the attempts denominator). They are shaped separately by
    // shapeApprovalCounts over the same rows.
    if (typeof row.outcome === 'string' && row.outcome.startsWith(APPROVAL_EVENT_PREFIX)) continue;
    const commandType = row.commandType || 'unknown';
    const count = Number(row.count) || 0;
    const avgDuration = row.avgDurationMs === null || row.avgDurationMs === undefined
      ? null
      : Number(row.avgDurationMs);
    const entry = commands.get(commandType) || {
      commandType,
      attempts: 0,
      succeeded: 0,
      failed: 0,
      confirmationsPending: 0,
      cancelled: 0,
      durationWeightedSum: 0,
      durationWeight: 0,
    };
    entry.attempts += count;
    if (SUCCESS_OUTCOMES.has(row.outcome)) entry.succeeded += count;
    else if (FAILURE_OUTCOMES.has(row.outcome)) entry.failed += count;
    else if (row.outcome === 'confirmation_required') entry.confirmationsPending += count;
    else if (row.outcome === 'cancelled') entry.cancelled += count;
    if (avgDuration !== null && Number.isFinite(avgDuration)) {
      entry.durationWeightedSum += avgDuration * count;
      entry.durationWeight += count;
    }
    commands.set(commandType, entry);
  }

  const shaped = [...commands.values()]
    .map(({ durationWeightedSum, durationWeight, ...entry }) => ({
      ...entry,
      successRate: entry.attempts ? Number((entry.succeeded / entry.attempts).toFixed(3)) : 0,
      avgDurationMs: durationWeight ? Math.round(durationWeightedSum / durationWeight) : null,
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const totals = shaped.reduce(
    (acc, entry) => ({
      attempts: acc.attempts + entry.attempts,
      succeeded: acc.succeeded + entry.succeeded,
      failed: acc.failed + entry.failed,
      confirmationsPending: acc.confirmationsPending + entry.confirmationsPending,
      cancelled: acc.cancelled + entry.cancelled,
    }),
    { attempts: 0, succeeded: 0, failed: 0, confirmationsPending: 0, cancelled: 0 },
  );

  return {
    totals: {
      ...totals,
      successRate: totals.attempts ? Number((totals.succeeded / totals.attempts).toFixed(3)) : 0,
    },
    commands: shaped,
  };
}

export async function buildCoachCommandMetricsSummary({ days } = {}) {
  const windowDays = clampWindowDays(days);
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const rows = await AiCommandAuditLog.findAll({
    attributes: [
      'commandType',
      'outcome',
      [fn('COUNT', col('id')), 'count'],
      [fn('AVG', col('durationMs')), 'avgDurationMs'],
    ],
    where: { createdAt: { [Op.gte]: since } },
    group: ['commandType', 'outcome'],
    raw: true,
  });
  return {
    windowDays,
    since: since.toISOString(),
    ...shapeCommandMetrics(rows),
    approvals: shapeApprovalCounts(rows),
  };
}
