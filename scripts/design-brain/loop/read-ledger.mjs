/**
 * read-ledger.mjs — the rejection log's FIRST code consumer (S1, SWA-185/SWA-182).
 * ================================================================================
 * The 2026-08-19 handoff and the 2026-08-20 audit both flagged the same defect:
 * log-atelier-session.mjs WRITES an append-only taste ledger that no code ever
 * READS — every pick Sean makes influences nothing. This module closes the
 * thinnest honest version of that gap: STRUCTURE consults it so a skeleton
 * Sean already killed for a brief is never blindly re-proposed (panel: Kimi F6.5
 * "killed-direction regression memory").
 *
 * READER DOCTRINE (from the writer's header, honored here): append-only; for
 * any brief_id the LAST line wins; `pending` sessions carry no verdict.
 * Malformed lines are skipped with a warning, never fatal — a corrupt line
 * must not brick every future design run (fail-open on read, fail-closed on write).
 */
import { existsSync, readFileSync } from 'node:fs';

import { LOG_PATH } from '../log-atelier-session.mjs';

/** Parse the ledger. Returns {sessions: Map<brief_id, session>, skipped: n} — last line wins per brief. */
export function readLedger(logPath = LOG_PATH) {
  const sessions = new Map();
  let skipped = 0;
  if (!existsSync(logPath)) return { sessions, skipped };
  for (const line of readFileSync(logPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const s = JSON.parse(line);
      if (s && typeof s.brief_id === 'string') sessions.set(s.brief_id, s);
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  return { sessions, skipped };
}

/**
 * Killed structural memory for a brief: skeleton_ids Sean killed, with reasons.
 * `pending` sessions contribute nothing (no verdict yet — reader doctrine).
 */
export function killedSkeletons(briefId, logPath = LOG_PATH) {
  const { sessions } = readLedger(logPath);
  const s = sessions.get(briefId);
  if (!s || s.pending) return [];
  return (s.variants || [])
    .filter((v) => v.outcome === 'killed')
    .map((v) => ({ skeleton_id: v.skeleton_id, reason_code: v.reason_code, kill_rank: v.kill_rank }));
}
