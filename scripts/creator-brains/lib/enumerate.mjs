#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/enumerate.mjs
 * PURPOSE: Enumerate a channel's uploads as STRUCTURED records, and report
 *          whether the walk was actually complete.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR12, HR22)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT WAS WRONG (reproduced finding HR12):
 *   Rows were tab-separated `--print` output, and the parser dropped any row
 *   whose field count did not match. A video whose TITLE contained a tab was
 *   therefore silently discarded. Two such runs in a row marked a live video
 *   `deleted_upstream` — a terminal state — because "absent from the enumeration"
 *   was equated with "deleted", and the two-observation rule was counting two
 *   BROKEN enumerations rather than two good ones.
 *
 * THE FIX HAS TWO HALVES:
 *   1. STRUCTURED RECORDS. Rows are JSON objects (`%(...)j`), so a tab or a
 *      newline inside a title cannot shift a field or drop a row. A JSON line
 *      that fails to parse is COUNTED, not skipped.
 *   2. AN EXPLICIT COMPLETENESS VERDICT. `classifyEnumeration` returns
 *      `{complete, reason}`; a partial, empty or shape-invalid walk returns
 *      `complete: false`, and discovery refuses to advance any deletion
 *      confirmation on an incomplete walk.
 *
 * HR22 — SCOPE, STATED HONESTLY:
 *   A `…/videos` tab is ONE tab. It excludes Shorts and past live streams, so
 *   "every video" was never what this returned. `enumerateChannel` walks the
 *   tabs you ask for and MERGES by video id; the CLI default is
 *   videos+shorts+streams, and the result reports which tabs were covered. The
 *   old high-water mark was stored and never read — it is now used to stop an
 *   incremental walk early.
 *
 * @module creator-brains/enumerate
 */

import { runOperation } from './ytdlp.mjs';

export const PRINT_FIELDS = ['id', 'title', 'duration', 'view_count', 'upload_date', 'channel_id', 'availability'];

/** The tabs that together make up a channel's video corpus. */
export const TABS = Object.freeze(['videos', 'shorts', 'streams']);

export const channelTabUrl = (channelId, tab = 'videos') =>
  `https://www.youtube.com/channel/${channelId}/${tab}`;

/**
 * Parse JSON-lines output into rows, counting what could not be read.
 * Returns `{ rows, invalid, total }`.
 */
export function parsePrintRows(stdout) {
  const rows = [];
  const invalid = [];
  for (const line of String(stdout || '').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (!t.startsWith('{')) { invalid.push({ line: t.slice(0, 120), reason: 'not a JSON record' }); continue; }
    let doc;
    try {
      doc = JSON.parse(t);
    } catch (e) {
      invalid.push({ line: t.slice(0, 120), reason: `invalid JSON: ${e.message}` });
      continue;
    }
    if (!doc || !/^[A-Za-z0-9_-]{11}$/.test(String(doc.id || ''))) {
      invalid.push({ line: t.slice(0, 120), reason: 'record has no usable video id' });
      continue;
    }
    rows.push({
      id: doc.id,
      title: doc.title ?? null,
      duration: doc.duration ?? null,
      view_count: doc.view_count ?? null,
      upload_date: doc.upload_date ?? null,
      channel_id: doc.channel_id ?? null,
      availability: doc.availability ?? null,
    });
  }
  return { rows, invalid, total: rows.length + invalid.length };
}

/**
 * Decide whether an enumeration may be treated as authoritative.
 *
 * `complete: false` is the important answer. It is returned when the walk
 * produced nothing, when any row failed to parse, or when the caller's limit was
 * reached — and discovery will not advance a deletion confirmation on an
 * incomplete walk (review HR12).
 */
export function classifyEnumeration({
  rows, invalid, limit = 0, error = null,
} = {}) {
  if (error) return { complete: false, reason: `enumeration failed: ${error}` };
  if (!Array.isArray(rows) || rows.length === 0) {
    return { complete: false, reason: 'enumeration returned no rows — inconclusive, not an empty channel' };
  }
  if (invalid && invalid.length) {
    return { complete: false, reason: `${invalid.length} row(s) could not be parsed — the walk is not authoritative` };
  }
  if (Number.isInteger(limit) && limit > 0 && rows.length >= limit) {
    return { complete: false, reason: `walk stopped at the requested limit of ${limit}` };
  }
  return { complete: true, reason: null };
}

/**
 * Enumerate one tab. Returns the structured result rather than throwing, so the
 * caller can distinguish "no rows" from "the process failed".
 */
export function listUploads(url, { limit = 0, timeout = 300_000 } = {}) {
  let out;
  try {
    out = runOperation('enumerate', { url, limit }, { timeout });
  } catch (e) {
    return { rows: [], invalid: [], error: e.message };
  }
  return parsePrintRows(out);
}

/**
 * Enumerate a channel across several tabs and MERGE by video id.
 *
 * A channel's uploads live in more than one tab — `videos` excludes Shorts and
 * past live streams — so "every video" requires asking for all of them
 * (review HR22). The result carries per-tab counts and the union of every
 * completeness verdict, because one truncated tab makes the whole walk
 * non-authoritative.
 */
export function enumerateChannel(channelId, {
  tabs = TABS, limit = 0, timeout = 300_000, stopAfterId = null,
} = {}) {
  const seen = new Map();
  const perTab = {};
  const invalid = [];
  const problems = [];
  let stoppedEarly = false;

  for (const tab of tabs) {
    const url = channelTabUrl(channelId, tab);
    const res = listUploads(url, { limit, timeout });
    if (res.error) {
      problems.push(`${tab}: ${res.error}`);
      perTab[tab] = { rows: 0, error: res.error };
      continue;
    }
    perTab[tab] = { rows: res.rows.length, invalid: res.invalid.length };
    invalid.push(...res.invalid.map((x) => ({ ...x, tab })));

    for (const row of res.rows) {
      if (stopAfterId && row.id === stopAfterId) { stoppedEarly = true; break; }
      if (!seen.has(row.id)) seen.set(row.id, { ...row, tab });
    }
    if (stoppedEarly) break;
  }

  const rows = [...seen.values()];
  const verdict = stoppedEarly
    ? { complete: false, reason: 'incremental walk stopped at the high-water mark' }
    : classifyEnumeration({ rows, invalid, limit });

  return {
    rows,
    perTab,
    invalid,
    problems,
    // A per-tab failure also makes the union incomplete, even if rows arrived.
    complete: verdict.complete && problems.length === 0,
    reason: problems.length ? `tab failures: ${problems.join('; ')}` : verdict.reason,
    tabs,
    stoppedEarly,
  };
}
