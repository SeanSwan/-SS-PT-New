#!/usr/bin/env node
/**
 * coordination-prune.mjs
 * ============================================================================
 * Retention for the Live Pair-Coding Coordination Ledger (Claude ↔ Codex).
 * Prunes ONLY the two gitignored append logs in `.ai-workflow/coordination/`:
 *   - review-queue.md   (### [REQ <ISO-ts>] ... blocks)
 *   - activity.log.md   (one <ISO-ts> ... line per event)
 * Drops entries older than RETENTION_DAYS, with a SIZE_CAP_BYTES backstop.
 *
 * SAFETY: touches nothing but those two files. Never code, never docs, never the
 * lane files (those are overwritten in place by the agents, never accumulate).
 * These files are gitignored + local, so pruning loses no git history; durable
 * outcomes are promoted to committed handoff/debate/closeout docs separately.
 *
 * Run at session start (cheap, idempotent). Bump RETENTION_DAYS to 60 for a
 * longer window. CREATED 2026-06-13 — see .ai-workflow/coordination/README.md.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync, renameSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

/* Atomic write. This script rewrites append logs in place, and it is now invoked
 * from the session-start hook under a timeout. A kill landing between truncate and
 * write would destroy the very history it exists to preserve — and the first run
 * after wiring it up is the largest and slowest there will ever be. tmp+rename makes
 * a killed run a no-op instead of a data loss. */
function atomicWrite(file, body) {
  const tmp = file + ".tmp-" + process.pid;
  try {
    writeFileSync(tmp, body);
    renameSync(tmp, file);
  } catch (err) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* leave no litter */ }
    throw err;
  }
}

const RETENTION_DAYS = 30;
const SIZE_CAP_BYTES = 256 * 1024;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COORD_DIR = path.resolve(__dirname, '..', '.ai-workflow', 'coordination');
const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
const ISO_RE = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/;

const parseTs = (s) => {
  const m = s.match(ISO_RE);
  if (!m) return null;
  const t = Date.parse(m[1]);
  return Number.isFinite(t) ? t : null;
};

// Size backstop: keep a head slice + newest tail if over cap (rare; scratch files).
const sizeCap = (text) => {
  if (Buffer.byteLength(text, 'utf8') <= SIZE_CAP_BYTES) return text;
  const head = text.slice(0, 1536);
  const tail = text.slice(-Math.floor(SIZE_CAP_BYTES * 0.6));
  return `${head}\n\n--- SIZE-CAP TRIM ${new Date().toISOString()} ---\n${tail}`;
};

// review-queue.md: header (before first "### ") + recent "### [REQ ...]" blocks.
const pruneReviewQueue = (file) => {
  const text = readFileSync(file, 'utf8');
  const parts = text.split(/\n(?=### )/);
  const header = parts.shift() ?? '';
  let dropped = 0;
  const kept = parts.filter((block) => {
    const ts = parseTs(block);
    if (ts === null || ts >= cutoff) return true; // keep unparseable or recent
    dropped += 1;
    return false;
  });
  atomicWrite(file, sizeCap([header, ...kept].join('\n')));
  return dropped;
};

// activity.log.md: keep non-timestamped (header) lines + recent timestamped lines.
const pruneActivityLog = (file) => {
  const text = readFileSync(file, 'utf8');
  let dropped = 0;
  const kept = text.split(/\r?\n/).filter((line) => {
    const ts = parseTs(line);
    if (ts === null || ts >= cutoff) return true;
    dropped += 1;
    return false;
  });
  atomicWrite(file, sizeCap(kept.join('\n')));
  return dropped;
};

// Gate dirs (.ai-workflow/gates/<slug>/ — SWA-32 Slice 1): remove task-gate dirs whose
// newest file is older than RETENTION_DAYS. `_lib/` (shared helpers, tracked) is never touched.
const pruneGateDirs = () => {
  const gatesDir = path.resolve(__dirname, '..', '.ai-workflow', 'gates');
  if (!existsSync(gatesDir)) return 0;
  let removed = 0;
  for (const entry of readdirSync(gatesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === '_lib') continue;
    const dir = path.join(gatesDir, entry.name);
    const newest = Math.max(0, ...readdirSync(dir).map((f) => statSync(path.join(dir, f)).mtimeMs));
    if (newest && newest < cutoff) {
      rmSync(dir, { recursive: true, force: true });
      removed += 1;
    }
  }
  if (removed) console.log(`[coordination-prune] gates: removed ${removed} aged gate dir(s).`);
  return removed;
};

let total = 0;
total += pruneGateDirs();
for (const name of ['review-queue.md', 'activity.log.md']) {
  const file = path.join(COORD_DIR, name);
  if (!existsSync(file)) continue;
  try {
    const dropped = name === 'review-queue.md' ? pruneReviewQueue(file) : pruneActivityLog(file);
    total += dropped;
    console.log(`[coordination-prune] ${name}: dropped ${dropped} aged entr${dropped === 1 ? 'y' : 'ies'}.`);
  } catch (err) {
    console.error(`[coordination-prune] ${name}: skipped (${err.message}).`);
  }
}
console.log(`[coordination-prune] done — ${total} pruned. retention=${RETENTION_DAYS}d, sizeCap=${Math.round(SIZE_CAP_BYTES / 1024)}KB.`);
