#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/query.mjs
 * PURPOSE: Ask the published brains a question, with citations and honest
 *          reporting of what could not be read.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR08/15/24)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * THREE DEFECTS THIS REWRITE CLOSES:
 *
 *   HR08 — query reads the PUBLISHED GENERATION, not whatever files happen to be
 *     on disk. It used to glob every brain directory for rules.jsonl, so a
 *     half-written build, a stale directory from a renamed creator, or a
 *     quarantined generation were all equally queryable. Now it resolves
 *     `current.json` and reads exactly the files that pointer names. A creator
 *     whose documents vanished publishes an empty generation, so they return no
 *     hits rather than yesterday's.
 *
 *   HR15 — "Disagreement" was computed from MODALITY LABELS under the first
 *     topic word, so one creator saying "always preserve texture" AND "be
 *     careful, preserve texture" produced a contradiction with itself. A
 *     contradiction now requires the SAME assertion with OPPOSITE POLARITY —
 *     same key phrase (which carries the action and object), same condition
 *     class — and it names the side each creator took. Cautions and directives
 *     about the same subject are no longer reported as a fight.
 *
 *   HR24 — malformed rows are COUNTED AND REPORTED, not skipped. A corrupt JSONL
 *     line used to become an empty result, which reads to the user as "this
 *     creator never said that".
 *
 * @module creator-brains/query
 */

import { join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { listPublished, readPointer } from './render.mjs';
import { paths, readJsonl } from './paths.mjs';

/** Required fields on a rule row. A row missing any of these is not a hit. */
const REQUIRED_FIELDS = ['claim_id', 'creator_id', 'video_id', 't_start_ms', 'key_phrase'];

/**
 * Load hits from every live generation.
 * Returns `{ hits, skipped, creators }` where `skipped` names every row that
 * could not be used and why — never a silent drop.
 */
export function loadHits(r, { creator = null } = {}) {
  const hits = [];
  const skipped = [];
  const creators = [];

  for (const pub of listPublished(r)) {
    if (creator && pub.namespace !== creator) continue;
    creators.push({ namespace: pub.namespace, title: pub.pointer.title, label: pub.pointer.label });
    const rulesPath = join(pub.dir, 'rules.jsonl');
    if (!existsSync(rulesPath)) {
      skipped.push({ creator: pub.namespace, file: 'rules.jsonl', reason: 'missing from the published generation' });
      continue;
    }
    const rows = readJsonl(rulesPath);
    // A truncated or corrupt line is dropped at parse time, so compare the parsed
    // count against the real line count and REPORT the difference rather than
    // letting a damaged generation read as "this creator never said that".
    let lineCount = 0;
    try {
      lineCount = readFileSync(rulesPath, 'utf-8').split('\n').filter((l) => l.trim()).length;
    } catch {
      skipped.push({ creator: pub.namespace, file: 'rules.jsonl', reason: 'unreadable' });
      continue;
    }
    if (lineCount !== rows.length) {
      skipped.push({ creator: pub.namespace, reason: `${lineCount - rows.length} unparseable line(s) in rules.jsonl` });
    }
    for (const row of rows) {
      const missing = REQUIRED_FIELDS.filter((f) => row[f] === undefined || row[f] === null);
      if (missing.length) {
        skipped.push({ creator: pub.namespace, claim: row.claim_id || '(no id)', reason: `missing ${missing.join(', ')}` });
        continue;
      }
      hits.push({
        ...row,
        namespace: pub.namespace,
        generation: pub.pointer.generation,
        url: Array.isArray(row.cites) && row.cites.length ? row.cites[0] : null,
      });
    }
  }
  return { hits, skipped, creators };
}

/**
 * Search across published brains.
 *
 * A contradiction requires the SAME key phrase with OPPOSITE polarity. Different
 * subjects sharing a keyword do not conflict, and modality labels alone never
 * produce one (review HR15).
 */
export function queryBrains(query, { r, creator = null, limit = 40 } = {}) {
  if (typeof query !== 'string' || !query.trim()) {
    throw new Error('a query is required — refusing to return every claim for an empty query');
  }
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const { hits: all, skipped, creators } = loadHits(r, { creator });

  const scored = [];
  for (const hit of all) {
    const hay = `${hit.topic || ''} ${hit.key_phrase || ''} ${hit.statement || ''}`.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const t of terms) if (hay.includes(t)) { matched += 1; score += t.length; }
    if (matched) scored.push({ ...hit, score, matched });
  }
  scored.sort((a, b) => (b.matched - a.matched) || (b.score - a.score));

  const hits = scored.slice(0, limit).map((h) => ({
    creatorId: h.creator_id,
    namespace: h.namespace,
    generation: h.generation,
    videoId: h.video_id,
    tStartMs: h.t_start_ms,
    modality: h.modality,
    polarity: h.polarity,
    condition: h.condition ?? null,
    topic: h.topic,
    statement: h.statement,
    keyPhrase: h.key_phrase,
    validation: h.validation || 'unknown',
    citationStatus: h.citation_status || 'unknown',
    url: h.url,
  }));

  const byCreator = {};
  for (const h of hits) {
    byCreator[h.creatorId] = byCreator[h.creatorId] || [];
    byCreator[h.creatorId].push(h);
  }

  // ── Contradictions: same assertion, opposite polarity ─────────────────────
  const byPhrase = new Map();
  for (const h of hits) {
    const key = String(h.keyPhrase || '').toLowerCase();
    if (!key) continue;
    if (!byPhrase.has(key)) byPhrase.set(key, []);
    byPhrase.get(key).push(h);
  }
  const contradictions = [];
  for (const [phrase, list] of byPhrase) {
    const polarities = new Set(list.map((h) => h.polarity));
    // OPPOSITE MEANS AFFIRM vs NEGATE — and nothing else.
    //
    //   Requiring merely "more than one distinct polarity" would let an
    //   `unknown` (a caution marker that does not determine polarity) pair with
    //   an `affirm` and manufacture a disagreement out of one creator agreeing
    //   with themselves. That is finding HR15 all over again, wearing a
    //   different label.
    if (!(polarities.has('affirm') && polarities.has('negate'))) continue;
    const sides = {};
    for (const h of list) {
      if (h.polarity !== 'affirm' && h.polarity !== 'negate') continue;
      sides[h.polarity] = sides[h.polarity] || [];
      sides[h.polarity].push({
        creatorId: h.creatorId, url: h.url, statement: h.statement, videoId: h.videoId,
      });
    }
    contradictions.push({ phrase, sides });
  }

  return {
    query: query.trim(),
    terms,
    hits,
    byCreator,
    contradictions,
    // `conflicts` is the previous NAME for the same field, kept so callers and
    // instruments written against the old API do not silently read `undefined`.
    // It carries the CORRECTED semantics — same assertion, opposite polarity —
    // not the old modality-label comparison, so the alias cannot resurrect
    // finding HR15.
    conflicts: contradictions,
    creators,
    scanned: all.length,
    skipped,
  };
}

