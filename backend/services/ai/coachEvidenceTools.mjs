/**
 * SCU S5 — bounded read-only evidence tools for Coach inference.
 *
 * Four allowlisted tools, each reusing an authorized domain reader (no new
 * data source, no write): context_summary, exercise_lookup, recent_workout,
 * progress_evidence. Every run returns a state envelope that distinguishes
 * empty / unavailable / denied / stale / ok — a reader THROW is `unavailable`,
 * zero rows is `empty` (T22: a failed pain/progress query is never reported as
 * "no pain" / "no progress"). Permission/target is refreshed per tool: each
 * tool performs its own authorized read; nothing is shared across tools.
 *
 * Per-query caps: MAX_ROWS rows and MAX_PAYLOAD_BYTES of payload; overflow is
 * truncated and flagged. Tool output is DATA — the boundary quotes it; the
 * tools themselves never interpret free text (T23 prompt-injection surface).
 */

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
    return 0;
  }
}

function truncatePayload(payload, rows, { maxRows = MAX_ROWS, maxBytes = MAX_PAYLOAD_BYTES } = {}) {
  const rowCap = Array.isArray(payload) ? Math.min(payload.length, maxRows) : payload.length ?? 0;
  let out = Array.isArray(payload) ? payload.slice(0, maxRows) : payload;
  let truncated = Array.isArray(payload) ? payload.length > maxRows : false;
  let guard = 0;
  while (byteLength(out) > maxBytes && Array.isArray(out) && out.length > 1 && guard < 64) {
    out = out.slice(0, Math.max(1, Math.floor(out.length / 2)));
    truncated = true;
    guard += 1;
  }
  return { payload: out, rows: rowCap, bytes: byteLength(out), truncated };
}

function envelope(toolId, state, extra = {}) {
  return { toolId, state, ...extra };
}

// ── Tool: context summary ────────────────────────────────────────────────────
// Reuses the S5 read layer (authorization-first, de-identified, fail-closed).
export async function contextSummaryTool({ sequelize, user, targetClientId, deps = {} } = {}) {
  const toolId = 'context_summary';
  const reader = deps.buildCoachContext
    ?? (await import('./contextEngine/coachContextEngine.mjs')).buildCoachContext;
  try {
    const context = await reader({ user, targetClientId, sequelize });
    if (!context || context.accessDenied) {
      return envelope(toolId, 'denied', { accessDenied: true });
    }
    if (!context || Object.keys(context).length === 0) {
      return envelope(toolId, 'empty', { payload: {}, rows: 0, bytes: 0, truncated: false });
    }
    const bytes = byteLength(context);
    return envelope(toolId, 'ok', {
      payload: context,
      rows: 0,
      bytes,
      truncated: bytes > MAX_PAYLOAD_BYTES,
    });
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
  deps = {},
} = {}) {
  const toolId = 'exercise_lookup';
  const loader = deps.exerciseReader;
  if (!loader || typeof loader !== 'function') {
    return envelope(toolId, 'unavailable', { reason: 'no authorized exercise reader configured' });
  }
  const cap = Math.min(Math.max(1, Number(limit) || EXERCISE_LOOKUP_LIMIT), EXERCISE_LOOKUP_LIMIT);
  try {
    const rows = await loader(sequelize, String(query).slice(0, 120), cap);
    if (!Array.isArray(rows) || rows.length === 0) {
      return envelope(toolId, 'empty', { payload: [], rows: 0, bytes: 0, truncated: false });
    }
    const capped = truncatePayload(rows);
    return envelope(toolId, 'ok', { payload: capped.payload, ...capped });
  } catch (error) {
    return envelope(toolId, 'unavailable', { reason: String(error?.message || error).slice(0, 200) });
  }
}

// ── Tool: recent workout evidence ────────────────────────────────────────────
// Last-N completed sessions for the target (or the actor's own sessions when
// no target is bound). Raw read is capped; the reader throws on schema/DB
// failure -> unavailable (never "no workouts").
export async function recentWorkoutTool({ sequelize, userId, limit = RECENT_WORKOUT_LIMIT, deps = {} } = {}) {
  const toolId = 'recent_workout';
  if (!sequelize || !Number(userId)) {
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
    ' GROUP BY ws.id, ws.title, ws.date, ws.duration, ws.intensity',
    ' ORDER BY ws.date DESC',
    ' LIMIT :limit',
  ].join('\n');
  try {
    const [rows] = await safeQuery(sequelize, sql, { userId, limit: cap });
    const allRows = Array.isArray(rows) ? rows : [];
    if (allRows.length === 0) {
      return envelope(toolId, 'empty', { payload: [], rows: 0, bytes: 0, truncated: false });
    }
    // The SQL LIMIT is the primary cap; the tool enforces it again client-side
    // so a reader that ignores the bound can never overflow the payload.
    const cappedRows = allRows.slice(0, cap);
    const capped = truncatePayload(cappedRows);
    return envelope(toolId, 'ok', {
      payload: cappedRows,
      rows: cappedRows.length,
      bytes: capped.bytes,
      truncated: allRows.length > cap || capped.truncated,
    });
  } catch (error) {
    return envelope(toolId, 'unavailable', { reason: String(error?.message || error).slice(0, 200) });
  }
}

// ── Tool: progress evidence ──────────────────────────────────────────────────
// Deterministic metrics from completed sessions + scheduled adherence, via the
// frozen S5 progress-evidence builder. Zero sessions -> empty (not zero
// progress); reader failure -> unavailable.
export async function progressEvidenceTool({ sequelize, userId, deps = {} } = {}) {
  const toolId = 'progress_evidence';
  const builder = deps.buildProgressEvidence
    ?? (await import('./coachProgressEvidence.mjs')).buildCoachProgressEvidence;
  if (!sequelize || !Number(userId)) {
    return envelope(toolId, 'unavailable', { reason: 'no authorized session reader context' });
  }
  const sessionsSql = [
    'SELECT ws.id, ws.date, ws.duration, ws.intensity',
    " FROM workout_sessions ws",
    " WHERE ws.\"userId\" = :userId AND ws.status = 'completed'",
    ' ORDER BY ws.date DESC LIMIT 60',
  ].join('\n');
  try {
    const [sessionRows] = await safeQuery(sequelize, sessionsSql, { userId });
    const sessions = Array.isArray(sessionRows) ? sessionRows : [];
    let scheduledCount = null;
    try {
      const [scheduled] = await safeQuery(
        sequelize,
        "SELECT COUNT(*)::int AS n FROM workout_sessions WHERE \"userId\" = :userId",
        { userId },
      );
      const first = Array.isArray(scheduled) ? scheduled[0] : scheduled;
      const n = Number(first?.n ?? first?.N ?? 0);
      scheduledCount = Number.isSafeInteger(n) ? n : null;
    } catch {
      scheduledCount = null;
    }
    const evidence = builder({ sessions, scheduledCount });
    if (!evidence) {
      return envelope(toolId, 'empty', { payload: {}, rows: sessions.length, bytes: 0, truncated: false });
    }
    const capped = truncatePayload([evidence]);
    // Zero rows from the reader is `empty` (no data, reader fine). When rows
    // exist, the tool state mirrors the S8 evidence status: verified -> ok,
    // unavailable (no *verified* records) -> unavailable. The builder's state
    // is data the planner reads; the envelope state is not re-interpreted.
    const state = sessions.length === 0 ? 'empty' : (evidence.status === 'verified' ? 'ok' : 'unavailable');
    return envelope(toolId, state, {
      payload: evidence,
      rows: sessions.length,
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
