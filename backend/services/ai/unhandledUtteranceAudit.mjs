/**
 * Unhandled-Utterance Pipeline (F1, 2026-08-21)
 * =============================================
 * The command classifier already sorts every input into executable / ambiguous /
 * conversation — and then the non-command outcomes VANISH. The chat/clarification
 * fallthrough in aiCommandRoutes returns without any audit row, so the product's
 * richest roadmap signal ("what do people ask Swan Coach for that it cannot do?")
 * was being computed on every request and thrown away.
 *
 * This module records those outcomes and serves the grouped top-N:
 *   - what users actually said (normalized + PHI-redacted, never raw)
 *   - which of the three no-command outcomes it hit
 *   - unknown_intent additionally captures the phantom intent name — that is the
 *     classifier-drift signal (the model invented a command that does not exist)
 *
 * Design constraints honoured:
 *   - ZERO schema change. Rows go into the existing append-only AiCommandAuditLog
 *     (commandType is nullable by design; outcome is free text ≤30; the utterance
 *     travels through the SAME redactParams PHI pipeline as command params, so a
 *     spoken client name is stripped exactly as it would be anywhere else).
 *     No migration → no blast-radius on the shared production DB.
 *   - Grouping is by the REDACTED normalized utterance (paramsRedacted->>'utterance'),
 *     NOT by paramsHash: the hash covers the whole params object, so including
 *     `surface` in it would split identical utterances into per-surface buckets.
 *   - Digits are normalized to '#' BEFORE redaction, so "log bench 3x8 at 60"
 *     and "log bench 5x5 at 80" group as one ask — and numeric client ids never
 *     reach storage even pre-redaction.
 *   - Best-effort throughout: this must never fail a user's request. It reuses
 *     recordCommandAudit, which already guarantees that.
 *
 * Reading side: buildUnhandledUtteranceTop() — weekly top-N for the admin metrics
 * surface. The intended cadence (per the 2026-08-21 forward panel, GLM seat):
 * read the top-10 weekly, convert 2-3 recurring asks per sprint into real
 * registry commands. The roadmap writes itself and classifier drift becomes a
 * measured number instead of a vibe.
 */
import { fn, col, Op } from 'sequelize';
import { recordCommandAudit } from './commandAudit.mjs';

// Window clamp mirrors coachCommandMetricsSummary (default 7, max 90). Inlined —
// and the model is lazy-imported below, exactly like recordCommandAudit does —
// so that aiCommandRoutes can import THIS module statically without dragging the
// metrics service + model into its module graph. That graph is deliberately kept
// small: the route's /metrics/summary comment documents that existing route unit
// tests mock only the execute/confirm dependencies, and a static chain here would
// break that contract invisibly.
const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 90;
function clampWindowDays(days) {
  const parsed = Math.trunc(Number(days));
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_WINDOW_DAYS;
  return Math.min(parsed, MAX_WINDOW_DAYS);
}

/** Outcome value for every row this module writes. ≤30 chars (model column cap). */
export const UNHANDLED_OUTCOME = 'nl_unhandled';

/** The three ways an utterance fails to become a command. */
export const UNHANDLED_KINDS = Object.freeze(['chat', 'clarification_needed', 'unknown_intent']);

const MAX_UTTERANCE_CHARS = 160;

/**
 * Normalize an utterance for grouping: lowercase, whitespace collapsed, digits
 * masked, truncated. Deterministic so identical asks land in one bucket.
 * Returns null for empty/non-string input — callers skip recording then.
 */
export function normalizeUtterance(input) {
  if (typeof input !== 'string') return null;
  const normalized = input
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_UTTERANCE_CHARS);
  return normalized.length > 0 ? normalized : null;
}

