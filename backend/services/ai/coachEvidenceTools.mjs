/**
 * SCU S5 — bounded read-only evidence tools for Coach inference.
 *
 * Four allowlisted tools, each reusing an authorized domain reader (no new
 * data source, no write): context_summary, exercise_lookup, recent_workout,
 * progress_evidence. Every run returns a state envelope that distinguishes
 * empty / unavailable / denied / stale / ok — a reader THROW is `unavailable`,
 * zero rows is `empty` (T22: a failed pain/progress query is never reported as
 * "no pain" / "no progress"). The inference boundary refreshes actor/target
 * authorization before invoking these scoped readers; no data is cached here.
 *
 * Per-query caps: MAX_ROWS rows and MAX_PAYLOAD_BYTES of payload; overflow is
 * truncated and flagged. Tool output is DATA — the boundary quotes it; the
 * tools themselves never interpret free text (T23 prompt-injection surface).
 */

import {
  COACH_EXERCISE_READER_REASONS,
  readCoachExerciseLibrary,
  validateAndFormatExerciseRows,
  validateExerciseLimit,
  validateExerciseQuery,
} from './coachExerciseLibraryReader.mjs';

const MAX_ROWS = 25;
const MAX_PAYLOAD_BYTES = 8 * 1024;
const RECENT_WORKOUT_LIMIT = 5;
const EXERCISE_LOOKUP_LIMIT = 10;

function selectType(sequelize) {
  return sequelize?.QueryTypes?.SELECT || 'SELECT';
}

async function safeQuery(sequelize, sql, replacements) {
  return sequelize.query(sql, { replacements, type: selectType(sequelize) });
}

function byteLength(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? 'null', 'utf8');
  } catch {
    return Infinity;
  }
}

function truncatePayload(payload, _rows, { maxRows = MAX_ROWS, maxBytes = MAX_PAYLOAD_BYTES } = {}) {
  let out = Array.isArray(payload) ? payload.slice(0, maxRows) : payload;
  let truncated = Array.isArray(payload) && payload.length > maxRows;
  while (byteLength(out) > maxBytes && Array.isArray(out) && out.length > 0) {
    out = out.slice(0, Math.floor(out.length / 2));
    truncated = true;
  }
  if (byteLength(out) > maxBytes) { out = null; truncated = true; }
  return { payload: out, rows: Array.isArray(out) ? out.length : 0, bytes: byteLength(out), truncated };
}

// Preserve authoritative quality metadata and complete retained values. Remove
// whole optional fields instead of cutting a sentence or silently taking a
// numeric subset. Authorization success is independent of evidence size.
function compactContextPayload(payload) {
  const originalBytes = byteLength(payload);
  if (originalBytes <= MAX_PAYLOAD_BYTES) return { payload, bytes: originalBytes, truncated: false };
  if (!Number.isFinite(originalBytes)) return { payload: null, bytes: 4, truncated: true };
  const context = { ...payload.context };
  const truncation = { reason: 'context_payload_limit', complete: false, originalBytes, omittedFields: [] };
  const compacted = { truncation, context, dataQuality: payload.dataQuality, evidence: payload.evidence };
  // Keep identity and safety constraints intact. If these cannot fit alongside
  // quality metadata, the context remains unavailable rather than hiding risk.
  const protectedFields = new Set(['clientAlias', 'painEntries', 'restrictions', 'contraindications', 'injuryConstraints', 'medicalRestrictions']);
  const candidates = Object.keys(context).filter(key => !protectedFields.has(key))
    .sort((a, b) => byteLength(context[b]) - byteLength(context[a]) || a.localeCompare(b));
  for (const key of candidates) {
    delete context[key];
    truncation.omittedFields.push(`context.${key}`);
    const bytes = byteLength(compacted);
    if (bytes <= MAX_PAYLOAD_BYTES) return { payload: compacted, bytes, truncated: true };
  }
  // Oversized authority/quality metadata is not disposable: fail closed.
  return { payload: null, bytes: 4, truncated: true };
}

function envelope(toolId, state, extra = {}) {
  return { toolId, state, ...extra };
}

const exerciseReaderReasons = new Set(Object.values(COACH_EXERCISE_READER_REASONS));

function exerciseFailureReason(error) {
  if (error?.reasonCode && exerciseReaderReasons.has(error.reasonCode)) return error.reasonCode;
  if (error?.name === 'AbortError' || error?.code === 'ABORT_ERR') return COACH_EXERCISE_READER_REASONS.REQUEST_CANCELLED;
  return COACH_EXERCISE_READER_REASONS.READER_UNAVAILABLE;
}

function compactExercisePayload(payload, maxRows, overflow) {
  let retained = payload.slice(0, maxRows);
  let truncated = overflow;
  let bytes = byteLength(retained);
  while (bytes > MAX_PAYLOAD_BYTES && retained.length > 0) {
    retained = retained.slice(0, -1);
    truncated = true;
    bytes = byteLength(retained);
  }
  if (retained.length === 0 && payload.length > 0) return null;
  return { payload: retained, rows: retained.length, bytes, truncated };
}