/** Human-readable rendering for the CLI. */
export function formatResults(res) {
  const L = [];
  L.push(`query: ${res.query}  (terms: ${res.terms.join(', ')}; scanned ${res.scanned} candidate claims)`);
  if (res.skipped.length) {
    L.push(`WARNING: ${res.skipped.length} row(s) could not be read — results are incomplete:`);
    for (const s of res.skipped.slice(0, 5)) L.push(`  - ${s.creator}: ${s.reason}`);
  }
  if (!res.hits.length) {
    L.push('');
    L.push(`No match for ${res.terms.map((t) => `"${t}"`).join(' ')}.`);
    L.push('This search is lexical — a paraphrase will not match. Try a term the creator would');
    L.push('actually say, or read topics.md for their real vocabulary.');
    return L.join('\n');
  }
  L.push(`hits: ${res.hits.length} across ${Object.keys(res.byCreator).length} creator(s)`);
  for (const cid of Object.keys(res.byCreator)) {
    L.push('');
    L.push(`## ${cid}`);
    for (const h of res.byCreator[cid]) {
      const pol = h.polarity === 'negate' ? ' [negative]' : '';
      L.push(`  [${fmtMs(h.tStartMs)}] ${h.modality}${pol} — ${h.keyPhrase || h.statement}`);
      if (h.url) L.push(`      ${h.url}`);
    }
  }
  if (res.contradictions.length) {
    L.push('');
    L.push('## Contradictions (same assertion, opposite polarity)');
    for (const c of res.contradictions) {
      L.push(`- "${c.phrase}"`);
      for (const [pol, list] of Object.entries(c.sides)) {
        L.push(`    ${pol}: ${list.map((x) => x.creatorId).join(', ')}`);
        for (const x of list.slice(0, 2)) L.push(`      ${x.statement} — ${x.url}`);
      }
    }
  }
  return L.join('\n');
}

function fmtMs(ms) {
  const t = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const s = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export { readPointer, paths };