/**
 * Record one unhandled utterance. Fire-and-forget; never throws, never blocks.
 *
 * @param {Object} entry
 * @param {number} entry.userId       actor id (required by the audit writer)
 * @param {string} entry.userRole     actor role
 * @param {string} entry.input        the raw utterance (normalized + redacted here)
 * @param {string} entry.kind         'chat' | 'clarification_needed' | 'unknown_intent'
 * @param {string|null} [entry.surface]  active surface from routeContext, if any
 * @param {string|null} [entry.phantomIntent]  for unknown_intent: the intent name
 *        the classifier invented — the drift signal
 * @returns {Promise<boolean>} true when a row was written
 */
export async function recordUnhandledUtterance({ userId, userRole, input, kind, surface = null, phantomIntent = null }) {
  const utterance = normalizeUtterance(input);
  if (!utterance || !UNHANDLED_KINDS.includes(kind)) return false;

  return recordCommandAudit({
    userId,
    userRole,
    commandType: null,
    outcome: UNHANDLED_OUTCOME,
    errorCode: kind,
    // Redaction + hashing happen inside recordCommandAudit via redactParams —
    // the utterance gets the same PHI strip as any command param.
    params: {
      utterance,
      ...(surface ? { surface } : {}),
      ...(phantomIntent ? { intent: String(phantomIntent).slice(0, 100) } : {}),
    },
  });
}

/**
 * The grouped top-N: what people keep asking for that Swan Coach cannot do.
 *
 * @param {Object} [opts]
 * @param {number} [opts.days=7]    window (clamped by the shared metrics clamp)
 * @param {number} [opts.limit=10]  max buckets returned
 * @returns {Promise<{windowDays:number, since:string, total:number, top:Array<{
 *   utterance:string, count:number, kinds:Record<string,number>, lastSeen:string
 * }>}>}
 */
export async function buildUnhandledUtteranceTop({ days = 7, limit = 10 } = {}) {
  const windowDays = clampWindowDays(days);
  const since = new Date(Date.now() - windowDays * 86_400_000);
  const cappedLimit = Math.max(1, Math.min(50, Number(limit) || 10));

  const utteranceCol = fn('jsonb_extract_path_text', col('paramsRedacted'), 'utterance');

  const { default: AiCommandAuditLog } = await import('../../models/AiCommandAuditLog.mjs');
  const rows = await AiCommandAuditLog.findAll({
    attributes: [
      [utteranceCol, 'utterance'],
      ['errorCode', 'kind'],
      [fn('COUNT', col('id')), 'count'],
      [fn('MAX', col('createdAt')), 'lastSeen'],
    ],
    where: { outcome: UNHANDLED_OUTCOME, createdAt: { [Op.gte]: since } },
    group: [utteranceCol, col('errorCode')],
    // Round-1 fix (Sol): the caller's limit was applied only in JS after an
    // UNBOUNDED grouped read. This is the DB-side bound — ranked by count so the
    // top-N is still exact, with headroom for per-kind rows that merge below.
    order: [[fn('COUNT', col('id')), 'DESC']],
    limit: Math.min(2000, cappedLimit * 20),
    raw: true,
  });

  // Merge per-kind rows into one bucket per utterance, then rank by total count.
  const buckets = new Map();
  let total = 0;
  for (const row of rows) {
    const key = row.utterance ?? '(unparseable)';
    const count = Number(row.count) || 0;
    total += count;
    const bucket = buckets.get(key) ?? { utterance: key, count: 0, kinds: {}, lastSeen: null };
    bucket.count += count;
    bucket.kinds[row.kind ?? 'unknown'] = (bucket.kinds[row.kind ?? 'unknown'] || 0) + count;
    const seen = row.lastSeen ? new Date(row.lastSeen).toISOString() : null;
    if (seen && (!bucket.lastSeen || seen > bucket.lastSeen)) bucket.lastSeen = seen;
    buckets.set(key, bucket);
  }

  const top = [...buckets.values()]
    .sort((a, b) => b.count - a.count || a.utterance.localeCompare(b.utterance))
    .slice(0, cappedLimit);

  return { windowDays, since: since.toISOString(), total, top };
}