// ── Tool: context summary ────────────────────────────────────────────────────
// Reuses the S5 read layer (authorization-first, de-identified, fail-closed).
export async function contextSummaryTool({ sequelize, user, targetClientId, signal, deps = {} } = {}) {
  const toolId = 'context_summary';
  try {
    signal?.throwIfAborted();
    const reader = deps.buildCoachContext
      ?? (await import('./contextEngine/coachContextEngine.mjs')).buildCoachContext;
    signal?.throwIfAborted();
    const context = await reader({ user, targetClientId, sequelize, signal });
    signal?.throwIfAborted();
    if (context?.accessDenied || (context?.ok === false && context.deniedReason !== 'no_database')) {
      return envelope(toolId, 'denied', { accessDenied: true });
    }
    if (context?.ok !== true || !context.context || typeof context.context !== 'object' || Array.isArray(context.context)) {
      return envelope(toolId, 'unavailable', { reason: 'authoritative_context_unavailable' });
    }
    // The engine also returns a local aliasMap containing identities. It must
    // never cross this boundary. Carry source quality alongside the safe data.
    const payload = { context: context.context, dataQuality: context.dataQuality ?? [], evidence: context.evidence ?? null };
    const compacted = compactContextPayload(payload);
    if (compacted.payload === null) return envelope(toolId, 'unavailable', {
      ...compacted, rows: 0, reason: 'context_payload_limit',
    });
    return envelope(toolId, 'ok', { ...compacted, rows: 0 });
  } catch (error) {
    return envelope(toolId, 'unavailable', { reason: String(error?.message || error).slice(0, 200) });
  }
}

// ── Tool: exercise lookup ────────────────────────────────────────────────────
// Read-only search over the coach exercise library; de-identified rows only.
export async function exerciseLookupTool({
  sequelize,
  query = '',
  limit = EXERCISE_LOOKUP_LIMIT,
  signal,
  deps = {},
} = {}) {
  const toolId = 'exercise_lookup';
  try {
    signal?.throwIfAborted();
    const queryResult = validateExerciseQuery(query);
    if (!queryResult.ok) return envelope(toolId, 'unavailable', { reason: queryResult.reasonCode });
    const limitResult = validateExerciseLimit(limit);
    if (!limitResult.ok) return envelope(toolId, 'unavailable', { reason: limitResult.reasonCode });
    if (!queryResult.query) return envelope(toolId, 'empty', { payload: [], rows: 0, bytes: 2, truncated: false });
    const injectedReader = deps && typeof deps === 'object' ? deps.exerciseReader : undefined;
    const loader = typeof injectedReader === 'function' ? injectedReader : readCoachExerciseLibrary;
    const rows = await loader(sequelize, queryResult.query, limitResult.limit, { signal });
    signal?.throwIfAborted();
    if (!Array.isArray(rows)) return envelope(toolId, 'unavailable', { reason: COACH_EXERCISE_READER_REASONS.ROWS_INVALID });
    if (rows.length === 0) return envelope(toolId, 'empty', { payload: [], rows: 0, bytes: 2, truncated: false });
    const retainedRows = rows.slice(0, limitResult.limit);
    const formatted = validateAndFormatExerciseRows(retainedRows);
    const capped = compactExercisePayload(formatted, limitResult.limit, rows.length > limitResult.limit);
    if (!capped) return envelope(toolId, 'unavailable', { reason: COACH_EXERCISE_READER_REASONS.PAYLOAD_LIMIT });
    return envelope(toolId, 'ok', capped);
  } catch (error) {
    return envelope(toolId, 'unavailable', { reason: signal?.aborted
      ? COACH_EXERCISE_READER_REASONS.REQUEST_CANCELLED : exerciseFailureReason(error) });
  }
}

