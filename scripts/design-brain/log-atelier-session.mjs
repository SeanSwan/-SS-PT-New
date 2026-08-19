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
  if (!Array.isArray(s.variants) || s.variants.length < 2) bad.push('variants[] requires >=2 entries');
  const winners = (s.variants || []).filter(v => v.outcome === 'winner');
  for (const v of s.variants || []) {
    if (!v.id) bad.push('variant missing id');
    if (!v.skeleton_id) bad.push(`variant ${v.id}: skeleton_id required (structural seed provenance)`);
    if (!OUTCOMES.has(v.outcome)) bad.push(`variant ${v.id}: outcome must be killed|survived|winner`);
    if (v.outcome === 'killed') {
      if (!REASONS.has(v.reason_code)) bad.push(`variant ${v.id}: killed requires reason_code idea|execution|style|structure|unknown`);
      if (!Number.isInteger(v.kill_rank) || v.kill_rank < 1) bad.push(`variant ${v.id}: killed requires kill_rank >= 1`);
    }
    if (v.lever_deltas !== undefined && (typeof v.lever_deltas !== 'object' || Array.isArray(v.lever_deltas)))
      bad.push(`variant ${v.id}: lever_deltas must be an object`);
  }
  if (typeof s.null_winner !== 'boolean') bad.push('null_winner boolean required');
  if (s.null_winner) {
    if (winners.length) bad.push('null_winner=true forbids a winner variant');
    if (!Array.isArray(s.axes_to_flip) || !s.axes_to_flip.length)
      bad.push('null_winner=true requires axes_to_flip[] (the re-diverge learning — a vibe is not an artifact)');
  } else if (!s.pending && winners.length !== 1) {
    bad.push(`exactly one winner required (got ${winners.length}) unless null_winner or pending`);
  }
  if (s.pending && (winners.length || s.null_winner)) bad.push('pending=true means no verdict yet — no winner, null_winner=false');
  if (!Number.isInteger(s.rounds) || s.rounds < 1 || s.rounds > 3) bad.push('rounds must be 1..3 (hard cap)');
  if (typeof s.wave2_used !== 'boolean') bad.push('wave2_used boolean required');
  if (!('cost_usd' in s)) bad.push('cost_usd required (number or null — never an adjective)');
  if (!('wall_s' in s)) bad.push('wall_s required (number or null)');
  return bad;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--session');
  const file = i >= 0 ? process.argv[i + 1] : null;
  if (!file || !existsSync(file)) { console.error('usage: log-atelier-session.mjs --session <session.json>'); process.exit(1); }
  const session = JSON.parse(readFileSync(file, 'utf8'));
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
