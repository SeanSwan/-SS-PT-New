#!/usr/bin/env node
/**
 * log-atelier-session.mjs — A5 kill-order log: the session-write API into the
 * ONE rejection-log artifact (R2 ruling E1/E2/E6 — no second log; this JSONL is
 * the structured form of the design-dialogue rejection log going forward).
 *
 * Without this line the "picking is the instrument" claim ships empty (Kimi R2).
 * Schema (GLM R2, adopted verbatim + `pending` for sessions awaiting Sean's pass):
 *   {ts, brief_id, archetype_ids[], plate_pack_id,
 *    variants:[{id, skeleton_id, outcome: killed|survived|winner, kill_rank?, pass?,
 *               reason_code?: idea|execution|style|structure|unknown, lever_deltas?}],
 *    null_winner, pending?, axes_to_flip?, rounds, wave2_used, cost_usd|null, wall_s|null}
 *
 * Usage: node scripts/design-brain/log-atelier-session.mjs --session <session.json>
 *        (validates, then appends ONE line to docs/ai-workflow/design-brain/rejection-log.jsonl)
 *
 * READER DOCTRINE: the log is append-only; for any brief_id the LAST line wins.
 * A `pending` session is superseded by appending the resolved session with the
 * same brief_id once Sean's pass happens. Wave-2 folds into its parent session
 * (same brief_id, rounds>=2, wave2_used=true) — no separate lineage field.
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LOG_PATH = join(ROOT, 'docs', 'ai-workflow', 'design-brain', 'rejection-log.jsonl');

const OUTCOMES = new Set(['killed', 'survived', 'winner']);
const REASONS = new Set(['idea', 'execution', 'style', 'structure', 'unknown']);

/** Validate a session object. Returns [] when valid, else a list of defects. */
export function validate(s) {
  const bad = [];
  if (!s || typeof s !== 'object') return ['session is not an object'];
  if (!s.ts || Number.isNaN(Date.parse(s.ts))) bad.push('ts must be an ISO timestamp');
  if (!s.brief_id) bad.push('brief_id required');
  if (!Array.isArray(s.archetype_ids) || !s.archetype_ids.length) bad.push('archetype_ids[] required');
  if (!s.plate_pack_id) bad.push('plate_pack_id required (same-pack law: one pack per round)');
  // Pack-gate rejection (GLM final-review catch): Sean thumbs-down on the PACK is the
  // earliest loggable taste signal — variants never existed, so they may be empty.
  const packRejected = s.pack_rejected === true;
  if (!Array.isArray(s.variants) || (!packRejected && s.variants.length < 2)) bad.push('variants[] requires >=2 entries (unless pack_rejected)');
  if (packRejected && (s.variants || []).length) bad.push('pack_rejected=true forbids variants (the pack died before divergence)');
  if (packRejected && !Array.isArray(s.axes_to_flip)) bad.push('pack_rejected=true requires axes_to_flip[] (why the pack died)');
  const winners = (s.variants || []).filter(v => v.outcome === 'winner');
  const ids = new Set(); const skels = new Set();
  for (const v of s.variants || []) {
    if (!v.id) bad.push('variant missing id');
    if (!v.skeleton_id) bad.push(`variant ${v.id}: skeleton_id required (structural seed provenance)`);
    if (!OUTCOMES.has(v.outcome)) bad.push(`variant ${v.id}: outcome must be killed|survived|winner`);
    if (v.id) { if (ids.has(v.id)) bad.push(`duplicate variant id: ${v.id}`); ids.add(v.id); }
    if (v.skeleton_id) { if (skels.has(v.skeleton_id)) bad.push(`duplicate skeleton_id: ${v.skeleton_id}`); skels.add(v.skeleton_id); }
    if (v.outcome === 'killed') {
      if (!REASONS.has(v.reason_code)) bad.push(`variant ${v.id}: killed requires reason_code idea|execution|style|structure|unknown`);
      if (!Number.isInteger(v.kill_rank) || v.kill_rank < 1) bad.push(`variant ${v.id}: killed requires kill_rank >= 1`);
    } else {
      if ('kill_rank' in v) bad.push(`variant ${v.id}: ${v.outcome} must not carry kill_rank (schema noise)`);
      if ('reason_code' in v) bad.push(`variant ${v.id}: ${v.outcome} must not carry reason_code (schema noise)`);
    }
    if (v.lever_deltas !== undefined && (typeof v.lever_deltas !== 'object' || Array.isArray(v.lever_deltas)))
      bad.push(`variant ${v.id}: lever_deltas must be an object`);
  }
  if (typeof s.null_winner !== 'boolean') bad.push('null_winner boolean required');
  if (s.null_winner) {
    if (winners.length) bad.push('null_winner=true forbids a winner variant');
    if (!Array.isArray(s.axes_to_flip) || !s.axes_to_flip.length)
      bad.push('null_winner=true requires axes_to_flip[] (the re-diverge learning — a vibe is not an artifact)');
  } else if (!s.pending && !packRejected && winners.length !== 1) {
    bad.push(`exactly one winner required (got ${winners.length}) unless null_winner, pending, or pack_rejected`);
  }
  if (s.pending && (winners.length || s.null_winner)) bad.push('pending=true means no verdict yet — no winner, null_winner=false');
  // kill_rank must be a permutation of 1..k over the killed set — the kill ORDER is
  // the artifact's core semantics (GLM D4 / Kimi D2: [1,1,3] used to pass).
  const ranks = (s.variants || []).filter(v => v.outcome === 'killed').map(v => v.kill_rank).filter(Number.isInteger);
  const k = ranks.length;
  if (k && ([...new Set(ranks)].length !== k || Math.min(...ranks) !== 1 || Math.max(...ranks) !== k))
    bad.push(`kill_rank values must be a permutation of 1..${k} (got ${JSON.stringify(ranks.sort((a, b) => a - b))})`);
  if (!Number.isInteger(s.rounds) || s.rounds < 1 || s.rounds > 3) bad.push('rounds must be 1..3 (hard cap)');
  if (typeof s.wave2_used !== 'boolean') bad.push('wave2_used boolean required');
  if (s.wave2_used && s.rounds < 2) bad.push('wave2_used=true requires rounds >= 2 (a wave-2 cannot precede round 2)');
  // TYPE-enforced, not presence-enforced (GLM D3 / Kimi D1: "cheap" used to pass while
  // the message recited "never an adjective").
  if (typeof s.cost_usd !== 'number' && s.cost_usd !== null) bad.push('cost_usd must be a NUMBER or null — never an adjective');
  if (typeof s.wall_s !== 'number' && s.wall_s !== null) bad.push('wall_s must be a NUMBER or null — never an adjective');
  for (const v of s.variants || []) {
    if (v.lever_deltas) for (const [lk, lv] of Object.entries(v.lever_deltas))
      if (typeof lv !== 'string' && typeof lv !== 'number' && typeof lv !== 'boolean')
        bad.push(`variant ${v.id}: lever_deltas.${lk} must be a primitive`);
  }
  return bad;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--session');
  const file = i >= 0 ? process.argv[i + 1] : null;
  if (!file || !existsSync(file)) { console.error('usage: log-atelier-session.mjs --session <session.json>'); process.exit(1); }
  let session;
  try { session = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { console.error(`[atelier-log] REFUSED — session file is not valid JSON: ${e.message}`); process.exit(2); }
  const defects = validate(session);
  if (defects.length) {
    console.error(`[atelier-log] REFUSED — ${defects.length} schema defect(s):`);
    for (const d of defects) console.error(`  - ${d}`);
    process.exit(2);
  }
  appendFileSync(LOG_PATH, JSON.stringify(session) + '\n');
  const n = readFileSync(LOG_PATH, 'utf8').trim().split('\n').length;
  console.log(`[atelier-log] appended session ${session.brief_id} (${session.variants.length} variants) — log now ${n} line(s)`);
}
