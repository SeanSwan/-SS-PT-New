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
 * ALSO archives dead session lane files (see LANE_RETENTION below). The original
 * header claimed lanes "are overwritten in place, never accumulate" — that was
 * measured false on 2026-08-23 (72 lanes, 66 older than a day) because lanes are
 * named per SESSION, not per agent. Corrected here rather than left to mislead.
 *
 * SAFETY: touches those two files, plus lane files ONLY by moving them into
 * archive/lanes/ — never deleting, never a stale lane that still holds a lock.
 * Never code, never docs.
 * These files are gitignored + local, so pruning loses no git history; durable
 * outcomes are promoted to committed handoff/debate/closeout docs separately.
 *
 * Run at session start (cheap, idempotent). Bump RETENTION_DAYS to 60 for a
 * longer window. CREATED 2026-06-13 — see .ai-workflow/coordination/README.md.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, renameSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const RETENTION_DAYS = 30;
const SIZE_CAP_BYTES = 256 * 1024;

/**
 * LANE RETENTION (added 2026-08-23).
 *
 * The header above says this script deliberately skips lane files because they are "overwritten in
 * place by the agents, never accumulate". THAT ASSUMPTION IS FALSE and has been for a while: lanes
 * are named per SESSION (`vs-claude--main-s<sessionid>.lane.md`), so every session leaves one
 * behind. Measured 2026-08-23: 72 lane files, ZERO touched in the previous 3 hours, 66 older than
 * a day. The SessionStart briefing prints a line per lane, so the one thing it exists to show —
 * who is working right now — was buried under ~66 corpses, some ten days old.
 *
 * That is the corpus's own `a-guard-that-cries-wolf-protects-nothing` shape: the tool worked, its
 * output was unreadable, so nobody read it, so agents did not know about each other.
 *
 * ARCHIVED, NEVER DELETED (Rule 34). And a stale lane that still holds a lock is REPORTED, never
 * moved (Rule 67 R5: never silently seize) — an abandoned claim is Sean's call, not this script's.
 */
const LANE_STALE_DAYS = 3;
const LOCK_RE = /^#+\s*(?:🔒|🔓)?\s*EDITING NOW/im;

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
  writeFileSync(file, sizeCap([header, ...kept].join('\n')));
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
  writeFileSync(file, sizeCap(kept.join('\n')));
  return dropped;
};

let total = 0;
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
/**
 * Lane pass. Archives dead session lanes so the SessionStart briefing shows LIVE agents only.
 * Returns { archived, heldBack } — heldBack are stale-but-locked, reported for a human.
 */
function pruneLanes() {
  const laneCutoff = Date.now() - LANE_STALE_DAYS * 24 * 60 * 60 * 1000;
  const archiveDir = path.join(COORD_DIR, 'archive', 'lanes');
  let archived = 0;
  const heldBack = [];

  let entries = [];
  try {
    entries = readdirSync(COORD_DIR).filter((f) => f.endsWith('.lane.md'));
  } catch {
    return { archived: 0, heldBack: [] };
  }

  for (const name of entries) {
    const file = path.join(COORD_DIR, name);
    let st;
    try { st = statSync(file); } catch { continue; }
    if (st.mtimeMs >= laneCutoff) continue; // still fresh — leave it alone

    // Stale AND still holding a lock: never move it. R5 — flag, do not seize.
    let body = '';
    try { body = readFileSync(file, 'utf8'); } catch { continue; }
    const locked = LOCK_RE.test(body) && !/EDITING NOW[\s\S]{0,120}?\(released\)/i.test(body);
    if (locked) {
      heldBack.push(name);
      continue;
    }

    try {
      mkdirSync(archiveDir, { recursive: true });
      renameSync(file, path.join(archiveDir, name));
      archived += 1;
    } catch (err) {
      console.error(`[coordination-prune] lane ${name}: skipped (${err.message}).`);
    }
  }
  return { archived, heldBack };
}

try {
  const { archived, heldBack } = pruneLanes();
  const remaining = (() => {
    try { return readdirSync(COORD_DIR).filter((f) => f.endsWith('.lane.md')).length; } catch { return '?'; }
  })();
  console.log(
    `[coordination-prune] lanes: archived ${archived} dead session lane(s) (>${LANE_STALE_DAYS}d, no lock) — ${remaining} remain.`,
  );
  if (heldBack.length) {
    console.log(
      `[coordination-prune] lanes: ${heldBack.length} stale lane(s) STILL HOLD LOCKS — reported, not moved (Rule 67 R5, never silently seize):`,
    );
    for (const n of heldBack) console.log(`    ${n}`);
  }
} catch (err) {
  console.error(`[coordination-prune] lane pass skipped (${err.message}).`);
}

console.log(`[coordination-prune] done — ${total} pruned. retention=${RETENTION_DAYS}d, lanes=${LANE_STALE_DAYS}d, sizeCap=${Math.round(SIZE_CAP_BYTES / 1024)}KB.`);
