#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/enumerate.mjs
 * PURPOSE: Enumerate a channel's upload history — the "no 200-video ceiling"
 *          path, and the row parser behind it.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S4/S5)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE: it pushed ytdlp.mjs past the Rule 4 300-line cap.
 * The seam follows the one this repository already uses in
 * swan-scout/yt-scout-transcript.mjs — split the cohesive block out, then
 * RE-EXPORT it from the original module so that module stays the single import
 * surface for its subject and no caller has to chase a new path.
 *
 * @module creator-brains/enumerate
 */

import { runYtDlp } from './ytdlp.mjs';
// ─────────────────────────────────────────────────────────────────────────────
// Enumeration — full upload history, not a 200-video window
// ─────────────────────────────────────────────────────────────────────────────

export const PRINT_FIELDS = ['id', 'title', 'duration', 'view_count', 'upload_date'];
const PRINT_TEMPLATE = PRINT_FIELDS.map((f) => `%(${f})s`).join('\t');

/** Tab-separated `--print` rows → objects. A row we cannot align is dropped. */
export function parsePrintRows(stdout, fields = PRINT_FIELDS) {
  return String(stdout || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      if (parts.length !== fields.length) return null;
      return Object.fromEntries(fields.map((f, i) => [f, parts[i] === 'NA' ? null : parts[i]]));
    })
    .filter(Boolean);
}

/**
 * Enumerate a channel's uploads. `limit` is the ONLY bound and the caller sets
 * it — there is deliberately no 200-video ceiling here, because the whole point
 * of the backfill slice is that a channel's history is not 200 videos long.
 * Order is yt-dlp's default (newest first), which is what a high-water mark
 * wants.
 */
export function listUploads(channelUrl, { limit = 100, timeout = 300_000 } = {}) {
  const args = [
    channelUrl,
    '--flat-playlist', '--no-warnings',
    '--print', PRINT_TEMPLATE,
  ];
  if (Number.isFinite(limit) && limit > 0) args.push('--playlist-end', String(Math.trunc(limit)));
  return parsePrintRows(runYtDlp(args, { timeout }));
}