// ── Tool: recent workout evidence ────────────────────────────────────────────
// Last-N completed sessions for the authorized subject resolved upstream.
// Raw read is capped; the reader throws on schema/DB
// failure -> unavailable (never "no workouts").
export async function recentWorkoutTool({ sequelize, userId, limit = RECENT_WORKOUT_LIMIT, signal, deps = {} } = {}) {
  const toolId = 'recent_workout';
  if (!sequelize || !Number.isSafeInteger(Number(userId)) || Number(userId) <= 0) {
    return envelope(toolId, 'unavailable', { reason: 'no authorized session reader context' });
  }
  const cap = Math.min(Math.max(1, Number(limit) || RECENT_WORKOUT_LIMIT), RECENT_WORKOUT_LIMIT);
  const sql = [
    'SELECT ws.id, ws.title, ws.date AS "createdAt", ws.duration, ws.intensity,',
    "  json_agg(json_build_object('exerciseName', wl.\"exerciseName\", 'setNumber', wl.\"setNumber\",",
    "    'reps', wl.reps, 'weight', wl.weight) ORDER BY wl.\"exerciseName\", wl.\"setNumber\") AS exercises",
    ' FROM workout_sessions ws',
    ' JOIN workout_logs wl ON wl."sessionId" = ws.id',
    " WHERE ws.\"userId\" = :userId AND ws.status = 'completed'",
    '   AND ws.date <= :now',
    ' GROUP BY ws.id, ws.title, ws.date, ws.duration, ws.intensity',
    ' ORDER BY ws.date DESC',
    ' LIMIT :limit',
  ].join('\n');
  try {
    signal?.throwIfAborted();
    // Sequelize's query API does not guarantee driver cancellation. Discard a
    // result after abort; the boundary prevents dependent reads and egress.
    const rows = await safeQuery(sequelize, sql, { userId, limit: cap, now: new Date().toISOString() });
    signal?.throwIfAborted();
    const allRows = Array.isArray(rows) ? rows : [];
    if (allRows.length === 0) {
      return envelope(toolId, 'empty', { payload: [], rows: 0, bytes: 0, truncated: false });
    }
    // The SQL LIMIT is the primary cap; the tool enforces it again client-side
    // so a reader that ignores the bound can never overflow the payload.
    const cappedRows = allRows.slice(0, cap);
    const capped = truncatePayload(cappedRows);
    return envelope(toolId, 'ok', {
      payload: capped.payload,
      rows: capped.rows,
      bytes: capped.bytes,
      truncated: allRows.length > cap || capped.truncated,
    });
  } catch (error) {
    return envelope(toolId, 'unavailable', { reason: String(error?.message || error).slice(0, 200) });
  }
}

// ── Tool: progress evidence ──────────────────────────────────────────────────
// G07/T33: deterministic metrics over canonical logs and normalized sets.
// Zero logged sessions -> empty; rows without verified completion ->
// no_verified_records; reader failure -> unavailable. Schedule adherence stays
// unknown until authoritative schedule membership is available.
export async function progressEvidenceTool({ sequelize, userId, signal, deps = {} } = {}) {
  const toolId = 'progress_evidence';
  if (!sequelize || !(Number.isInteger(Number(userId)) && Number(userId) > 0)) {
    return envelope(toolId, 'unavailable', { reason: 'no authorized session reader context' });
  }
  try {
    signal?.throwIfAborted();
    const builder = deps.buildProgressEvidence
      ?? (await import('./coachProgressEvidence.mjs')).buildCoachProgressEvidence;
    const reader = deps.readProgressRecords
      ?? (await import('./coachProgressRecordReader.mjs')).readCoachProgressRecords;
    signal?.throwIfAborted();
    const records = await reader({ sequelize, userId, signal });
    signal?.throwIfAborted();
    const sessions = Array.isArray(records?.sessions) ? records.sessions : [];
    const evidence = builder({
      sessions,
      scheduledCount: records?.scheduledCount ?? null,
    });
    if (!evidence) {
      return envelope(toolId, 'empty', { payload: {}, rows: sessions.length, bytes: 0, truncated: false });
    }
    // Reader-level missing inputs (e.g. a missing weight unit) must reach the
    // planner: merge without duplicating the builder's own entries.
    const readerMissing = Array.isArray(records?.missingInputs) ? records.missingInputs : [];
    if (readerMissing.length > 0) {
      evidence.missingInputs = [...new Set([...(evidence.missingInputs || []), ...readerMissing])];
    }
    // Envelope state mirrors the builder's data status: verified -> ok,
    // 'empty' -> empty (real zero), 'no_verified_records'/'unavailable' ->
    // unavailable. Payload always carries the precise status.
    const partial = readerMissing.includes('session_row_cap');
    if (partial) evidence.completeness = 'partial';
    const capped = truncatePayload([evidence]);
    const oversized = capped.payload.length === 0;
    const state = (partial || oversized) ? 'unavailable' : evidence.status === 'verified' ? 'ok' : evidence.status === 'empty' ? 'empty' : 'unavailable';
    return envelope(toolId, state, {
      payload: oversized ? null : evidence,
      rows: oversized ? 0 : sessions.length,
      bytes: capped.bytes,
      truncated: capped.truncated,
    });
  } catch (error) {
    return envelope(toolId, 'unavailable', { reason: String(error?.message || error).slice(0, 200) });
  }
}

export const COACH_EVIDENCE_TOOLS = {
  context_summary: contextSummaryTool,
  exercise_lookup: exerciseLookupTool,
  recent_workout: recentWorkoutTool,
  progress_evidence: progressEvidenceTool,
};

export const COACH_EVIDENCE_TOOL_IDS = Object.keys(COACH_EVIDENCE_TOOLS);
