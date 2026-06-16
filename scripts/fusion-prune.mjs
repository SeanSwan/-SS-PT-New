#!/usr/bin/env node
/**
 * Fusion retention prune
 * ======================
 * Deletes whole `.ai-workflow/fusion/<run>/` directories older than RETENTION_DAYS
 * (Sean 2026-06-15: 90 days). The fusion tree is already gitignored (.ai-workflow/*),
 * so this reclaims LOCAL DISK only — git history is never touched. Mirrors the role
 * of scripts/coordination-prune.mjs (which trims the 30-day coordination logs).
 *
 * Retention is env-overridable: SWAN_FUSION_RETENTION_DAYS (default 90).
 * Age signal: directory mtime (robust; survives meta.json edits).
 *
 * Usage: node scripts/fusion-prune.mjs
 *
 * @module fusion-prune
 */

import { readdirSync, statSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUSION_DIR = join(__dirname, '..', '.ai-workflow', 'fusion');
export const RETENTION_DAYS = Number(process.env.SWAN_FUSION_RETENTION_DAYS) || 90;

/**
 * Pure selector — given run entries {name, mtimeMs}, return the names older than
 * the cutoff. Exported for testing.
 */
export function findStaleRuns(entries, nowMs, retentionDays) {
  const cutoff = nowMs - retentionDays * 24 * 60 * 60 * 1000;
  return entries.filter((e) => e.mtimeMs < cutoff).map((e) => e.name);
}

function main() {
  if (!existsSync(FUSION_DIR)) {
    console.log('[fusion-prune] no .ai-workflow/fusion dir — nothing to do.');
    return;
  }
  const now = Date.now();
  const entries = readdirSync(FUSION_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, mtimeMs: statSync(join(FUSION_DIR, d.name)).mtimeMs }));

  const stale = findStaleRuns(entries, now, RETENTION_DAYS);
  for (const name of stale) {
    rmSync(join(FUSION_DIR, name), { recursive: true, force: true });
  }
  console.log(`[fusion-prune] done — removed ${stale.length} run(s) older than ${RETENTION_DAYS}d${stale.length ? ` (${stale.join(', ')})` : ''}. kept ${entries.length - stale.length}.`);
}

// Run only when invoked directly (not when imported by a test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
